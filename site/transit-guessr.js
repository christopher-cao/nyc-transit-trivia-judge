const DATA_URL = new URL("./data/commute_map_data.json", import.meta.url).toString();
const MAX_WALK_TO_STATION_MINUTES = 30;
const DEFAULT_SWIM_METERS_PER_MINUTE = 28;
const ROUTE_LINE_WIDTH = 2.2;
const PANEL_PADDING = 18;

// --- module-level state ---
let data = null;
let settings = null;
let settingsDefaults = null;
let routeStationIndex = null;
let dynamicAdjacency = null;

// map interaction
let mapZoom = 1;
let mapPanOffset = [0, 0];
const MAP_ZOOM_STEP = 1.35;
const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MAX = 8;
let panGesture = null;        // { pointerId, startScreen, startOffset }
let activePointers = new Map(); // pointerId -> { x, y } in canvas coords
let lastPinchDistance = null;

const MAX_GUESSES = 5;

const quizState = {
  origin: null,         // { name, point }
  destination: null,    // { name, point }
  routeSequence: [],    // current in-progress sequence
  guesses: [],          // [{ routeIds, evalResult, minutesOff }]
  gameOver: false,
  optimalResult: null,
  dayType: null,        // "Weekday" | "Saturday" | "Sunday"
  timeMinutes: null,    // minutes from midnight (e.g. 540 = 9:00am)
  dailyMode: false,
  dailyNumber: null,
};

// --- landmark list ---
const LANDMARKS = [
  { name: "Times Square",            lat: 40.7580, lon: -73.9855 },
  { name: "Central Park (The Mall)", lat: 40.7739, lon: -73.9706 },
  { name: "Brooklyn Museum",         lat: 40.6712, lon: -73.9636 },
  { name: "Grand Central Terminal",  lat: 40.7527, lon: -73.9772 },
  { name: "The Metropolitan Museum", lat: 40.7794, lon: -73.9632 },
  { name: "Coney Island",            lat: 40.5749, lon: -73.9857 },
  { name: "Yankee Stadium",          lat: 40.8296, lon: -73.9262 },
  { name: "Barclays Center",         lat: 40.6826, lon: -73.9754 },
  { name: "The High Line (north)",   lat: 40.7480, lon: -74.0048 },
  { name: "9/11 Memorial",           lat: 40.7115, lon: -74.0134 },
  { name: "Rockefeller Center",      lat: 40.7587, lon: -73.9787 },
  { name: "Whitney Museum",          lat: 40.7396, lon: -74.0089 },
  { name: "Prospect Park",           lat: 40.6602, lon: -73.9690 },
  { name: "Flushing Meadows Park",   lat: 40.7282, lon: -73.8456 },
  { name: "Jackson Heights",         lat: 40.7557, lon: -73.8831 },
  { name: "Columbia University",     lat: 40.8075, lon: -73.9626 },
  { name: "Washington Square Park",  lat: 40.7308, lon: -73.9973 },
  { name: "Staten Island Ferry",     lat: 40.6437, lon: -74.0736 },
  { name: "Astoria Park",            lat: 40.7753, lon: -73.9299 },
  { name: "Fort Greene Park",        lat: 40.6894, lon: -73.9742 },
  { name: "Inwood Hill Park",        lat: 40.8674, lon: -73.9282 },
  { name: "Arthur Ave (Bronx)",      lat: 40.8520, lon: -73.8871 },
  { name: "Jamaica Center",          lat: 40.7018, lon: -73.7887 },
  { name: "Brighton Beach",          lat: 40.5776, lon: -73.9609 },
];

// --- pure utilities ---

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// --- daily puzzle helpers ---

const DAILY_EPOCH_MS = Date.UTC(2026, 5, 18); // 2026-06-18 = Day 1

function dateToSeed(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++)
    h = Math.imul(31, h) + dateStr.charCodeAt(i) | 0;
  return h;
}

function seededRandom(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getDailyPuzzle(date = new Date()) {
  const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const dayNumber = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - DAILY_EPOCH_MS) / 86400000) + 1;
  const rand = seededRandom(dateToSeed(dateStr));

  const a = Math.floor(rand() * LANDMARKS.length);
  let b = Math.floor(rand() * (LANDMARKS.length - 1));
  if (b >= a) b += 1;
  const r = rand();
  const dayType = r < 0.5 ? "Weekday" : r < 0.75 ? "Saturday" : "Sunday";
  const timeMinutes = Math.round((360 + rand() * 900) / 5) * 5;

  return { origin: LANDMARKS[a], dest: LANDMARKS[b], dayType, timeMinutes, dayNumber };
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  let j = ring.length - 1;
  for (let i = 0; i < ring.length; i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = (yi > y) !== (yj > y);
    if (intersects) {
      const xHit = ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;
      if (x < xHit) inside = !inside;
    }
    j = i;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!polygon.length || !pointInRing(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(point, polygon[i])) return false;
  }
  return true;
}

function pointToSegmentProjection(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { point: start.slice(), distance: distance(point, start) };
  const t = clamp(((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lenSq, 0, 1);
  const proj = [start[0] + dx * t, start[1] + dy * t];
  return { point: proj, distance: distance(point, proj) };
}

function pointInBoroughs(point) {
  for (const borough of data.boroughs) {
    for (const polygon of borough.polygons) {
      if (pointInPolygon(point, polygon)) return true;
    }
  }
  return false;
}

function pointInExternalLand(point) {
  for (const polygon of data.externalLand || []) {
    if (pointInPolygon(point, polygon)) return true;
  }
  return false;
}

function classifySurface(point) {
  if (pointInBoroughs(point)) return "borough";
  return pointInExternalLand(point) ? "land" : "water";
}

function locateNearestBoroughBorder(point) {
  let best = { point: point.slice(), distance: Infinity };
  for (const borough of data.boroughs) {
    for (const polygon of borough.polygons) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length - 1; i += 1) {
          const candidate = pointToSegmentProjection(point, ring[i], ring[i + 1]);
          if (candidate.distance < best.distance) best = candidate;
        }
      }
    }
  }
  return best;
}

function normalizeTravelPoint(point) {
  const surface = classifySurface(point);
  if (surface !== "water") {
    return { surface, point, swimMinutes: 0, swimDistance: 0 };
  }
  const border = locateNearestBoroughBorder(point);
  return {
    surface,
    point: border.point,
    swimMinutes: border.distance / settings.swimSpeed,
    swimDistance: border.distance,
  };
}

function walkMinutesToStation(point, stationIndex) {
  const station = data.stations[stationIndex];
  const mid = [(point[0] + station.point[0]) / 2, (point[1] + station.point[1]) / 2];
  if (classifySurface(mid) === "water") return Infinity;
  return distance(point, station.point) / settings.walkingSpeed + data.meta.stationAccessPenalty;
}

function nearestStations(point, count) {
  return data.stations
    .map((station, index) => {
      const mid = [(point[0] + station.point[0]) / 2, (point[1] + station.point[1]) / 2];
      const walkMinutes = classifySurface(mid) === "water"
        ? Infinity
        : distance(point, station.point) / settings.walkingSpeed + data.meta.stationAccessPenalty;
      return { index, name: station.name, walkMinutes };
    })
    .filter(s => s.walkMinutes < Infinity)
    .sort((a, b) => a.walkMinutes - b.walkMinutes)
    .slice(0, count);
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes)) return "unreachable";
  if (minutes < 1) return "<1 min";
  return `${Math.round(minutes)} min`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function lonLatToWorld(lon, lat) {
  const metersPerDegLat = 111_320.0;
  const metersPerDegLon = metersPerDegLat * Math.cos((data.meta.lat0 * Math.PI) / 180);
  return [lon * metersPerDegLon, lat * metersPerDegLat];
}

// --- map drawing ---

function buildTransform(bounds, width, height, zoom = 1, panOffset = [0, 0]) {
  const [minX, minY, maxX, maxY] = bounds;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const baseScale = Math.min((width - PANEL_PADDING * 2) / spanX, (height - PANEL_PADDING * 2) / spanY);
  const scale = baseScale * zoom;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetX = width / 2 + panOffset[0];
  const offsetY = height / 2 + panOffset[1];
  return {
    scale,
    toScreen(point) {
      return [offsetX + (point[0] - centerX) * scale, offsetY - (point[1] - centerY) * scale];
    },
    toWorld(sx, sy) {
      return [centerX + (sx - offsetX) / scale, centerY - (sy - offsetY) / scale];
    },
  };
}

function tracePolygonPath(drawCtx, polygon, projectPoint) {
  for (const ring of polygon) {
    ring.forEach((point, i) => {
      const [sx, sy] = projectPoint(point);
      if (i === 0) drawCtx.moveTo(sx, sy); else drawCtx.lineTo(sx, sy);
    });
    drawCtx.closePath();
  }
}

function drawPolygonPath(drawCtx, polygon, projectPoint) {
  drawCtx.beginPath();
  tracePolygonPath(drawCtx, polygon, projectPoint);
}

function landMaskPolygons() {
  if (data.landMask?.length) return data.landMask;
  return data.boroughs.flatMap((b) => b.polygons);
}

function fillLandMask(drawCtx, projectPoint) {
  drawCtx.beginPath();
  for (const polygon of landMaskPolygons()) tracePolygonPath(drawCtx, polygon, projectPoint);
  drawCtx.fillStyle = "#f3f6fa";
  drawCtx.fill("evenodd");
}

function drawExternalLand(drawCtx, projectPoint) {
  const polygons = data.externalLand || [];
  if (!polygons.length) return;
  drawCtx.save();
  drawCtx.globalAlpha = 0.3;
  drawCtx.fillStyle = "#f3f6fa";
  drawCtx.strokeStyle = "rgba(79, 105, 135, 0.42)";
  drawCtx.lineWidth = 0.75;
  for (const polygon of polygons) {
    drawPolygonPath(drawCtx, polygon, projectPoint);
    drawCtx.fill(); drawCtx.stroke();
  }
  drawCtx.restore();
}

function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

function distanceToChord(point, start, end) {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return distance(point, start);
  return Math.abs(dx * (start[1] - point[1]) - (start[0] - point[0]) * dy) / len;
}

function traceAdaptiveSegment(drawCtx, start, end, startScreen, endScreen, projectPoint, tolerance, depth) {
  if (depth <= 0) { drawCtx.lineTo(endScreen[0], endScreen[1]); return; }
  const worldMid = midpoint(start, end);
  const screenMid = projectPoint(worldMid);
  if (distanceToChord(screenMid, startScreen, endScreen) <= tolerance) {
    drawCtx.lineTo(endScreen[0], endScreen[1]); return;
  }
  traceAdaptiveSegment(drawCtx, start, worldMid, startScreen, screenMid, projectPoint, tolerance, depth - 1);
  traceAdaptiveSegment(drawCtx, worldMid, end, screenMid, endScreen, projectPoint, tolerance, depth - 1);
}

function drawPolyline(drawCtx, points, projectPoint) {
  if (!points.length) return;
  drawCtx.beginPath();
  let prev = points[0], prevS = projectPoint(prev);
  drawCtx.moveTo(prevS[0], prevS[1]);
  for (let i = 1; i < points.length; i++) {
    const next = points[i], nextS = projectPoint(next);
    traceAdaptiveSegment(drawCtx, prev, next, prevS, nextS, projectPoint, 0.4, 6);
    prev = next; prevS = nextS;
  }
  drawCtx.stroke();
}

function streetWidth(kind) {
  if (kind === "motorway") return 1.8;
  if (kind === "trunk") return 1.5;
  return 1.1;
}

function drawCityBasemap(drawCtx, projectPoint, { grayRoutes = false } = {}) {
  fillLandMask(drawCtx, projectPoint);

  for (const polygon of data.parks) {
    drawPolygonPath(drawCtx, polygon, projectPoint);
    drawCtx.fillStyle = "#dbeacd";
    drawCtx.strokeStyle = "#a7c39b";
    drawCtx.lineWidth = 0.45;
    drawCtx.fill(); drawCtx.stroke();
  }

  for (const street of data.streets) {
    drawCtx.strokeStyle = "rgba(193, 202, 212, 0.92)";
    drawCtx.lineWidth = streetWidth(street.kind);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawPolyline(drawCtx, street.points, projectPoint);
  }

  for (const route of data.routes) {
    drawCtx.strokeStyle = grayRoutes ? "rgba(140, 155, 170, 0.55)" : route.color;
    drawCtx.lineWidth = ROUTE_LINE_WIDTH;
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawPolyline(drawCtx, route.points, projectPoint);
  }

  for (const borough of data.boroughs) {
    for (const polygon of borough.polygons) {
      drawPolygonPath(drawCtx, polygon, projectPoint);
      drawCtx.strokeStyle = "#4f6987";
      drawCtx.lineWidth = 1.05;
      drawCtx.stroke();
    }
  }
}

function drawStations(drawCtx, projectPoint) {
  for (const station of data.stations) {
    const [sx, sy] = projectPoint(station.point);
    drawCtx.beginPath();
    drawCtx.arc(sx, sy, 1.35, 0, Math.PI * 2);
    drawCtx.fillStyle = "#ffffff";
    drawCtx.fill();
    drawCtx.lineWidth = 0.55;
    drawCtx.strokeStyle = "#5a6e84";
    drawCtx.stroke();
  }
}

function drawBoroughLabels(drawCtx, projectPoint) {
  drawCtx.font = '700 13px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  drawCtx.textAlign = "center";
  drawCtx.textBaseline = "middle";
  drawCtx.fillStyle = "#17304d";
  drawCtx.strokeStyle = "rgba(255,252,247,0.95)";
  drawCtx.lineWidth = 5;
  drawCtx.lineJoin = "round";
  for (const borough of data.boroughs) {
    const [lx, ly] = projectPoint(borough.label);
    drawCtx.strokeText(borough.name, lx, ly);
    drawCtx.fillText(borough.name, lx, ly);
  }
}

function drawEmojiMarker(drawCtx, sx, sy, emoji, size = 22) {
  drawCtx.save();
  drawCtx.font = `${size}px serif`;
  drawCtx.textAlign = "center";
  drawCtx.textBaseline = "middle";
  drawCtx.shadowColor = "white";
  drawCtx.shadowBlur = 10;
  drawCtx.fillText(emoji, sx, sy);
  drawCtx.fillText(emoji, sx, sy);
  drawCtx.shadowBlur = 0;
  drawCtx.fillText(emoji, sx, sy);
  drawCtx.restore();
}

function drawQuizMap() {
  const canvas = document.getElementById("quizMapCanvas");
  if (!canvas || !data) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = rect.width, height = rect.height;

  ctx.clearRect(0, 0, width, height);
  const transform = buildTransform(data.meta.bounds, width, height, mapZoom, mapPanOffset);
  const projectPoint = (p) => transform.toScreen(p);

  drawExternalLand(ctx, projectPoint);
  drawCityBasemap(ctx, projectPoint, { grayRoutes: !quizState.gameOver });
  drawStations(ctx, projectPoint);
  drawBoroughLabels(ctx, projectPoint);

  if (quizState.origin) {
    const [sx, sy] = projectPoint(quizState.origin.point);
    drawEmojiMarker(ctx, sx, sy, "📍");
  }
  if (quizState.destination) {
    const [sx, sy] = projectPoint(quizState.destination.point);
    drawEmojiMarker(ctx, sx, sy, "🎯");
  }
}

function zoomMap(factor, pivotScreen = null) {
  const canvas = document.getElementById("quizMapCanvas");
  if (!canvas || !data) return;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width, height = rect.height;

  const prevZoom = mapZoom;
  mapZoom = clamp(mapZoom * factor, MAP_ZOOM_MIN, MAP_ZOOM_MAX);
  const actualFactor = mapZoom / prevZoom;

  // Zoom toward pivot point (default: canvas center)
  const px = pivotScreen ? pivotScreen[0] - width / 2 : 0;
  const py = pivotScreen ? pivotScreen[1] - height / 2 : 0;
  mapPanOffset = [
    px + (mapPanOffset[0] - px) * actualFactor,
    py + (mapPanOffset[1] - py) * actualFactor,
  ];

  drawQuizMap();
  syncZoomButtons();
}

function resetMapView() {
  mapZoom = 1;
  mapPanOffset = [0, 0];
  drawQuizMap();
  syncZoomButtons();
}

function syncZoomButtons() {
  const zoomIn = document.getElementById("mapZoomIn");
  const zoomOut = document.getElementById("mapZoomOut");
  if (zoomIn) zoomIn.disabled = mapZoom >= MAP_ZOOM_MAX;
  if (zoomOut) zoomOut.disabled = mapZoom <= MAP_ZOOM_MIN;
}

function initMapInteraction() {
  const canvas = document.getElementById("quizMapCanvas");

  // scroll wheel zoom
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const pivot = [e.clientX - rect.left, e.clientY - rect.top];
    zoomMap(e.deltaY < 0 ? MAP_ZOOM_STEP : 1 / MAP_ZOOM_STEP, pivot);
  }, { passive: false });

  // pointer-based pan + pinch-to-zoom
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    activePointers.set(e.pointerId, pos);

    if (activePointers.size === 1) {
      panGesture = { pointerId: e.pointerId, startScreen: [pos.x, pos.y], startOffset: [...mapPanOffset] };
      lastPinchDistance = null;
    } else if (activePointers.size === 2) {
      panGesture = null;
      const pts = [...activePointers.values()];
      lastPinchDistance = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!activePointers.has(e.pointerId)) return;
    const rect = canvas.getBoundingClientRect();
    activePointers.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (lastPinchDistance !== null && lastPinchDistance > 0) {
        const pivot = [(pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2];
        zoomMap(newDist / lastPinchDistance, pivot);
      }
      lastPinchDistance = newDist;
    } else if (activePointers.size === 1 && panGesture && e.pointerId === panGesture.pointerId) {
      mapPanOffset = [
        panGesture.startOffset[0] + e.clientX - rect.left - panGesture.startScreen[0],
        panGesture.startOffset[1] + e.clientY - rect.top - panGesture.startScreen[1],
      ];
      drawQuizMap();
    }
  });

  const endPointer = (e) => {
    activePointers.delete(e.pointerId);
    lastPinchDistance = null;
    if (panGesture?.pointerId === e.pointerId) panGesture = null;
    if (activePointers.size === 1) {
      const [pid, pos] = [...activePointers.entries()][0];
      panGesture = { pointerId: pid, startScreen: [pos.x, pos.y], startOffset: [...mapPanOffset] };
    }
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  // buttons
  document.getElementById("mapZoomIn").addEventListener("click", () => zoomMap(MAP_ZOOM_STEP));
  document.getElementById("mapZoomOut").addEventListener("click", () => zoomMap(1 / MAP_ZOOM_STEP));
  document.getElementById("mapReset").addEventListener("click", resetMapView);

  syncZoomButtons();
}

// --- routing infrastructure ---

function buildRouteStationIndex() {
  const index = new Map();
  for (let si = 0; si < data.stations.length; si += 1) {
    for (const routeId of data.stations[si].routes) {
      if (!index.has(routeId)) index.set(routeId, []);
      index.get(routeId).push(si);
    }
  }
  return index;
}

function buildDynamicAdjacency() {
  const routeStates = data.routeStates;
  const stations = data.stations;
  return data.adjacency.map((edges, fromIndex) => {
    const fromState = routeStates[fromIndex];
    return edges.map(([toIndex, weight]) => {
      const toState = routeStates[toIndex];
      const boardingDelta =
        (data.routeWaits?.[toState.routeId] ?? settingsDefaults.transitTime) - settingsDefaults.transitTime;
      if (fromState.routeId === toState.routeId) {
        return { toIndex, kind: "ride", rideMinutes: weight };
      }
      if (fromState.stationIndex === toState.stationIndex) {
        return { toIndex, kind: "transfer", boardingDelta };
      }
      const fromPoint = stations[fromState.stationIndex].point;
      const toPoint = stations[toState.stationIndex].point;
      const walkDistance = distance(fromPoint, toPoint);
      const walkPenalty = Math.max(
        0,
        weight - walkDistance / settingsDefaults.walkingSpeed - boardingDelta -
          settingsDefaults.transitTime - (data.meta.interComplexTransferPenalty ?? settingsDefaults.transferTime),
      );
      const walkTime = walkDistance / settingsDefaults.walkingSpeed + walkPenalty;
      const midpoint = [(fromPoint[0] + toPoint[0]) / 2, (fromPoint[1] + toPoint[1]) / 2];
      if (walkTime > MAX_WALK_TO_STATION_MINUTES || classifySurface(midpoint) === "water") return null;
      return { toIndex, kind: "interchange", boardingDelta, walkDistance, walkPenalty };
    }).filter(e => e !== null);
  });
}

// --- Dijkstra (unconstrained, average waits — no schedule) ---

function formatClock(absoluteMinutes) {
  const total = Math.round(absoluteMinutes) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function nextDeparture(rsi, absoluteTimeMinutes) {
  const deps = data.routeStopSchedules?.[quizState.dayType]?.[rsi];
  if (!deps || !deps.length) return Infinity;
  let lo = 0, hi = deps.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (deps[mid] < absoluteTimeMinutes) lo = mid + 1; else hi = mid;
  }
  return lo < deps.length ? deps[lo] : deps[0] + 1440;
}

function runDijkstra(origin) {
  const stateCount = data.routeStates.length;
  const distances = new Array(stateCount).fill(Infinity);
  const prev = new Array(stateCount).fill(-1);
  const visited = new Array(stateCount).fill(false);
  const seeds = nearestStations(origin.point, data.meta.originStationCount);

  const useSchedule = quizState.timeMinutes !== null && quizState.dayType !== null;
  const queryTime = quizState.timeMinutes ?? 0;

  for (const seed of seeds) {
    if (seed.walkMinutes > MAX_WALK_TO_STATION_MINUTES) continue;
    for (const rsi of data.stationStates[seed.index] || []) {
      const arrivalAtStation = origin.swimMinutes + seed.walkMinutes;
      let waitMinutes;
      if (useSchedule) {
        const dep = nextDeparture(rsi, queryTime + arrivalAtStation);
        waitMinutes = dep === Infinity ? Infinity : dep - (queryTime + arrivalAtStation);
      } else {
        const routeId = data.routeStates[rsi].routeId;
        const boardingDelta =
          (data.routeWaits?.[routeId] ?? settingsDefaults.transitTime) - settingsDefaults.transitTime;
        waitMinutes = settings.transitTime + boardingDelta;
      }
      distances[rsi] = Math.min(distances[rsi], arrivalAtStation + waitMinutes);
    }
  }

  for (let step = 0; step < stateCount; step += 1) {
    let current = -1;
    let best = Infinity;
    for (let i = 0; i < stateCount; i += 1) {
      if (!visited[i] && distances[i] < best) { best = distances[i]; current = i; }
    }
    if (current === -1) break;
    visited[current] = true;
    for (const edge of dynamicAdjacency[current]) {
      let weight;
      if (useSchedule && edge.kind !== "ride") {
        const walkTime = edge.kind === "interchange"
          ? edge.walkDistance / settings.walkingSpeed + edge.walkPenalty
          : 0;
        const absoluteArrival = queryTime + distances[current] + walkTime;
        const dep = nextDeparture(edge.toIndex, absoluteArrival);
        const boardingWait = dep === Infinity ? Infinity : dep - absoluteArrival;
        weight = walkTime + settings.transferTime + boardingWait;
      } else {
        weight = edge.kind === "ride"
          ? edge.rideMinutes
          : edge.kind === "transfer"
            ? settings.transferTime + settings.transitTime + edge.boardingDelta
            : edge.walkDistance / settings.walkingSpeed + edge.walkPenalty +
              settings.transferTime + settings.transitTime + edge.boardingDelta;
      }
      const candidate = distances[current] + weight;
      if (candidate < distances[edge.toIndex]) {
        distances[edge.toIndex] = candidate;
        prev[edge.toIndex] = current;
      }
    }
  }

  return { distances, prev };
}

function traceOptimalPath(origin, dijkstraResult, destinationPoint) {
  const { distances, prev } = dijkstraResult;
  const routeStates = data.routeStates;
  const stations = data.stations;
  const destination = normalizeTravelPoint(destinationPoint);

  let bestTotal = Infinity;
  let bestExitRsi = -1;
  let bestExitSi = -1;
  const nearby = nearestStations(destination.point, data.meta.cellNearestStations);
  for (const station of nearby) {
    if (station.walkMinutes > MAX_WALK_TO_STATION_MINUTES) continue;
    const walkOut = station.walkMinutes + destination.swimMinutes;
    for (const rsi of data.stationStates[station.index] || []) {
      const total = distances[rsi] + walkOut;
      if (total < bestTotal) { bestTotal = total; bestExitRsi = rsi; bestExitSi = station.index; }
    }
  }

  if (bestExitRsi === -1) return null;

  const path = [];
  let node = bestExitRsi;
  while (node !== -1) { path.push(node); node = prev[node]; }
  path.reverse();

  const steps = [];
  const entrySi = routeStates[path[0]].stationIndex;
  const entryWalk = walkMinutesToStation(origin.point, entrySi) + origin.swimMinutes;
  steps.push({ kind: "walk", stationName: stations[entrySi].name, minutes: entryWalk });
  const entryWait = distances[path[0]] - entryWalk;
  steps.push({ kind: "wait", routeId: routeStates[path[0]].routeId, minutes: entryWait });

  let rideStartName = stations[entrySi].name;
  let rideDist = 0;

  for (let i = 1; i < path.length; i += 1) {
    const rsi = path[i];
    const prevRsi = path[i - 1];
    const edgeDist = distances[rsi] - distances[prevRsi];
    const prevRouteId = routeStates[prevRsi].routeId;
    const curRouteId = routeStates[rsi].routeId;
    if (curRouteId === prevRouteId) {
      rideDist += edgeDist;
    } else {
      const transferSi = routeStates[prevRsi].stationIndex;
      steps.push({ kind: "ride", routeId: prevRouteId, from: rideStartName, to: stations[transferSi].name, minutes: rideDist });
      steps.push({ kind: "transfer", at: stations[transferSi].name, from: prevRouteId, to: curRouteId, minutes: edgeDist });
      rideStartName = stations[routeStates[rsi].stationIndex].name;
      rideDist = 0;
    }
  }

  const exitStation = stations[bestExitSi];
  const exitWalk = walkMinutesToStation(destination.point, bestExitSi) + destination.swimMinutes;
  steps.push({ kind: "ride", routeId: routeStates[path[path.length - 1]].routeId, from: rideStartName, to: exitStation.name, minutes: rideDist });
  steps.push({ kind: "walk", stationName: exitStation.name, minutes: exitWalk });

  return { steps, totalMinutes: bestTotal };
}

// --- constrained Dijkstra ---

function evaluateRouteOption(originPoint, destinationPoint, routeIds) {
  if (!routeIds.length) return null;
  const routeStates = data.routeStates;
  const stations = data.stations;
  const N = routeIds.length;

  for (const routeId of routeIds) {
    if (!routeStationIndex.has(routeId)) {
      return { viable: false, reason: `Unknown route: ${routeId}` };
    }
  }

  let bestEntryWalk = Infinity;
  for (const si of routeStationIndex.get(routeIds[0])) {
    const w = walkMinutesToStation(originPoint, si);
    if (w < bestEntryWalk) bestEntryWalk = w;
  }
  if (bestEntryWalk > MAX_WALK_TO_STATION_MINUTES) {
    return { viable: false, reason: `Origin is too far from any ${routeIds[0]} station (${formatMinutes(bestEntryWalk)} walk)` };
  }

  const destNormalized = normalizeTravelPoint(destinationPoint);
  let bestExitWalk = Infinity;
  for (const si of routeStationIndex.get(routeIds[N - 1])) {
    const w = walkMinutesToStation(destNormalized.point, si) + destNormalized.swimMinutes;
    if (w < bestExitWalk) bestExitWalk = w;
  }
  if (bestExitWalk > MAX_WALK_TO_STATION_MINUTES) {
    return { viable: false, reason: `Destination is too far from any ${routeIds[N - 1]} station (${formatMinutes(bestExitWalk)} walk)` };
  }

  const rsCount = routeStates.length;
  const totalNodes = rsCount * N;
  const dist = new Float64Array(totalNodes).fill(Infinity);
  const prev = new Int32Array(totalNodes).fill(-1);
  const visited = new Uint8Array(totalNodes);

  const useSchedule = quizState.timeMinutes !== null && quizState.dayType !== null;
  const queryTime = quizState.timeMinutes ?? 0;

  for (const si of routeStationIndex.get(routeIds[0])) {
    const w = walkMinutesToStation(originPoint, si);
    if (w > MAX_WALK_TO_STATION_MINUTES) continue;
    for (const rsi of data.stationStates[si] || []) {
      if (routeStates[rsi].routeId !== routeIds[0]) continue;
      let waitMinutes;
      if (useSchedule) {
        const dep = nextDeparture(rsi, queryTime + w);
        waitMinutes = dep === Infinity ? Infinity : dep - (queryTime + w);
      } else {
        const boardingDelta =
          (data.routeWaits?.[routeIds[0]] ?? settingsDefaults.transitTime) - settingsDefaults.transitTime;
        waitMinutes = settings.transitTime + boardingDelta;
      }
      const d = w + waitMinutes;
      const node = rsi * N + 0;
      if (d < dist[node]) dist[node] = d;
    }
  }

  for (let step = 0; step < totalNodes; step += 1) {
    let current = -1;
    let best = Infinity;
    for (let i = 0; i < totalNodes; i += 1) {
      if (!visited[i] && dist[i] < best) { best = dist[i]; current = i; }
    }
    if (current === -1) break;
    visited[current] = 1;

    const phase = current % N;
    const rsi = (current - phase) / N;

    for (const edge of dynamicAdjacency[rsi]) {
      const toRsi = edge.toIndex;
      const toRouteId = routeStates[toRsi].routeId;
      let weight, toPhase;

      if (edge.kind === "ride" && toRouteId === routeIds[phase]) {
        weight = edge.rideMinutes;
        toPhase = phase;
      } else if (
        phase + 1 < N &&
        (edge.kind === "transfer" || edge.kind === "interchange") &&
        toRouteId === routeIds[phase + 1]
      ) {
        const walkTime = edge.kind === "interchange"
          ? edge.walkDistance / settings.walkingSpeed + edge.walkPenalty
          : 0;
        let boardingWait;
        if (useSchedule) {
          const absoluteArrival = queryTime + dist[current] + walkTime;
          const dep = nextDeparture(toRsi, absoluteArrival);
          boardingWait = dep === Infinity ? Infinity : dep - absoluteArrival;
        } else {
          boardingWait = settings.transitTime + edge.boardingDelta;
        }
        weight = walkTime + settings.transferTime + boardingWait;
        toPhase = phase + 1;
      } else {
        continue;
      }

      const toNode = toRsi * N + toPhase;
      const candidate = dist[current] + weight;
      if (candidate < dist[toNode]) {
        dist[toNode] = candidate;
        prev[toNode] = current;
      }
    }
  }

  let bestTotal = Infinity;
  let bestTerminalNode = -1;
  let bestExitSi = -1;
  for (const si of routeStationIndex.get(routeIds[N - 1])) {
    const w = walkMinutesToStation(destNormalized.point, si) + destNormalized.swimMinutes;
    for (const rsi of data.stationStates[si] || []) {
      if (routeStates[rsi].routeId !== routeIds[N - 1]) continue;
      const node = rsi * N + (N - 1);
      const total = dist[node] + w;
      if (total < bestTotal) { bestTotal = total; bestTerminalNode = node; bestExitSi = si; }
    }
  }

  if (!Number.isFinite(bestTotal)) {
    for (let ph = 0; ph < N - 1; ph += 1) {
      let anyNext = false;
      for (let rsi = 0; rsi < rsCount; rsi += 1) {
        if (dist[rsi * N + ph + 1] < Infinity) { anyNext = true; break; }
      }
      if (!anyNext) {
        return { viable: false, reason: `No transfer found between ${routeIds[ph]} and ${routeIds[ph + 1]}` };
      }
    }
    return { viable: false, reason: "No viable path found" };
  }

  const path = [];
  let node = bestTerminalNode;
  while (node !== -1) {
    const ph = node % N;
    const rsi = (node - ph) / N;
    path.push({ rsi, phase: ph });
    node = prev[node];
  }
  path.reverse();

  const steps = [];
  const pathStartSi = routeStates[path[0].rsi].stationIndex;
  const pathStartWalk = walkMinutesToStation(originPoint, pathStartSi);
  steps.push({ kind: "walk", stationName: stations[pathStartSi].name, minutes: pathStartWalk });
  const seedWait = dist[path[0].rsi * N + path[0].phase] - pathStartWalk;
  steps.push({ kind: "wait", routeId: routeIds[0], minutes: seedWait });

  let lastPhase = 0;
  let rideStartName = stations[pathStartSi].name;
  let rideDist = 0;

  for (let i = 1; i < path.length; i += 1) {
    const { rsi, phase } = path[i];
    const prevNode = path[i - 1].rsi * N + path[i - 1].phase;
    const curNode = rsi * N + phase;
    const edgeDist = dist[curNode] - dist[prevNode];
    if (phase === lastPhase) {
      rideDist += edgeDist;
    } else {
      const transferSi = routeStates[path[i - 1].rsi].stationIndex;
      steps.push({ kind: "ride", routeId: routeIds[lastPhase], from: rideStartName, to: stations[transferSi].name, minutes: rideDist });
      steps.push({ kind: "transfer", at: stations[transferSi].name, from: routeIds[lastPhase], to: routeIds[phase], minutes: edgeDist });
      rideStartName = stations[routeStates[rsi].stationIndex].name;
      rideDist = 0;
      lastPhase = phase;
    }
  }

  const exitStation = stations[bestExitSi];
  const actualExitWalk = walkMinutesToStation(destNormalized.point, bestExitSi) + destNormalized.swimMinutes;
  steps.push({ kind: "ride", routeId: routeIds[N - 1], from: rideStartName, to: exitStation.name, minutes: rideDist });
  steps.push({ kind: "walk", stationName: exitStation.name, minutes: actualExitWalk });

  return { viable: true, steps, totalMinutes: bestTotal, routeIds };
}

// --- rendering ---

function renderRouteBadge(routeId) {
  const style = data.routeStyles?.[routeId];
  const label = style?.label ?? routeId;
  const background = style?.color ?? "#5a6e84";
  const color = style?.textColor ?? "#ffffff";
  return `<span class="route-badge" style="background-color:${background};color:${color}">${escapeHtml(label)}</span>`;
}

function renderStepsList(steps, startTimeMinutes = null) {
  let clock = startTimeMinutes;
  return steps.map((step) => {
    const stepStart = clock;
    if (clock !== null) clock += step.minutes;
    const timeTag = stepStart !== null && step.kind !== "walk"
      ? `<span class="route-step-clock">${formatClock(stepStart)}–${formatClock(clock)}</span> `
      : "";
    if (step.kind === "walk") {
      return `<li class="route-comparison-step route-comparison-step-walk">Walk ${formatMinutes(step.minutes)}${step.stationName ? ` · <strong>${escapeHtml(step.stationName)}</strong>` : ""}</li>`;
    }
    if (step.kind === "wait") {
      return `<li class="route-comparison-step route-comparison-step-wait">${timeTag}Wait ${formatMinutes(step.minutes)} for ${renderRouteBadge(step.routeId)}</li>`;
    }
    if (step.kind === "ride") {
      return `<li class="route-comparison-step route-comparison-step-ride">${timeTag}${renderRouteBadge(step.routeId)} ${escapeHtml(step.from)} → <strong>${escapeHtml(step.to)}</strong> <span class="route-comparison-step-time">${formatMinutes(step.minutes)}</span></li>`;
    }
    if (step.kind === "transfer") {
      return `<li class="route-comparison-step route-comparison-step-transfer">${timeTag}Transfer ${renderRouteBadge(step.from)} → ${renderRouteBadge(step.to)} at ${escapeHtml(step.at)} <span class="route-comparison-step-time">${formatMinutes(step.minutes)}</span></li>`;
    }
    return "";
  }).join("");
}

// --- quiz logic ---

function landmarkSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function setPuzzleUrl(originName, destName) {
  if (quizState.dailyMode) {
    history.replaceState(null, '', `${window.location.pathname}?daily`);
    return;
  }
  const params = new URLSearchParams({
    o: landmarkSlug(originName),
    d: landmarkSlug(destName),
    t: quizState.timeMinutes,
    dt: quizState.dayType,
  });
  history.replaceState(null, '', `${window.location.pathname}?${params}`);
}

function readPuzzleFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('daily') || document.body.hasAttribute('data-default-daily')) return { daily: true };
  const oSlug = params.get('o'), dSlug = params.get('d');
  if (!oSlug || !dSlug) return null;
  const origin = LANDMARKS.find(l => landmarkSlug(l.name) === oSlug);
  const dest   = LANDMARKS.find(l => landmarkSlug(l.name) === dSlug);
  if (!origin || !dest || origin === dest) return null;
  const t = params.get('t'), dt = params.get('dt');
  const timeMinutes = t !== null ? parseInt(t, 10) : null;
  const dayType = DAY_TYPES.includes(dt) ? dt : null;
  return { origin, dest, timeMinutes, dayType };
}

const DAY_TYPES = ["Weekday", "Saturday", "Sunday"];

// --- daily state persistence ---

function saveDailyState() {
  if (!quizState.dailyMode) return;
  try {
    localStorage.setItem(`quiz-daily-${quizState.dailyNumber}`, JSON.stringify({
      guesses: quizState.guesses,
      gameOver: quizState.gameOver,
      optimalResult: quizState.optimalResult,
      routeSequence: quizState.routeSequence,
    }));
  } catch (_) {}
}

function loadDailyState() {
  if (!quizState.dailyMode) return;
  try {
    const raw = localStorage.getItem(`quiz-daily-${quizState.dailyNumber}`);
    if (!raw) return;
    const saved = JSON.parse(raw);
    quizState.guesses = saved.guesses ?? [];
    quizState.gameOver = saved.gameOver ?? false;
    quizState.optimalResult = saved.optimalResult ?? null;
    quizState.routeSequence = saved.routeSequence ?? [];
  } catch (_) {}
}

function pickNewQuestion(overrides = null) {
  let origin, dest;
  if (overrides?.daily) {
    const dp = getDailyPuzzle();
    origin = dp.origin;
    dest = dp.dest;
    quizState.dayType = dp.dayType;
    quizState.timeMinutes = dp.timeMinutes;
    quizState.dailyMode = true;
    quizState.dailyNumber = dp.dayNumber;
  } else if (overrides) {
    ({ origin, dest } = overrides);
    quizState.dayType = overrides.dayType ?? (Math.random() < 0.5 ? "Weekday" : Math.random() < 0.5 ? "Saturday" : "Sunday");
    quizState.timeMinutes = overrides.timeMinutes ?? Math.round((360 + Math.random() * 900) / 5) * 5;
    quizState.dailyMode = false;
    quizState.dailyNumber = null;
  } else {
    const a = Math.floor(Math.random() * LANDMARKS.length);
    let b = Math.floor(Math.random() * (LANDMARKS.length - 1));
    if (b >= a) b += 1;
    origin = LANDMARKS[a];
    dest = LANDMARKS[b];
    quizState.dayType = Math.random() < 0.5 ? "Weekday" : Math.random() < 0.5 ? "Saturday" : "Sunday";
    quizState.timeMinutes = Math.round((360 + Math.random() * 900) / 5) * 5;
    quizState.dailyMode = false;
    quizState.dailyNumber = null;
  }
  quizState.origin = { name: origin.name, point: lonLatToWorld(origin.lon, origin.lat) };
  quizState.destination = { name: dest.name, point: lonLatToWorld(dest.lon, dest.lat) };
  quizState.routeSequence = [];
  quizState.guesses = [];
  quizState.gameOver = false;
  quizState.optimalResult = null;
  loadDailyState();
  setPuzzleUrl(origin.name, dest.name);
}

function addRoute(routeId) {
  if (quizState.gameOver) return;
  quizState.routeSequence = [...quizState.routeSequence, routeId];
  saveDailyState();
  renderUI();
}

function undoRoute() {
  if (quizState.gameOver) return;
  quizState.routeSequence = quizState.routeSequence.slice(0, -1);
  saveDailyState();
  renderUI();
}

function submitAnswer() {
  if (quizState.gameOver || quizState.routeSequence.length === 0) return;

  const evalResult = evaluateRouteOption(
    quizState.origin.point,
    quizState.destination.point,
    quizState.routeSequence,
  );

  // Compute optimal once on first viable guess
  if (!quizState.optimalResult) {
    const normalizedOrigin = normalizeTravelPoint(quizState.origin.point);
    const dijkstraResult = runDijkstra(normalizedOrigin);
    quizState.optimalResult = traceOptimalPath(normalizedOrigin, dijkstraResult, quizState.destination.point);
  }

  const minutesOff = evalResult.viable && quizState.optimalResult
    ? Math.max(0, evalResult.totalMinutes - quizState.optimalResult.totalMinutes)
    : null;

  quizState.guesses.push({ routeIds: [...quizState.routeSequence], evalResult, minutesOff });
  quizState.routeSequence = [];

  const hitOptimal = minutesOff !== null && minutesOff < 1;
  if (hitOptimal || quizState.guesses.length >= MAX_GUESSES) {
    quizState.gameOver = true;
  }

  saveDailyState();
  renderUI();
}

function nextQuestion() {
  pickNewQuestion();
  resetMapView();
  renderUI();
}

function giveUp() {
  if (quizState.gameOver) return;
  if (!quizState.optimalResult) {
    const normalizedOrigin = normalizeTravelPoint(quizState.origin.point);
    quizState.optimalResult = traceOptimalPath(normalizedOrigin, runDijkstra(normalizedOrigin), quizState.destination.point);
  }
  quizState.gameOver = true;
  saveDailyState();
  renderUI();
}

function guessEmoji(minutesOff) {
  if (minutesOff === null) return "⬛";
  if (minutesOff < 1)  return "🟩";
  if (minutesOff < 4)  return "🟨";
  if (minutesOff < 10) return "🟧";
  return "🟥";
}

function buildShareText() {
  const viableGuesses = quizState.guesses.filter(g => g.minutesOff !== null);
  const bestGuess = viableGuesses.reduce((best, g) => (!best || g.minutesOff < best.minutesOff) ? g : best, null);
  const opt = quizState.optimalResult;
  const optTime = opt ? Math.round(opt.totalMinutes) : "?";
  const emojiRow = quizState.guesses.map(g => guessEmoji(g.minutesOff)).join("");
  const bestLine = bestGuess
    ? (bestGuess.minutesOff < 1
        ? `I found the optimal route (${optTime} min)!`
        : `I was ${formatMinutes(bestGuess.minutesOff)} off the best route (optimal: ${optTime} min)`)
    : `Couldn't find a viable route (optimal: ${optTime} min)`;
  const header = quizState.dailyMode
    ? `NYC Transit Guessr 🚇 · Daily #${quizState.dailyNumber}`
    : "NYC Transit Guessr 🚇";
  const url = quizState.dailyMode
    ? `${window.location.origin}${window.location.pathname}?daily`
    : `${window.location.origin}${window.location.pathname}${window.location.search}`;
  return [
    header,
    `${quizState.origin.name} → ${quizState.destination.name}`,
    "",
    `${emojiRow} (${quizState.guesses.length}/${MAX_GUESSES})`,
    "",
    bestLine,
    "",
    url,
  ].join("\n");
}

function shareResults() {
  const text = buildShareText();
  document.getElementById("shareModalText").textContent = text;
  document.getElementById("shareModal").showModal();
}

function copyShareText() {
  const text = document.getElementById("shareModalText").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copyShareBtn");
    const original = btn.innerHTML;
    btn.innerHTML = "Copied!";
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2000);
  });
}

// --- UI rendering ---

function renderUI() {
  renderQuestion();
  renderRouteBuilder();
  renderResults();
  drawQuizMap();
}

function renderQuestion() {
  document.getElementById("quizOrigin").textContent = quizState.origin?.name ?? "";
  document.getElementById("quizDestination").textContent = quizState.destination?.name ?? "";
  const timeEl = document.getElementById("quizPuzzleTime");
  if (timeEl) {
    const timePart = quizState.timeMinutes !== null
      ? `${quizState.dayType} · ${formatClock(quizState.timeMinutes)}`
      : "";
    timeEl.innerHTML = quizState.dailyMode
      ? `<span class="quiz-daily-badge">Daily #${quizState.dailyNumber}</span>${timePart ? ` · ${escapeHtml(timePart)}` : ""}`
      : escapeHtml(timePart);
  }
}

function renderRouteBuilder() {
  const current = quizState.routeSequence;
  const { gameOver, guesses } = quizState;
  const guessNum = guesses.length + 1;

  document.getElementById("guessCounter").textContent =
    gameOver ? `${guesses.length} / ${MAX_GUESSES} guesses` : `Guess ${guessNum} of ${MAX_GUESSES}`;

  const seqEl = document.getElementById("quizRouteSequence");
  if (current.length === 0) {
    seqEl.innerHTML = '<span class="route-sequence-placeholder">Tap a route below to start</span>';
  } else {
    seqEl.innerHTML = current.map((id, i) =>
      (i > 0 ? '<span class="route-comparison-arrow">→</span>' : "") + renderRouteBadge(id)
    ).join("");
  }

  document.getElementById("undoBtn").disabled = gameOver || current.length === 0;
  document.getElementById("submitBtn").disabled = gameOver || current.length === 0;
  document.getElementById("giveUpBtn").hidden = gameOver;
  document.getElementById("quizActionsCard").hidden = !gameOver;
  document.getElementById("quizPalette").classList.toggle("palette-disabled", gameOver);
}

function renderResults() {
  const resultsEl = document.getElementById("quizResults");
  const { guesses, gameOver, optimalResult } = quizState;

  if (guesses.length === 0) { resultsEl.hidden = true; return; }
  resultsEl.hidden = false;

  // Guess history — each guess gets its own card
  const guessCards = guesses.map((g, i) => {
    const isLast = i === guesses.length - 1;
    const emoji = guessEmoji(g.minutesOff);
    const routeSeq = seqBadges(g.routeIds);
    const diffLabel = g.minutesOff === null
      ? `<span class="quiz-result-diff quiz-result-diff-invalid">${escapeHtml(g.evalResult.reason)}</span>`
      : g.minutesOff < 1
        ? `<span class="quiz-result-diff quiz-result-diff-optimal">Optimal! 🎉</span>`
        : `<span class="quiz-result-diff">+${formatMinutes(g.minutesOff)} vs optimal</span>`;

    const steps = g.evalResult.viable
      ? `<details class="guess-steps-details"${isLast ? " open" : ""}>
          <summary class="guess-steps-summary">Route details</summary>
          <ol class="route-comparison-steps guess-steps">${renderStepsList(g.evalResult.steps, quizState.timeMinutes)}</ol>
        </details>`
      : "";

    return `<div class="panel-card quiz-guess-card">
      <div class="guess-row">
        <span class="guess-emoji">${emoji}</span>
        <span class="guess-route">${routeSeq}</span>
        ${g.evalResult.viable ? `<span class="guess-time">${formatMinutes(g.evalResult.totalMinutes)}</span>` : ""}
        ${diffLabel}
      </div>
      ${steps}
    </div>`;
  }).join("");

  let html = `<div class="quiz-guess-history">${guessCards}</div>`;

  if (gameOver && optimalResult) {
    html += `<div class="panel-card quiz-answer-card">
      <div class="quiz-result-label">✨ Answer key <span class="quiz-result-diff quiz-result-diff-optimal">${formatMinutes(optimalResult.totalMinutes)}</span></div>
      <ol class="route-comparison-steps">${renderStepsList(optimalResult.steps, quizState.timeMinutes)}</ol>
    </div>`;
  }

  resultsEl.innerHTML = html;
}

function seqBadges(routeIds) {
  return routeIds.map((id, i) =>
    (i > 0 ? '<span class="route-comparison-arrow">→</span>' : "") + renderRouteBadge(id)
  ).join("");
}

// --- palette ---

const PALETTE_ORDER = ["1","2","3","A","C","E","B","D","F","M","N","Q","R","W","4","5","6","L","J","Z","7","G"];

function initPalette() {
  const paletteEl = document.getElementById("quizPalette");
  const allIds = [...routeStationIndex.keys()];
  const priority = new Map(PALETTE_ORDER.map((id, i) => [id, i]));
  const sortedRouteIds = allIds.sort((a, b) => {
    const ai = priority.get(a), bi = priority.get(b);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.localeCompare(b);
  });

  paletteEl.innerHTML = sortedRouteIds.map((routeId) => {
    const style = data.routeStyles?.[routeId];
    const label = style?.label ?? routeId;
    const bg = style?.color ?? "#5a6e84";
    const fg = style?.textColor ?? "#ffffff";
    return `<button class="route-palette-btn" type="button" data-route="${escapeHtml(routeId)}" style="background-color:${bg};color:${fg}" aria-label="Add ${escapeHtml(label)}">${escapeHtml(label)}</button>`;
  }).join("");

  paletteEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-route]");
    if (btn && !quizState.gameOver) addRoute(btn.dataset.route);
  });
}

// --- init ---

async function init() {
  const loadingEl = document.getElementById("quizLoading");
  const appTopEl = document.getElementById("quizAppTop");
  const appBottomEl = document.getElementById("quizAppBottom");

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (err) {
    loadingEl.innerHTML = `
      <p>Couldn't load puzzle data. Check your connection and try again.</p>
      <button class="quiz-btn quiz-btn-primary" style="margin-top:12px" onclick="location.reload()">Retry</button>
    `;
    console.error("Data load failed:", err);
    return;
  }

  // Collapse express variants into their base lines
  const ROUTE_COLLAPSED = { "6X": "6", "7X": "7", "FX": "F" };
  for (const rs of data.routeStates) {
    if (ROUTE_COLLAPSED[rs.routeId]) rs.routeId = ROUTE_COLLAPSED[rs.routeId];
  }
  for (const station of data.stations) {
    station.routes = [...new Set(station.routes.map(r => ROUTE_COLLAPSED[r] ?? r))];
  }

  settingsDefaults = {
    walkingSpeed: data.meta.walkMetersPerMinute ?? 80,
    swimSpeed: DEFAULT_SWIM_METERS_PER_MINUTE,
    transitTime: data.meta.defaultBoardWait ?? 4,
    transferTime: data.meta.transferPenalty ?? 4,
    maxTransitTime: 60,
  };
  settings = { ...settingsDefaults };
  routeStationIndex = buildRouteStationIndex();
  dynamicAdjacency = buildDynamicAdjacency();

  loadingEl.hidden = true;
  appTopEl.hidden = false;
  appBottomEl.hidden = false;

  initPalette();
  pickNewQuestion(readPuzzleFromUrl());
  renderUI();

  document.getElementById("shuffleBtn")?.addEventListener("click", nextQuestion);
  document.getElementById("undoBtn").addEventListener("click", undoRoute);
  document.getElementById("submitBtn").addEventListener("click", submitAnswer);
  document.getElementById("giveUpBtn").addEventListener("click", giveUp);
  document.getElementById("nextBtn")?.addEventListener("click", nextQuestion);
  document.getElementById("shareBtn").addEventListener("click", shareResults);
  document.getElementById("copyShareBtn").addEventListener("click", copyShareText);
  document.getElementById("shareModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });

  initMapInteraction();
  const canvas = document.getElementById("quizMapCanvas");
  new ResizeObserver(() => drawQuizMap()).observe(canvas);
}

init();
