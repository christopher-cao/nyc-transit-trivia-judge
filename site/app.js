const DATA_URL = new URL("./data/commute_map_data.json", import.meta.url).toString();
const DEFAULT_TRANSIT_TIME_MINUTES = 4;
const DEFAULT_MAX_TIME_MINUTES = 60;
const MIN_VIEWPORT_SCALE = 1;
const MAX_VIEWPORT_SCALE = 4;
const VIEWPORT_ZOOM_STEP = 1.35;
const PANEL_PADDING = 18;
const ROUTE_LINE_WIDTH = 2.2;
const HOVER_DEADBAND = 14;
const MOBILE_PIN_TAP_SLOP = 10;
const MOBILE_PIN_HIT_RADIUS = 26;
const DESKTOP_PIN_TAP_SLOP = 6;
const DESKTOP_PIN_HIT_RADIUS = 18;
const DEFAULT_SWIM_METERS_PER_MINUTE = 28;
const MAX_WALK_TO_STATION_MINUTES = 30;
const SHARE_COORDINATE_DECIMALS = 5;
const EMOJI_BURST_INTERVAL_MS = 90;
const EMOJI_BURST_PER_TICK = 3;
const EMOJI_BURST_LIFETIME_MS = 900;
const MOBILE_DRAWER_SWIPE_THRESHOLD_PX = 36;
const METERS_PER_MINUTE_PER_MPH = 26.8224;
const SETTINGS_STORAGE_KEY = "nyc-cartogram-settings-v1";

const EMOJI_BURST_SETS = {
  github: ["💻", "🖥️", "⌨️", "⚙️", "🧑‍💻"],
  nyc: ["🗽", "🌆", "🏙️", "🚕", "🍎"],
  transit: ["🚇", "🚉", "🚊", "🚦", "🛤️"],
  maps: ["🗺️", "📍", "🧭", "➡️", "📌"],
  parks: ["🌳", "🌲", "🌿", "🍃", "🌱"],
  anthony: ["🤓", "✨", "🧠", "💫", "🪄"],
  twitter: ["🐦", "🕊️", "🐥", "🪽"],
  linkedin: ["💼", "📈", "🤝", "🧠", "📊"],
  coffee: ["☕", "🥤", "🧋", "🍵"],
};

const state = {
  data: null,
  ready: false,
  showPinHint: true,
  isMobile: false,
  drawerCollapsed: false,
  mobileHelpCollapsed: false,
  viewportScale: 1,
  viewportCenter: null,
  panOffsetPx: [0, 0],
  panStartScreen: null,
  panBaseOffset: null,
  placingDestination: false,
  placingOrigin: false,
  cursorPoint: null,
  cursorScreen: null,
  originPoint: null,
  originLabel: null,
  probeLabel: null,
  pinnedPoint: null,
  pinnedScreen: null,
  pinned: false,
  probePoint: null,
  probePinned: false,
  mobilePointerId: null,
  mobileDragTarget: null,
  mobileGestureStartScreen: null,
  mobileGestureMoved: false,
  mobileDrawerPointerId: null,
  mobileDrawerStartY: 0,
  mobileDrawerOffset: 0,
  mobileDrawerDidSwipe: false,
  transform: null,
  currentRender: null,
  travelSettings: null,
  travelSettingsDefaults: null,
  dynamicAdjacency: null,
  routeStationIndex: null,
  routeOptions: [[]],
  activeRouteOptionIndex: 0,
  routeOptionEvals: [],
  optimalPathResult: null,
  selectedDayType: null,
  selectedTimeMinutes: null,
  dirty: true,
};

const mapCanvas = document.getElementById("mapCanvas");
const statusText = document.getElementById("statusText");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const searchForm = document.getElementById("searchForm");
const addressInput = document.getElementById("addressInput");
const searchButton = document.getElementById("searchButton");
const shareButton = document.getElementById("shareButton");
const sharePanel = document.getElementById("sharePanel");
const shareNativeRow = document.getElementById("shareNativeRow");
const nativeShareAction = document.getElementById("nativeShareAction");
const shareXAction = document.getElementById("shareXAction");
const shareFacebookAction = document.getElementById("shareFacebookAction");
const shareInstagramAction = document.getElementById("shareInstagramAction");
const shareLinkedInAction = document.getElementById("shareLinkedInAction");
const downloadImageAction = document.getElementById("downloadImageAction");
const shareXIcon = document.getElementById("shareXIcon");
const shareFacebookIcon = document.getElementById("shareFacebookIcon");
const shareInstagramIcon = document.getElementById("shareInstagramIcon");
const shareLinkedInIcon = document.getElementById("shareLinkedInIcon");
const searchMeta = document.getElementById("searchMeta");
const searchResults = document.getElementById("searchResults");
const originSearchForm = document.getElementById("originSearchForm");
const originAddressInput = document.getElementById("originAddressInput");
const originSearchButton = document.getElementById("originSearchButton");
const originSearchMeta = document.getElementById("originSearchMeta");
const originSearchResults = document.getElementById("originSearchResults");
const destSearchForm = document.getElementById("destSearchForm");
const destAddressInput = document.getElementById("destAddressInput");
const destSearchButton = document.getElementById("destSearchButton");
const destSearchMeta = document.getElementById("destSearchMeta");
const destSearchResults = document.getElementById("destSearchResults");
const setDestinationBtn = document.getElementById("setDestinationBtn");
const setOriginBtn = document.getElementById("setOriginBtn");
const clearOriginBtn = document.getElementById("clearOriginBtn");
const clearDestBtn = document.getElementById("clearDestBtn");
const timePickerInput = document.getElementById("timePickerInput");
const clearTimeBtn = document.getElementById("clearTimeBtn");
const mapDistanceOverlay = document.getElementById("mapDistanceOverlay");
const mapDistanceRoute = document.getElementById("mapDistanceRoute");
const mobileOriginTitle = document.getElementById("mobileOriginTitle");
const mobileStatusText = document.getElementById("mobileStatusText");
const mobileClearButton = document.getElementById("mobileClearButton");
const mobileSheet = document.getElementById("mobileSheet");
const mobileSheetToggle = document.getElementById("mobileSheetToggle");
const mobileSheetBody = document.getElementById("mobileSheetBody");
const optimalAccordionContainer = document.getElementById("optimalAccordionContainer");
const routeBuilderPanel = document.getElementById("routeBuilderPanel");
const routeComparisons = document.getElementById("routeComparisons");
const routePalette = document.getElementById("routePalette");
const addComparisonBtn = document.getElementById("addComparisonBtn");
const undoRouteBtn = document.getElementById("undoRouteBtn");
const mobileRouteBuilderPanel = document.getElementById("mobileRouteBuilderPanel");
const mobileRouteComparisons = document.getElementById("mobileRouteComparisons");
const mobileRoutePalette = document.getElementById("mobileRoutePalette");
const mobileAddComparisonBtn = document.getElementById("mobileAddComparisonBtn");
const mobileUndoRouteBtn = document.getElementById("mobileUndoRouteBtn");
const mobileSearchForm = document.getElementById("mobileSearchForm");
const mobileAddressInput = document.getElementById("mobileAddressInput");
const mobileSearchButton = document.getElementById("mobileSearchButton");
const mobileSearchMeta = document.getElementById("mobileSearchMeta");
const mobileSearchResults = document.getElementById("mobileSearchResults");
const mobileLocateButton = document.getElementById("mobileLocateButton");
const mobileShareButton = document.getElementById("mobileShareButton");
const settingsInputs = Array.from(document.querySelectorAll("[data-setting-key]"));
const settingsValueLabels = Array.from(document.querySelectorAll("[data-setting-value]"));
const settingsResetButtons = Array.from(document.querySelectorAll("[data-settings-reset]"));
const settingsSaveButtons = Array.from(document.querySelectorAll("[data-settings-save]"));
const settingsMenus = Array.from(document.querySelectorAll(".settings-menu"));
const ctx = mapCanvas.getContext("2d");
const panelCard = document.querySelector(".panel-card");
const footerEmojiLinks = Array.from(document.querySelectorAll("[data-emoji-burst]"));

const emojiBurstState = {
  mediaQuery: null,
  layer: null,
  activeLink: null,
  pointerX: 0,
  pointerY: 0,
  intervalId: null,
};

const searchUis = [
  {
    form: searchForm,
    input: addressInput,
    button: searchButton,
    meta: searchMeta,
    results: searchResults,
  },
  {
    form: mobileSearchForm,
    input: mobileAddressInput,
    button: mobileSearchButton,
    meta: mobileSearchMeta,
    results: mobileSearchResults,
  },
].filter((ui) => ui.form !== null);

shareXIcon.src = new URL("./x.png", import.meta.url).toString();
shareFacebookIcon.src = new URL("./Facebook.png", import.meta.url).toString();
shareInstagramIcon.src = new URL("./Instagram.png", import.meta.url).toString();
shareLinkedInIcon.src = new URL("./LinkedIn.png", import.meta.url).toString();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function metersPerMinuteToMph(value) {
  return value / METERS_PER_MINUTE_PER_MPH;
}

function mphToMetersPerMinute(value) {
  return value * METERS_PER_MINUTE_PER_MPH;
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

function getTravelSettingsDefaults() {
  const meta = state.data?.meta ?? {};
  return {
    walkingSpeed: meta.walkMetersPerMinute ?? 80,
    swimSpeed: DEFAULT_SWIM_METERS_PER_MINUTE,
    transitTime: meta.defaultBoardWait ?? DEFAULT_TRANSIT_TIME_MINUTES,
    transferTime: meta.transferPenalty ?? 4,
    maxTransitTime: DEFAULT_MAX_TIME_MINUTES,
  };
}

function sanitizeTravelSettings(rawSettings, defaults = state.travelSettingsDefaults || getTravelSettingsDefaults()) {
  const raw = rawSettings ?? {};
  return {
    walkingSpeed: clamp(
      Number.isFinite(raw.walkingSpeed) ? raw.walkingSpeed : defaults.walkingSpeed,
      mphToMetersPerMinute(2),
      mphToMetersPerMinute(5),
    ),
    swimSpeed: clamp(
      Number.isFinite(raw.swimSpeed) ? raw.swimSpeed : defaults.swimSpeed,
      0,
      mphToMetersPerMinute(2.5),
    ),
    transitTime: clamp(
      Number.isFinite(raw.transitTime) ? raw.transitTime : defaults.transitTime,
      1,
      12,
    ),
    transferTime: clamp(
      Number.isFinite(raw.transferTime) ? raw.transferTime : defaults.transferTime,
      1,
      15,
    ),
    maxTransitTime: clamp(
      Number.isFinite(raw.maxTransitTime) ? raw.maxTransitTime : defaults.maxTransitTime,
      30,
      120,
    ),
  };
}

function currentTravelSettings() {
  return state.travelSettings || state.travelSettingsDefaults || getTravelSettingsDefaults();
}

function loadStoredTravelSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function persistTravelSettings() {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentTravelSettings()));
  } catch (error) {
    console.error(error);
  }
}

function settingToInputValue(key, value) {
  if (key === "walkingSpeed" || key === "swimSpeed") {
    return String(roundToStep(metersPerMinuteToMph(value), 0.1).toFixed(1));
  }
  const step = key === "maxTransitTime" ? 5 : 0.5;
  const digits = step < 1 ? 1 : 0;
  return String(roundToStep(value, step).toFixed(digits));
}

function formatSettingLabel(key, value) {
  if (key === "walkingSpeed" || key === "swimSpeed") {
    return `${Number(value).toFixed(1)} mph`;
  }
  return `${Number(value) % 1 === 0 ? Number(value).toFixed(0) : Number(value).toFixed(1)} min`;
}

function syncTravelSettingsInputs() {
  const settings = currentTravelSettings();
  for (const input of settingsInputs) {
    const key = input.dataset.settingKey;
    if (!key || !(key in settings)) continue;
    input.value = settingToInputValue(key, settings[key]);
  }
  for (const label of settingsValueLabels) {
    const key = label.dataset.settingValue;
    if (!key || !(key in settings)) continue;
    label.textContent = formatSettingLabel(key, Number(settingToInputValue(key, settings[key])));
  }
}

function applyTravelSettings(nextSettings, { persist = true } = {}) {
  state.travelSettings = sanitizeTravelSettings(nextSettings);
  syncTravelSettingsInputs();
  if (persist) persistTravelSettings();
  state.dirty = true;
  requestDraw();
}

function canShowEmojiBursts() {
  if (!emojiBurstState.mediaQuery) {
    emojiBurstState.mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 481px)");
  }
  return emojiBurstState.mediaQuery.matches;
}

function ensureEmojiBurstLayer() {
  if (emojiBurstState.layer) return emojiBurstState.layer;
  const layer = document.createElement("div");
  layer.className = "emoji-burst-layer";
  document.body.appendChild(layer);
  emojiBurstState.layer = layer;
  return layer;
}

function stopEmojiBurstLoop() {
  if (emojiBurstState.intervalId !== null) {
    window.clearInterval(emojiBurstState.intervalId);
    emojiBurstState.intervalId = null;
  }
  emojiBurstState.activeLink = null;
}

function emitEmojiBurst(link, originX, originY) {
  const theme = link.dataset.emojiBurst;
  const emojis = EMOJI_BURST_SETS[theme];
  if (!emojis?.length) return;

  const layer = ensureEmojiBurstLayer();
  const originJitter = 10;

  for (let index = 0; index < EMOJI_BURST_PER_TICK; index += 1) {
    const particle = document.createElement("span");
    particle.className = "emoji-burst";
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const burstX = originX + (Math.random() - 0.5) * originJitter * 2;
    const burstY = originY + (Math.random() - 0.5) * originJitter * 2;
    const burstDx = (Math.random() - 0.5) * 54;
    const burstDy = -36 - Math.random() * 72;
    const rotation = `${(Math.random() - 0.5) * 44}deg`;
    const size = `${0.9 + Math.random() * 0.5}rem`;

    particle.style.setProperty("--burst-x", `${Math.round(burstX)}px`);
    particle.style.setProperty("--burst-y", `${Math.round(burstY)}px`);
    particle.style.setProperty("--burst-dx", `${Math.round(burstDx)}px`);
    particle.style.setProperty("--burst-dy", `${Math.round(burstDy)}px`);
    particle.style.setProperty("--burst-rotate", rotation);
    particle.style.fontSize = size;

    layer.appendChild(particle);
    window.setTimeout(() => {
      particle.remove();
    }, EMOJI_BURST_LIFETIME_MS);
  }
}

function updateEmojiBurstPointer(event, link) {
  emojiBurstState.pointerX = event.clientX;
  emojiBurstState.pointerY = event.clientY;

  if (!canShowEmojiBursts()) {
    stopEmojiBurstLoop();
    return;
  }

  emojiBurstState.activeLink = link;
}

function startEmojiBurstLoop(link, event) {
  if (!canShowEmojiBursts()) return;

  updateEmojiBurstPointer(event, link);
  emitEmojiBurst(link, emojiBurstState.pointerX, emojiBurstState.pointerY);
  stopEmojiBurstLoop();
  emojiBurstState.activeLink = link;
  emojiBurstState.intervalId = window.setInterval(() => {
    if (!emojiBurstState.activeLink || !canShowEmojiBursts()) {
      stopEmojiBurstLoop();
      return;
    }
    emitEmojiBurst(
      emojiBurstState.activeLink,
      emojiBurstState.pointerX,
      emojiBurstState.pointerY,
    );
  }, EMOJI_BURST_INTERVAL_MS);
}

function setupFooterEmojiBursts() {
  if (!footerEmojiLinks.length) return;

  for (const link of footerEmojiLinks) {
    link.addEventListener("pointerenter", (event) => {
      if (!(event.pointerType === "mouse" || event.pointerType === "")) return;
      startEmojiBurstLoop(link, event);
    });

    link.addEventListener("pointermove", (event) => {
      if (emojiBurstState.activeLink !== link) return;
      updateEmojiBurstPointer(event, link);
    });

    link.addEventListener("pointerleave", () => {
      if (emojiBurstState.activeLink === link) {
        stopEmojiBurstLoop();
      }
    });

    link.addEventListener("blur", () => {
      if (emojiBurstState.activeLink === link) {
        stopEmojiBurstLoop();
      }
    });
  }

  if (!emojiBurstState.mediaQuery) {
    emojiBurstState.mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 481px)");
  }
  emojiBurstState.mediaQuery.addEventListener("change", () => {
    if (!emojiBurstState.mediaQuery.matches) {
      stopEmojiBurstLoop();
    }
  });
}

function clampToRange(value, min, max) {
  if (min > max) {
    return (min + max) / 2;
  }
  return clamp(value, min, max);
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
  for (let index = 1; index < polygon.length; index += 1) {
    if (pointInRing(point, polygon[index])) return false;
  }
  return true;
}

function pointToSegmentProjection(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return { point: start.slice(), distance: distance(point, start) };
  }
  const t = clamp(((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared, 0, 1);
  const projectedPoint = [start[0] + dx * t, start[1] + dy * t];
  return { point: projectedPoint, distance: distance(point, projectedPoint) };
}

function locateNearestBoroughBorder(point) {
  let best = { point: point.slice(), distance: Infinity };
  for (const borough of state.data.boroughs) {
    for (const polygon of borough.polygons) {
      for (const ring of polygon) {
        for (let index = 0; index < ring.length - 1; index += 1) {
          const candidate = pointToSegmentProjection(point, ring[index], ring[index + 1]);
          if (candidate.distance < best.distance) best = candidate;
        }
      }
    }
  }
  return best;
}

function pointInBoroughs(point) {
  for (const borough of state.data.boroughs) {
    for (const polygon of borough.polygons) {
      if (pointInPolygon(point, polygon)) return true;
    }
  }
  return false;
}

function pointInExternalLand(point) {
  for (const polygon of state.data.externalLand || []) {
    if (pointInPolygon(point, polygon)) return true;
  }
  return false;
}

function classifySurface(point) {
  if (pointInBoroughs(point)) return "borough";
  return pointInExternalLand(point) ? "land" : "water";
}

function normalizeTravelPoint(point) {
  const settings = currentTravelSettings();
  const surface = classifySurface(point);
  if (surface !== "water") {
    return {
      surface,
      point,
      swimMinutes: 0,
      swimDistance: 0,
    };
  }
  const border = locateNearestBoroughBorder(point);
  return {
    surface,
    point: border.point,
    swimMinutes: border.distance / settings.swimSpeed,
    swimDistance: border.distance,
  };
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes)) return "unreachable";
  if (minutes < 1) return "<1 min";
  return `${Math.round(minutes)} min`;
}

function formatClock(absoluteMinutes) {
  const total = Math.round(absoluteMinutes) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function formatTravelBreakdown(baseMinutes, swimMinutes) {
  if (!Number.isFinite(baseMinutes)) return "unreachable";
  if (swimMinutes < 0.5) return formatMinutes(baseMinutes);
  return `${Math.round(baseMinutes)} min + ${Math.round(swimMinutes)} min swim 🌊`;
}

function formatDistanceLabel(baseMinutes, swimMinutes) {
  const label = formatTravelBreakdown(baseMinutes, swimMinutes);
  return label === "unreachable" ? label : `${label} away`;
}

function formatShareTime(date = new Date()) {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 480px)").matches;
}

function setDrawerCollapsed(collapsed) {
  state.drawerCollapsed = collapsed;
  if (!mobileSheet || !mobileSheetToggle || !mobileSheetBody) return;
  state.mobileDrawerOffset = 0;
  mobileSheet.style.removeProperty("--mobile-sheet-offset");
  mobileSheet.classList.remove("is-dragging");
  mobileSheet.classList.toggle("is-collapsed", collapsed);
  mobileSheet.setAttribute("aria-expanded", String(!collapsed));
  mobileSheetToggle.setAttribute("aria-expanded", String(!collapsed));
  mobileSheetBody.hidden = collapsed;
}

function beginMobileDrawerGesture(event) {
  if (!state.isMobile || !mobileSheet) return;
  if (event.pointerType === "mouse") return;
  state.mobileDrawerPointerId = event.pointerId;
  state.mobileDrawerStartY = event.clientY;
  state.mobileDrawerOffset = 0;
  state.mobileDrawerDidSwipe = false;
  mobileSheet.classList.add("is-dragging");
  mobileSheet.style.setProperty("--mobile-sheet-offset", "0px");
  mobileSheetToggle?.setPointerCapture?.(event.pointerId);
}

function updateMobileDrawerGesture(event) {
  if (!mobileSheet || state.mobileDrawerPointerId !== event.pointerId) return;
  const deltaY = event.clientY - state.mobileDrawerStartY;
  const offset = state.drawerCollapsed ? Math.min(0, deltaY) : Math.max(0, deltaY);
  state.mobileDrawerOffset = offset;
  mobileSheet.style.setProperty("--mobile-sheet-offset", `${offset}px`);
}

function endMobileDrawerGesture(event) {
  if (state.mobileDrawerPointerId !== event.pointerId) return;
  const offset = state.mobileDrawerOffset;
  state.mobileDrawerDidSwipe = Math.abs(offset) >= 4;
  state.mobileDrawerPointerId = null;
  state.mobileDrawerStartY = 0;
  state.mobileDrawerOffset = 0;
  mobileSheet?.classList.remove("is-dragging");
  mobileSheet?.style.removeProperty("--mobile-sheet-offset");
  mobileSheetToggle?.releasePointerCapture?.(event.pointerId);

  if (state.drawerCollapsed) {
    if (offset <= -MOBILE_DRAWER_SWIPE_THRESHOLD_PX) {
      setDrawerCollapsed(false);
    }
    return;
  }

  if (offset >= MOBILE_DRAWER_SWIPE_THRESHOLD_PX) {
    setDrawerCollapsed(true);
  }
}

function cancelMobileDrawerGesture(event) {
  if (!mobileSheet || state.mobileDrawerPointerId !== event.pointerId) return;
  state.mobileDrawerPointerId = null;
  state.mobileDrawerStartY = 0;
  state.mobileDrawerOffset = 0;
  state.mobileDrawerDidSwipe = false;
  mobileSheet.classList.remove("is-dragging");
  mobileSheet.style.removeProperty("--mobile-sheet-offset");
  mobileSheetToggle?.releasePointerCapture?.(event.pointerId);
}

function worldToLonLat(point) {
  const metersPerDegLat = 111_320.0;
  const metersPerDegLon = metersPerDegLat * Math.cos((state.data.meta.lat0 * Math.PI) / 180);
  return {
    lon: point[0] / metersPerDegLon,
    lat: point[1] / metersPerDegLat,
  };
}

function formatCoordinate(value) {
  return Number(value).toFixed(SHARE_COORDINATE_DECIMALS);
}

function formatCoordinatePair(point) {
  const { lat, lon } = worldToLonLat(point);
  return `${formatCoordinate(lat)},${formatCoordinate(lon)}`;
}

function originPathForPoint(point) {
  return `@${formatCoordinatePair(point)}`;
}

function originQueryForPoint(point) {
  return `?origin=${formatCoordinatePair(point)}`;
}

function parseCoordinatePair(value) {
  if (!value) return null;
  const match = value.match(/^@?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function parseOriginPath(pathname = window.location.pathname) {
  const match = pathname.match(/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\/?$/);
  return match ? parseCoordinatePair(`${match[1]},${match[2]}`) : null;
}

function getBasePath() {
  return window.__ASSET_BASE__ || "/";
}

function isLocalStaticDev() {
  return (
    ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    getBasePath().startsWith("/site/")
  );
}

function getCoordinateUrlFragment(point) {
  return isLocalStaticDev() ? originQueryForPoint(point) : originPathForPoint(point);
}

function buildViewUrlFragment(
  originPoint = state.pinnedPoint || state.originPoint,
  probePoint = state.probePoint,
  zoomLevel = state.viewportScale,
) {
  const params = new URLSearchParams();
  if (isLocalStaticDev() && originPoint) {
    params.set("origin", formatCoordinatePair(originPoint));
  }
  if (probePoint) {
    params.set("distance", formatCoordinatePair(probePoint));
  }
  if (zoomLevel > MIN_VIEWPORT_SCALE) {
    params.set("zoom", zoomLevel.toFixed(2));
  }
  const query = params.toString();
  if (isLocalStaticDev()) {
    return query ? `?${query}` : "";
  }

  const path = originPoint ? originPathForPoint(originPoint) : "";
  return query ? `${path}?${query}` : path;
}

function parseSharedView() {
  const searchParams = new URLSearchParams(window.location.search);
  const origin =
    parseOriginPath() ||
    parseCoordinatePair(searchParams.get("origin")) ||
    parseCoordinatePair(window.location.hash.replace(/^#/, ""));
  const probe = parseCoordinatePair(searchParams.get("distance"));
  const zoomRaw = Number(searchParams.get("zoom"));
  const zoom = Number.isFinite(zoomRaw) ? clamp(zoomRaw, MIN_VIEWPORT_SCALE, MAX_VIEWPORT_SCALE) : null;
  return { origin, probe, zoom };
}

function replaceBrowserUrl(pathOrQuery = "") {
  const nextUrl = new URL(pathOrQuery, window.location.origin + getBasePath());
  window.history.replaceState(null, "", nextUrl);
}

function syncBrowserUrl() {
  replaceBrowserUrl(buildViewUrlFragment());
}

function getShareUrl() {
  const pathOrQuery = buildViewUrlFragment();
  return new URL(pathOrQuery, window.location.origin + getBasePath()).toString();
}

function getShareText() {
  return "Explore New York City by subway commute time with this interactive transit cartogram.";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortOriginLabel(label) {
  if (!label) return "";
  if (label === "My location") return label;
  const primary = label.split(",")[0].trim();
  if (/^\d/.test(primary)) return primary;
  return primary.toLowerCase().startsWith("near ") ? primary : `Near ${primary}`;
}

function defaultMapCenter(bounds = state.data?.meta?.bounds) {
  if (!bounds) return [0, 0];
  const [minX, minY, maxX, maxY] = bounds;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function pinMidpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function currentZoomFocusPoint() {
  if (state.originPoint && state.probePoint) return pinMidpoint(state.originPoint, state.probePoint);
  if (state.originPoint) return state.originPoint.slice();
  return defaultMapCenter();
}

function activeViewportCenter() {
  if (state.viewportScale <= MIN_VIEWPORT_SCALE) return null;
  return currentZoomFocusPoint();
}

function buildTransform(bounds, width, height, padding = PANEL_PADDING, zoom = 1, centerPoint = null) {
  const [minX, minY, maxX, maxY] = bounds;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const baseScale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const scale = baseScale * zoom;
  const [rawCenterX, rawCenterY] = centerPoint || defaultMapCenter(bounds);
  const centerX = clamp(rawCenterX, minX, maxX);
  const centerY = clamp(rawCenterY, minY, maxY);
  const offsetX = width / 2;
  const offsetY = height / 2;

  return {
    scale,
    baseScale,
    center: [centerX, centerY],
    cacheKey: `${width}:${height}:${scale}:${centerX}:${centerY}`,
    toScreen(point) {
      const [x, y] = point;
      return [offsetX + (x - centerX) * scale, offsetY - (y - centerY) * scale];
    },
    toWorld(x, y) {
      return [centerX + (x - offsetX) / scale, centerY - (y - offsetY) / scale];
    },
  };
}

function offsetTransform(baseTransform, dx, dy) {
  return {
    scale: baseTransform.scale,
    toScreen(point) {
      const [sx, sy] = baseTransform.toScreen(point);
      return [sx + dx, sy + dy];
    },
    toWorld(x, y) {
      return baseTransform.toWorld(x - dx, y - dy);
    },
  };
}

function createCanvasBacking(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: rect.width, height: rect.height };
}

function drawPanelBackground(drawCtx, width, height) {
  drawCtx.clearRect(0, 0, width, height);
  const bg = drawCtx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "rgba(255,255,255,0.72)");
  bg.addColorStop(1, "rgba(241,232,217,0.84)");
  drawCtx.fillStyle = bg;
  drawCtx.fillRect(0, 0, width, height);

  drawCtx.strokeStyle = "rgba(23, 48, 77, 0.08)";
  drawCtx.lineWidth = 1;
  for (let x = 18; x < width; x += 38) {
    drawCtx.beginPath();
    drawCtx.moveTo(x, 0);
    drawCtx.lineTo(x, height);
    drawCtx.stroke();
  }
}

function tracePolygonPath(drawCtx, polygon, projectPoint) {
  for (const ring of polygon) {
    ring.forEach((point, index) => {
      const [sx, sy] = projectPoint(point);
      if (index === 0) drawCtx.moveTo(sx, sy);
      else drawCtx.lineTo(sx, sy);
    });
    drawCtx.closePath();
  }
}

function drawPolygonPath(drawCtx, polygon, projectPoint) {
  drawCtx.beginPath();
  tracePolygonPath(drawCtx, polygon, projectPoint);
}

function landMaskPolygons() {
  if (state.data.landMask?.length) return state.data.landMask;
  return state.data.boroughs.flatMap((borough) => borough.polygons);
}

function traceBoroughMaskPath(drawCtx, projectPoint) {
  drawCtx.beginPath();
  for (const borough of state.data.boroughs) {
    for (const polygon of borough.polygons) {
      tracePolygonPath(drawCtx, polygon, projectPoint);
    }
  }
}

function traceLandMaskPath(drawCtx, projectPoint) {
  drawCtx.beginPath();
  for (const polygon of landMaskPolygons()) {
    tracePolygonPath(drawCtx, polygon, projectPoint);
  }
}

function fillLandMask(drawCtx, projectPoint) {
  traceLandMaskPath(drawCtx, projectPoint);
  drawCtx.fillStyle = "#f3f6fa";
  drawCtx.fill("evenodd");
}

function drawExternalLand(drawCtx, projectPoint) {
  const polygons = state.data.externalLand || [];
  if (!polygons.length) return;
  drawCtx.save();
  drawCtx.globalAlpha = 0.3;
  drawCtx.fillStyle = "#f3f6fa";
  drawCtx.strokeStyle = "rgba(79, 105, 135, 0.42)";
  drawCtx.lineWidth = 0.75;
  drawCtx.lineJoin = "round";
  for (const polygon of polygons) {
    drawPolygonPath(drawCtx, polygon, projectPoint);
    drawCtx.fill();
    drawCtx.stroke();
  }
  drawCtx.restore();
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function distanceToChord(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return distance(point, start);
  return Math.abs(dx * (start[1] - point[1]) - (start[0] - point[0]) * dy) / length;
}

function traceAdaptiveSegment(drawCtx, start, end, startScreen, endScreen, projectPoint, tolerance, depth) {
  if (depth <= 0) {
    drawCtx.lineTo(endScreen[0], endScreen[1]);
    return;
  }
  const worldMid = midpoint(start, end);
  const screenMid = projectPoint(worldMid);
  const deviation = distanceToChord(screenMid, startScreen, endScreen);
  if (deviation <= tolerance) {
    drawCtx.lineTo(endScreen[0], endScreen[1]);
    return;
  }
  traceAdaptiveSegment(drawCtx, start, worldMid, startScreen, screenMid, projectPoint, tolerance, depth - 1);
  traceAdaptiveSegment(drawCtx, worldMid, end, screenMid, endScreen, projectPoint, tolerance, depth - 1);
}

function drawPolyline(drawCtx, points, projectPoint, { tolerance = 0, maxDepth = 0 } = {}) {
  if (!points.length) return;
  drawCtx.beginPath();
  let previousPoint = points[0];
  let previousScreen = projectPoint(previousPoint);
  drawCtx.moveTo(previousScreen[0], previousScreen[1]);
  for (let index = 1; index < points.length; index += 1) {
    const nextPoint = points[index];
    const nextScreen = projectPoint(nextPoint);
    if (tolerance > 0 && maxDepth > 0) {
      traceAdaptiveSegment(
        drawCtx,
        previousPoint,
        nextPoint,
        previousScreen,
        nextScreen,
        projectPoint,
        tolerance,
        maxDepth,
      );
    } else {
      drawCtx.lineTo(nextScreen[0], nextScreen[1]);
    }
    previousPoint = nextPoint;
    previousScreen = nextScreen;
  }
  drawCtx.stroke();
}

function drawCityBasemap(
  drawCtx,
  projectPoint,
  {
    includeBoroughBorders = true,
    streetCurveTolerance = 0,
    routeCurveTolerance = 0,
    curveMaxDepth = 0,
  } = {},
) {
  fillLandMask(drawCtx, projectPoint);

  for (const polygon of state.data.parks) {
    drawPolygonPath(drawCtx, polygon, projectPoint);
    drawCtx.fillStyle = "#dbeacd";
    drawCtx.strokeStyle = "#a7c39b";
    drawCtx.lineWidth = 0.45;
    drawCtx.fill();
    drawCtx.stroke();
  }

  for (const street of state.data.streets) {
    drawCtx.strokeStyle = "rgba(193, 202, 212, 0.92)";
    drawCtx.lineWidth = streetWidth(street.kind);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawPolyline(drawCtx, street.points, projectPoint, {
      tolerance: streetCurveTolerance,
      maxDepth: curveMaxDepth,
    });
  }

  for (const route of state.data.routes) {
    drawCtx.strokeStyle = route.color;
    drawCtx.lineWidth = ROUTE_LINE_WIDTH;
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawPolyline(drawCtx, route.points, projectPoint, {
      tolerance: routeCurveTolerance,
      maxDepth: curveMaxDepth,
    });
  }

  if (includeBoroughBorders) {
    for (const borough of state.data.boroughs) {
      for (const polygon of borough.polygons) {
        drawPolygonPath(drawCtx, polygon, projectPoint);
        drawCtx.strokeStyle = "#4f6987";
        drawCtx.lineWidth = 1.05;
        drawCtx.stroke();
      }
    }
  }
}

// Maybe we can use this to display the stations.
function drawStations(drawCtx, projectPoint) {
  for (const station of state.data.stations) {
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
  drawCtx.font = '700 15px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  drawCtx.textAlign = "center";
  drawCtx.textBaseline = "middle";
  drawCtx.fillStyle = "#17304d";
  drawCtx.strokeStyle = "rgba(255,252,247,0.95)";
  drawCtx.lineWidth = 6;
  drawCtx.lineJoin = "round";
  for (const borough of state.data.boroughs) {
    const [lx, ly] = projectPoint(borough.label);
    drawCtx.strokeText(borough.name, lx, ly);
    drawCtx.fillText(borough.name, lx, ly);
  }
}

function streetWidth(kind) {
  if (kind === "motorway") return 1.8;
  if (kind === "trunk") return 1.5;
  return 1.1;
}

function buildDynamicAdjacency() {
  const defaults = state.travelSettingsDefaults || getTravelSettingsDefaults();
  const routeStates = state.data.routeStates;
  const stations = state.data.stations;

  return state.data.adjacency.map((edges, fromIndex) => {
    const fromState = routeStates[fromIndex];
    return edges.map(([toIndex, weight]) => {
      const toState = routeStates[toIndex];
      const boardingDelta =
        (state.data.routeWaits?.[toState.routeId] ?? defaults.transitTime) - defaults.transitTime;
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
        weight -
          walkDistance / defaults.walkingSpeed -
          boardingDelta -
          defaults.transitTime -
          (state.data.meta.interComplexTransferPenalty ?? defaults.transferTime),
      );
      const walkTime = walkDistance / defaults.walkingSpeed + walkPenalty;
      const midpoint = [(fromPoint[0] + toPoint[0]) / 2, (fromPoint[1] + toPoint[1]) / 2];
      if (walkTime > MAX_WALK_TO_STATION_MINUTES || classifySurface(midpoint) === "water") return null;

      return {
        toIndex,
        kind: "interchange",
        boardingDelta,
        walkDistance,
        walkPenalty,
      };
    }).filter(e => e !== null);
  });
}

function buildRouteStationIndex() {
  const index = new Map();
  for (let stationIndex = 0; stationIndex < state.data.stations.length; stationIndex += 1) {
    for (const routeId of state.data.stations[stationIndex].routes) {
      if (!index.has(routeId)) index.set(routeId, []);
      index.get(routeId).push(stationIndex);
    }
  }
  return index;
}

function sortRouteIds(routeIds) {
  return [...routeIds].sort((a, b) => {
    const aNum = /^\d/.test(a);
    const bNum = /^\d/.test(b);
    if (aNum && bNum) {
      const aVal = parseInt(a, 10);
      const bVal = parseInt(b, 10);
      if (aVal !== bVal) return aVal - bVal;
      return a.localeCompare(b);
    }
    if (aNum) return -1;
    if (bNum) return 1;
    return a.localeCompare(b);
  });
}

function walkMinutesToStation(point, stationIndex) {
  const settings = currentTravelSettings();
  const station = state.data.stations[stationIndex];
  const mid = [(point[0] + station.point[0]) / 2, (point[1] + station.point[1]) / 2];
  if (classifySurface(mid) === "water") return Infinity;
  return distance(point, station.point) / settings.walkingSpeed + state.data.meta.stationAccessPenalty;
}

function nearestStations(point, count) {
  const settings = currentTravelSettings();
  return state.data.stations
    .map((station, index) => {
      const mid = [(point[0] + station.point[0]) / 2, (point[1] + station.point[1]) / 2];
      const walkMinutes = classifySurface(mid) === "water"
        ? Infinity
        : distance(point, station.point) / settings.walkingSpeed + state.data.meta.stationAccessPenalty;
      return { index, name: station.name, walkMinutes };
    })
    .filter(s => s.walkMinutes < Infinity)
    .sort((a, b) => a.walkMinutes - b.walkMinutes)
    .slice(0, count);
}

function nextDeparture(rsi, absoluteTimeMinutes) {
  const deps = state.data.routeStopSchedules?.[state.selectedDayType]?.[rsi];
  if (!deps || !deps.length) return Infinity;
  let lo = 0, hi = deps.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (deps[mid] < absoluteTimeMinutes) lo = mid + 1; else hi = mid;
  }
  return lo < deps.length ? deps[lo] : deps[0] + 1440;
}

function runDijkstra(origin) {
  const settings = currentTravelSettings();
  const stateCount = state.data.routeStates.length;
  const distances = new Array(stateCount).fill(Infinity);
  const prev = new Array(stateCount).fill(-1);
  const visited = new Array(stateCount).fill(false);
  const seeds = nearestStations(origin.point, state.data.meta.originStationCount);

  const useSchedule = state.selectedTimeMinutes !== null && state.selectedDayType !== null;
  const queryTime = state.selectedTimeMinutes ?? 0;

  for (const seed of seeds) {
    if (seed.walkMinutes > MAX_WALK_TO_STATION_MINUTES) continue;
    for (const routeStateIndex of state.data.stationStates[seed.index] || []) {
      const arrivalAtStation = origin.swimMinutes + seed.walkMinutes;
      let waitMinutes;
      if (useSchedule) {
        const dep = nextDeparture(routeStateIndex, queryTime + arrivalAtStation);
        waitMinutes = dep === Infinity ? Infinity : dep - (queryTime + arrivalAtStation);
      } else {
        const routeId = state.data.routeStates[routeStateIndex].routeId;
        const boardingDelta =
          (state.data.routeWaits?.[routeId] ?? state.travelSettingsDefaults.transitTime) -
          state.travelSettingsDefaults.transitTime;
        waitMinutes = settings.transitTime + boardingDelta;
      }
      distances[routeStateIndex] = Math.min(distances[routeStateIndex], arrivalAtStation + waitMinutes);
    }
  }

  for (let step = 0; step < stateCount; step += 1) {
    let current = -1;
    let best = Infinity;
    for (let index = 0; index < stateCount; index += 1) {
      if (!visited[index] && distances[index] < best) {
        best = distances[index];
        current = index;
      }
    }
    if (current === -1) break;
    visited[current] = true;
    for (const edge of state.dynamicAdjacency[current]) {
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

  return { distances, prev, seeds };
}

function traceOptimalPath(origin, dijkstraResult, destinationPoint) {
  const { distances, prev } = dijkstraResult;
  const settings = currentTravelSettings();
  const routeStates = state.data.routeStates;
  const stations = state.data.stations;
  const destination = normalizeTravelPoint(destinationPoint);

  let bestTotal = Infinity;
  let bestExitRsi = -1;
  let bestExitSi = -1;
  const nearby = nearestStations(destination.point, state.data.meta.cellNearestStations);
  for (const station of nearby) {
    if (station.walkMinutes > MAX_WALK_TO_STATION_MINUTES) continue;
    const walkOut = station.walkMinutes + destination.swimMinutes;
    for (const rsi of state.data.stationStates[station.index] || []) {
      const total = distances[rsi] + walkOut;
      if (total < bestTotal) { bestTotal = total; bestExitRsi = rsi; bestExitSi = station.index; }
    }
  }

  const pureWalk = distance(origin.point, destination.point) / settings.walkingSpeed + origin.swimMinutes + destination.swimMinutes;
  if (pureWalk < bestTotal) return { steps: [{ kind: "walk", stationName: null, minutes: pureWalk }], totalMinutes: pureWalk };
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

  for (let i = 1; i < path.length; i++) {
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

function renderOptimalPathAccordion() {
  const result = state.optimalPathResult;
  if (!result) return "";
  const showClock = state.selectedTimeMinutes !== null && state.selectedDayType !== null;
  let clock = state.selectedTimeMinutes ?? 0;
  const stepsHtml = result.steps.map((step) => {
    const stepStart = clock;
    clock += step.minutes;
    const timeTag = showClock
      ? `<span class="route-step-clock">${formatClock(stepStart)}–${formatClock(clock)}</span>`
      : "";
    if (step.kind === "walk") {
      return `<li class="route-comparison-step route-comparison-step-walk">${timeTag}Walk ${formatMinutes(step.minutes)}${step.stationName ? ` · <strong>${escapeHtml(step.stationName)}</strong>` : ""}</li>`;
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
  return `
    <details class="optimal-path-accordion">
      <summary class="optimal-path-summary">✨ Answer key <span class="optimal-path-total">${formatMinutes(result.totalMinutes)}</span></summary>
      <ol class="route-comparison-steps">${stepsHtml}</ol>
    </details>
  `;
}

function evaluateRouteOption(originPoint, destinationPoint, routeIds) {
  if (!routeIds.length) return null;
  const settings = currentTravelSettings();
  const routeStates = state.data.routeStates;
  const stations = state.data.stations;
  const N = routeIds.length;

  for (const routeId of routeIds) {
    if (!state.routeStationIndex.has(routeId)) {
      return { viable: false, reason: `Unknown route: ${routeId}` };
    }
  }

  // Check walk from origin to first route
  let bestEntryWalk = Infinity;
  for (const si of state.routeStationIndex.get(routeIds[0])) {
    const w = walkMinutesToStation(originPoint, si);
    if (w < bestEntryWalk) bestEntryWalk = w;
  }
  if (bestEntryWalk > MAX_WALK_TO_STATION_MINUTES) {
    return { viable: false, reason: `Origin is too far from any ${routeIds[0]} station (${formatMinutes(bestEntryWalk)} walk)` };
  }

  // Check walk from last route to destination
  const destNormalized = normalizeTravelPoint(destinationPoint);
  let bestExitWalk = Infinity;
  for (const si of state.routeStationIndex.get(routeIds[N - 1])) {
    const w = walkMinutesToStation(destNormalized.point, si) + destNormalized.swimMinutes;
    if (w < bestExitWalk) bestExitWalk = w;
  }
  if (bestExitWalk > MAX_WALK_TO_STATION_MINUTES) {
    return { viable: false, reason: `Destination is too far from any ${routeIds[N - 1]} station (${formatMinutes(bestExitWalk)} walk)` };
  }

  // Constrained Dijkstra: state = (routeStateIndex, phaseIndex)
  const rsCount = routeStates.length;
  const totalNodes = rsCount * N;
  const dist = new Float64Array(totalNodes).fill(Infinity);
  const prev = new Int32Array(totalNodes).fill(-1);
  const visited = new Uint8Array(totalNodes);

  // Seed: all route states for routeIds[0] reachable from origin
  const useSchedule = state.selectedTimeMinutes !== null && state.selectedDayType !== null;
  const queryTime = state.selectedTimeMinutes ?? 0;

  for (const si of state.routeStationIndex.get(routeIds[0])) {
    const w = walkMinutesToStation(originPoint, si);
    if (w > MAX_WALK_TO_STATION_MINUTES) continue;
    for (const rsi of state.data.stationStates[si] || []) {
      if (routeStates[rsi].routeId !== routeIds[0]) continue;
      let waitMinutes;
      if (useSchedule) {
        const dep = nextDeparture(rsi, queryTime + w);
        waitMinutes = dep === Infinity ? Infinity : dep - (queryTime + w);
      } else {
        const boardingDelta =
          (state.data.routeWaits?.[routeIds[0]] ?? state.travelSettingsDefaults.transitTime) -
          state.travelSettingsDefaults.transitTime;
        waitMinutes = settings.transitTime + boardingDelta;
      }
      const d = w + waitMinutes;
      const node = rsi * N + 0;
      if (d < dist[node]) { dist[node] = d; }
    }
  }

  // Dijkstra over (rsi, phase) nodes
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

    for (const edge of state.dynamicAdjacency[rsi]) {
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
        const walkTime =
          edge.kind === "interchange"
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

  // Find best terminal: any (rsi, N-1) on last route + walk to destination
  let bestTotal = Infinity;
  let bestTerminalNode = -1;
  let bestExitSi = -1;
  for (const si of state.routeStationIndex.get(routeIds[N - 1])) {
    const w = walkMinutesToStation(destNormalized.point, si) + destNormalized.swimMinutes;
    for (const rsi of state.data.stationStates[si] || []) {
      if (routeStates[rsi].routeId !== routeIds[N - 1]) continue;
      const node = rsi * N + (N - 1);
      const total = dist[node] + w;
      if (total < bestTotal) {
        bestTotal = total;
        bestTerminalNode = node;
        bestExitSi = si;
      }
    }
  }

  if (!Number.isFinite(bestTotal)) {
    // Determine which phase failed
    for (let ph = 0; ph < N - 1; ph += 1) {
      let anyReached = false;
      for (let rsi = 0; rsi < rsCount; rsi += 1) {
        if (dist[rsi * N + ph] < Infinity) { anyReached = true; break; }
      }
      if (!anyReached && ph > 0) {
        return { viable: false, reason: `No transfer found between ${routeIds[ph - 1]} and ${routeIds[ph]}` };
      }
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

  // Reconstruct path
  const path = [];
  let node = bestTerminalNode;
  while (node !== -1) {
    const ph = node % N;
    const rsi = (node - ph) / N;
    path.push({ rsi, phase: ph });
    node = prev[node];
  }
  path.reverse();

  // Build journey steps
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
      // Phase transition — emit ride then transfer
      const transferSi = routeStates[path[i - 1].rsi].stationIndex;
      steps.push({ kind: "ride", routeId: routeIds[lastPhase], from: rideStartName, to: stations[transferSi].name, minutes: rideDist });
      steps.push({ kind: "transfer", at: stations[transferSi].name, from: routeIds[lastPhase], to: routeIds[phase], minutes: edgeDist });
      rideStartName = stations[routeStates[rsi].stationIndex].name;
      rideDist = 0;
      lastPhase = phase;
    }
  }

  // Final ride segment
  const exitStation = stations[bestExitSi];
  const actualExitWalk = walkMinutesToStation(destNormalized.point, bestExitSi) + destNormalized.swimMinutes;
  steps.push({ kind: "ride", routeId: routeIds[N - 1], from: rideStartName, to: exitStation.name, minutes: rideDist });
  steps.push({ kind: "walk", stationName: exitStation.name, minutes: actualExitWalk });

  // Key station indices: entry, each transfer, exit
  const pathStationIndices = [routeStates[path[0].rsi].stationIndex];
  for (let i = 1; i < path.length; i += 1) {
    if (path[i].phase !== path[i - 1].phase) {
      pathStationIndices.push(routeStates[path[i - 1].rsi].stationIndex);
    }
  }
  pathStationIndices.push(bestExitSi);

  return { viable: true, steps, totalMinutes: bestTotal, pathStationIndices, routeIds };
}

function renderComparisonResult(seq, i) {
  if (!state.originPoint || !state.probePoint || seq.length === 0) return "";
  const ev = state.routeOptionEvals[i] ?? evaluateRouteOption(state.originPoint, state.probePoint, seq);
  if (!ev.viable) {
    return `<p class="route-comparison-unviable">${escapeHtml(ev.reason)}</p>`;
  }
  const showClock = state.selectedTimeMinutes !== null && state.selectedDayType !== null;
  let clock = state.selectedTimeMinutes ?? 0;
  const stepsHtml = ev.steps.map((step) => {
    const stepStart = clock;
    clock += step.minutes;
    const timeTag = showClock
      ? `<span class="route-step-clock">${formatClock(stepStart)}–${formatClock(clock)}</span>`
      : "";
    if (step.kind === "walk") {
      return `<li class="route-comparison-step route-comparison-step-walk">${timeTag}Walk ${formatMinutes(step.minutes)} · <strong>${escapeHtml(step.stationName)}</strong></li>`;
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
  return `
    <div class="route-comparison-total">Total: <strong>${formatMinutes(ev.totalMinutes)}</strong></div>
    <ol class="route-comparison-steps">${stepsHtml}</ol>
  `;
}

function renderComparisonRows() {
  return state.routeOptions.map((seq, i) => {
    const isActive = i === state.activeRouteOptionIndex;
    const seqHtml = seq.length === 0
      ? '<span class="route-comparison-placeholder">Tap a route below to add it</span>'
      : seq.map((id, j) =>
          (j > 0 ? '<span class="route-comparison-arrow" aria-hidden="true">→</span>' : "") +
          renderRouteBadge(id),
        ).join("");
    const resultHtml = renderComparisonResult(seq, i);
    return `
      <div class="route-comparison${isActive ? " is-active" : ""}" data-index="${i}">
        <div class="route-comparison-head">
          <button class="route-comparison-sequence-btn" type="button" data-action="focus" data-index="${i}" aria-label="Select route option ${i + 1}">
            ${seqHtml}
          </button>
          <button class="route-comparison-remove" type="button" data-action="remove" data-index="${i}" aria-label="Remove option ${i + 1}">×</button>
        </div>
        ${resultHtml ? `<div class="route-comparison-result">${resultHtml}</div>` : ""}
      </div>
    `;
  }).join("");
}

function syncRouteBuilderPanel() {
  const activeSeq = state.routeOptions[state.activeRouteOptionIndex] ?? [];
  const hasActiveRoutes = activeSeq.length > 0;

  if (state.originPoint && state.probePoint) {
    state.routeOptionEvals = state.routeOptions.map((seq) =>
      seq.length > 0 ? evaluateRouteOption(state.originPoint, state.probePoint, seq) : null
    );
    const normalizedOrigin = normalizeTravelPoint(state.originPoint);
    const dijkstraResult = runDijkstra(normalizedOrigin);
    state.optimalPathResult = traceOptimalPath(normalizedOrigin, dijkstraResult, state.probePoint);
  } else {
    state.routeOptionEvals = state.routeOptions.map(() => null);
    state.optimalPathResult = null;
  }
  if (optimalAccordionContainer) optimalAccordionContainer.innerHTML = renderOptimalPathAccordion();
  state.dirty = true;
  requestDraw();

  for (const [comparisonsEl, undoBtn, addBtn] of [
    [routeComparisons, undoRouteBtn, addComparisonBtn],
    [mobileRouteComparisons, mobileUndoRouteBtn, mobileAddComparisonBtn],
  ]) {
    if (comparisonsEl) comparisonsEl.innerHTML = renderComparisonRows();
    if (undoBtn) undoBtn.hidden = !hasActiveRoutes;
    if (addBtn) addBtn.hidden = !hasActiveRoutes;
  }
}

function addRouteToActiveSequence(routeId) {
  const idx = state.activeRouteOptionIndex;
  state.routeOptions = state.routeOptions.map((seq, i) =>
    i === idx ? [...seq, routeId] : seq,
  );
  syncRouteBuilderPanel();
}

function undoLastRoute() {
  const idx = state.activeRouteOptionIndex;
  state.routeOptions = state.routeOptions.map((seq, i) =>
    i === idx ? seq.slice(0, -1) : seq,
  );
  syncRouteBuilderPanel();
}

function removeSequence(index) {
  state.routeOptions = state.routeOptions.filter((_, i) => i !== index);
  if (state.routeOptions.length === 0) state.routeOptions = [[]];
  state.activeRouteOptionIndex = Math.min(
    state.activeRouteOptionIndex,
    state.routeOptions.length - 1,
  );
  syncRouteBuilderPanel();
}

function addNewComparison() {
  state.routeOptions = [...state.routeOptions, []];
  state.activeRouteOptionIndex = state.routeOptions.length - 1;
  syncRouteBuilderPanel();
}

function setActiveSequence(index) {
  state.activeRouteOptionIndex = index;
  syncRouteBuilderPanel();
}

function initRoutePalette(paletteEl) {
  if (!paletteEl || !state.routeStationIndex) return;
  const routeIds = sortRouteIds(state.routeStationIndex.keys());
  paletteEl.innerHTML = routeIds.map((routeId) => {
    const style = state.data.routeStyles?.[routeId];
    const label = style?.label ?? routeId;
    const bg = style?.color ?? "#5a6e84";
    const fg = style?.textColor ?? "#ffffff";
    return `<button class="route-palette-btn" type="button" data-route-id="${escapeHtml(routeId)}" style="background-color:${bg};color:${fg}" aria-label="Add ${label}">${escapeHtml(label)}</button>`;
  }).join("");
  paletteEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".route-palette-btn");
    if (btn) addRouteToActiveSequence(btn.dataset.routeId);
  });
}

function renderRouteBadge(routeId) {
  const style = state.data.routeStyles?.[routeId];
  const label = style?.label ?? routeId;
  const background = style?.color ?? "#5a6e84";
  const color = style?.textColor ?? "#ffffff";
  return `<span class="route-badge" style="background-color:${background};color:${color}">${escapeHtml(label)}</span>`;
}

function drawMap(drawCtx, width, height) {
  drawPanelBackground(drawCtx, width, height);
  if (!state.transform) return;

  const transform = offsetTransform(state.transform, state.panOffsetPx[0], state.panOffsetPx[1]);
  const projectPoint = (point) => transform.toScreen(point);
  state.currentRender = { transform, anchorOffset: [0, 0], projectPoint };

  drawExternalLand(drawCtx, projectPoint);
  drawCityBasemap(drawCtx, projectPoint);
  drawStations(drawCtx, projectPoint);
  drawBoroughLabels(drawCtx, projectPoint);

  if (state.originPoint) {
    const originScreen = projectPoint(state.originPoint);
    drawEmojiMarker(drawCtx, ...originScreen, "📍", 26);
    drawPinnedLabel(drawCtx, originScreen, currentOriginSummary());
  } else if (state.cursorScreen && state.placingOrigin) {
    drawEmojiMarker(drawCtx, ...state.cursorScreen, "📍", 22);
  }

  if (state.probePoint) {
    drawEmojiMarker(drawCtx, ...projectPoint(state.probePoint), "🎯", 26);
  } else if (state.cursorScreen && (state.placingDestination || state.mobileDragTarget === "new-probe")) {
    drawEmojiMarker(drawCtx, ...state.cursorScreen, "🎯", 22);
  }

  drawRoutePath(drawCtx, projectPoint);

  const activeProbePoint = state.probePoint || (state.isMobile ? null : state.cursorPoint);
  if (state.originPoint && activeProbePoint) {
    statusText.textContent = "Origin pinned";
    const activeEval = state.routeOptionEvals?.[state.activeRouteOptionIndex];
    if (activeEval?.viable) {
      mapDistanceOverlay.hidden = false;
      const walkMins = activeEval.steps.filter(s => s.kind === "walk").reduce((a, s) => a + s.minutes, 0);
      const rideMins = activeEval.steps.filter(s => s.kind === "ride").reduce((a, s) => a + s.minutes, 0);
      const waitMins = activeEval.steps.filter(s => s.kind === "wait" || s.kind === "transfer").reduce((a, s) => a + s.minutes, 0);
      const seq = activeEval.routeIds;
      mapDistanceRoute.textContent = `🚆 ${seq.join("→")}: ${formatMinutes(activeEval.totalMinutes)} (${Math.round(rideMins)}m train + ${Math.round(waitMins)}m wait + ${Math.round(walkMins)}m walk)`;
      mapDistanceRoute.hidden = false;
    } else {
      mapDistanceOverlay.hidden = true;
    }
  } else {
    mapDistanceOverlay.hidden = true;
    statusText.textContent = state.originPoint ? "Origin pinned" : "Set an origin to compare routes.";
  }

  syncMobileSheet();
}

function drawRoutePath(drawCtx, projectPoint) {
  const activeEval = state.routeOptionEvals?.[state.activeRouteOptionIndex];
  if (!activeEval?.viable || !activeEval.pathStationIndices?.length) return;
  const indices = activeEval.pathStationIndices;
  const last = indices.length - 1;
  for (let k = 0; k <= last; k++) {
    const si = indices[k];
    const station = state.data.stations[si];
    if (!station) continue;
    const [sx, sy] = projectPoint(station.point);
    const emoji = k === 0 ? "🚶" : k === last ? "🏁" : "🔄";
    drawEmojiMarker(drawCtx, sx, sy, emoji, 18);
  }
}

function drawEmojiMarker(drawCtx, sx, sy, emoji, size = 20) {
  drawCtx.save();
  drawCtx.font = `${size}px serif`;
  drawCtx.textAlign = "center";
  drawCtx.textBaseline = "middle";
  drawCtx.shadowColor = "white";
  drawCtx.shadowBlur = 10;
  // Draw twice to build up the white halo
  drawCtx.fillText(emoji, sx, sy);
  drawCtx.fillText(emoji, sx, sy);
  // Clean pass on top
  drawCtx.shadowBlur = 0;
  drawCtx.fillText(emoji, sx, sy);
  drawCtx.restore();
}

function drawMarker(drawCtx, screenPoint, color, glowRadius, radius, glowAlpha = 0.5) {
  const [sx, sy] = screenPoint;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const halo = drawCtx.createRadialGradient(sx, sy, 2, sx, sy, glowRadius);
  halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowAlpha})`);
  halo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  drawCtx.fillStyle = halo;
  drawCtx.beginPath();
  drawCtx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
  drawCtx.fill();

  drawCtx.beginPath();
  drawCtx.arc(sx, sy, radius, 0, Math.PI * 2);
  drawCtx.fillStyle = "#fff7ef";
  drawCtx.fill();
  drawCtx.lineWidth = 2;
  drawCtx.strokeStyle = color;
  drawCtx.stroke();
}


function drawHoverTooltip(drawCtx, screenPoint, label) {
  const [sx, sy] = screenPoint;
  drawCtx.save();
  drawCtx.font = '700 13px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  drawCtx.textAlign = "center";
  drawCtx.textBaseline = "middle";

  const metrics = drawCtx.measureText(label);
  const paddingX = 10;
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = 28;
  const boxX = clamp(sx - boxWidth / 2, 12, drawCtx.canvas.clientWidth - boxWidth - 12);
  const boxY = clamp(sy + 16, 12, drawCtx.canvas.clientHeight - boxHeight - 12);

  drawCtx.fillStyle = "rgba(23, 48, 77, 0.92)";
  drawCtx.beginPath();
  drawCtx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
  drawCtx.fill();

  drawCtx.fillStyle = "#fff8ef";
  drawCtx.fillText(label, boxX + boxWidth / 2, boxY + boxHeight / 2 + 0.5);
  drawCtx.restore();
}

function drawPinnedLabel(drawCtx, screenPoint, label, options = {}) {
  const {
    offsetX = 18,
    offsetY = -20,
    align = "left",
  } = options;
  const [sx, sy] = screenPoint;
  drawCtx.save();
  drawCtx.font = '700 13px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  drawCtx.textAlign = "left";
  drawCtx.textBaseline = "middle";

  const metrics = drawCtx.measureText(label);
  const paddingX = 10;
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = 28;
  const desiredX = align === "right" ? sx - offsetX - boxWidth : sx + offsetX;
  const boxX = clamp(desiredX, 12, drawCtx.canvas.clientWidth - boxWidth - 12);
  const boxY = clamp(sy + offsetY, 12, drawCtx.canvas.clientHeight - boxHeight - 12);

  drawCtx.fillStyle = "rgba(255, 248, 239, 0.96)";
  drawCtx.beginPath();
  drawCtx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
  drawCtx.fill();
  drawCtx.strokeStyle = "rgba(23, 48, 77, 0.14)";
  drawCtx.lineWidth = 1;
  drawCtx.stroke();

  drawCtx.fillStyle = "#17304d";
  drawCtx.fillText(label, boxX + paddingX, boxY + boxHeight / 2 + 0.5);
  drawCtx.restore();
}

function roundRectPath(drawCtx, x, y, width, height, radius) {
  drawCtx.beginPath();
  drawCtx.roundRect(x, y, width, height, radius);
}

function formatCoordLabel(point) {
  if (!point) return null;
  const { lon, lat } = worldToLonLat(point);
  return `${lat.toFixed(4)}°N, ${Math.abs(lon).toFixed(4)}°W`;
}

function setPlacingOrigin(active) {
  state.placingOrigin = active;
  if (active && state.placingDestination) {
    state.placingDestination = false;
    if (setDestinationBtn) { setDestinationBtn.classList.remove("active"); setDestinationBtn.textContent = "Map"; }
    mapCanvas.classList.remove("placing-dest");
  }
  if (setOriginBtn) {
    setOriginBtn.classList.toggle("active", active);
    setOriginBtn.textContent = active ? "✕" : "Map";
  }
  mapCanvas.classList.toggle("placing-origin", active);
}

function setPlacingDestination(active) {
  state.placingDestination = active;
  if (active && state.placingOrigin) {
    state.placingOrigin = false;
    if (setOriginBtn) { setOriginBtn.classList.remove("active"); setOriginBtn.textContent = "Map"; }
    mapCanvas.classList.remove("placing-origin");
  }
  if (setDestinationBtn) {
    setDestinationBtn.classList.toggle("active", active);
    setDestinationBtn.textContent = active ? "✕" : "Map";
  }
  mapCanvas.classList.toggle("placing-dest", active);
}

function syncPinSummary() {
  if (!state.data) return;
  const hasOrigin = Boolean(state.originPoint);
  const hasProbe = Boolean(state.probePoint);

  if (originAddressInput && document.activeElement !== originAddressInput) {
    originAddressInput.value = hasOrigin
      ? (state.originLabel || formatCoordLabel(state.originPoint))
      : "";
  }
  if (destAddressInput && document.activeElement !== destAddressInput) {
    destAddressInput.value = hasProbe
      ? (state.probeLabel || formatCoordLabel(state.probePoint))
      : "";
  }
  if (clearOriginBtn) clearOriginBtn.hidden = !hasOrigin;
  if (clearDestBtn) clearDestBtn.hidden = !hasProbe;
  if (setDestinationBtn) setDestinationBtn.hidden = !hasOrigin;
}

function currentOriginSummary(fallbackStationName = "NYC subway") {
  if (state.originLabel) return shortOriginLabel(state.originLabel);
  return `Near ${fallbackStationName}`;
}

function exportShareImage() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1080;
  exportCanvas.height = 1240;
  const exportCtx = exportCanvas.getContext("2d");

  const bg = exportCtx.createLinearGradient(0, 0, 0, exportCanvas.height);
  bg.addColorStop(0, "#fbf5ea");
  bg.addColorStop(1, "#f2eadb");
  exportCtx.fillStyle = bg;
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  exportCtx.fillStyle = "rgba(215, 92, 46, 0.1)";
  exportCtx.beginPath();
  exportCtx.arc(180, 150, 180, 0, Math.PI * 2);
  exportCtx.fill();
  exportCtx.fillStyle = "rgba(40, 112, 129, 0.08)";
  exportCtx.beginPath();
  exportCtx.arc(930, 190, 210, 0, Math.PI * 2);
  exportCtx.fill();

  exportCtx.fillStyle = "#d75c2e";
  exportCtx.font = '700 28px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  exportCtx.fillText("TRANSIT TIME CARTOGRAM", 72, 86);

  exportCtx.fillStyle = "#17304d";
  exportCtx.font = '700 58px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  exportCtx.fillText("New York City", 72, 146);

  const normalizedOrigin = state.originPoint ? normalizeTravelPoint(state.originPoint) : null;

  const cardX = 50;
  const cardY = 198;
  const cardSize = 980;
  roundRectPath(exportCtx, cardX, cardY, cardSize, cardSize, 38);
  exportCtx.fillStyle = "rgba(255, 252, 247, 0.92)";
  exportCtx.fill();
  exportCtx.strokeStyle = "rgba(23, 48, 77, 0.1)";
  exportCtx.lineWidth = 2;
  exportCtx.stroke();

  const inset = 28;
  const mapX = cardX + inset;
  const mapY = cardY + inset;
  const mapSize = cardSize - inset * 2;
  const sourceWidthCss = mapCanvas.clientWidth;
  const sourceHeightCss = mapCanvas.clientHeight;
  const sourceSquareCss = Math.min(sourceWidthCss, sourceHeightCss);
  const sourceXCss = (sourceWidthCss - sourceSquareCss) / 2;
  const sourceYCss = (sourceHeightCss - sourceSquareCss) / 2;
  const sourceScaleX = mapCanvas.width / Math.max(sourceWidthCss, 1);
  const sourceScaleY = mapCanvas.height / Math.max(sourceHeightCss, 1);
  roundRectPath(exportCtx, mapX, mapY, mapSize, mapSize, 28);
  exportCtx.save();
  exportCtx.clip();
  exportCtx.drawImage(
    mapCanvas,
    sourceXCss * sourceScaleX,
    sourceYCss * sourceScaleY,
    sourceSquareCss * sourceScaleX,
    sourceSquareCss * sourceScaleY,
    mapX,
    mapY,
    mapSize,
    mapSize,
  );
  if (state.originPoint && state.currentRender?.projectPoint) {
    const originScreen = state.currentRender.projectPoint(state.originPoint);
    drawPinnedLabel(
      exportCtx,
      [
        mapX + ((originScreen[0] - sourceXCss) / sourceSquareCss) * mapSize,
        mapY + ((originScreen[1] - sourceYCss) / sourceSquareCss) * mapSize,
      ],
      currentOriginSummary(),
    );
  }
  exportCtx.restore();

  exportCtx.fillStyle = "#17304d";
  exportCtx.font = '700 24px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  exportCtx.fillText("nyc-cartogram", 72, 1202);

  exportCtx.textAlign = "right";
  exportCtx.fillStyle = "#5f6f7f";
  exportCtx.font = '500 12px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  exportCtx.fillText("Data: MTA GTFS, NYC Open Data, OpenStreetMap", 1008, 1202);
  exportCtx.textAlign = "left";

  return exportCanvas;
}

async function downloadShareImage() {
  shareButton.disabled = true;
  try {
    requestDraw();
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    const exportCanvas = exportShareImage();
    const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Failed to create share image.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nyc-commute-cartogram-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
  } finally {
    shareButton.disabled = false;
  }
}

function closeSharePanel() {
  sharePanel.hidden = true;
  shareButton.setAttribute("aria-expanded", "false");
}

function setSearchMetaText(text) {
  for (const ui of searchUis) {
    ui.meta.textContent = text;
  }
}

function setSearchBusy(isBusy) {
  for (const ui of searchUis) {
    ui.button.disabled = isBusy;
    ui.button.textContent = isBusy ? "Searching" : "Search";
  }
}

function setAddressInputs(value) {
  for (const ui of searchUis) {
    ui.input.value = value;
  }
}

function closeSettingsMenus(exceptMenu = null) {
  for (const menu of settingsMenus) {
    if (menu === exceptMenu) continue;
    menu.open = false;
  }
}

function openSharePanel() {
  const shareUrl = getShareUrl();
  const shareTitle = document.title;
  const shareText = getShareText();
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${shareTitle} — ${shareText}`);

  shareXAction.href = `https://x.com/intent/post?url=${encodedUrl}&text=${encodedText}`;
  shareFacebookAction.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  shareLinkedInAction.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  shareNativeRow.hidden = !navigator.share;
  sharePanel.hidden = false;
  shareButton.setAttribute("aria-expanded", "true");
}

function toggleSharePanel() {
  if (sharePanel.hidden) {
    openSharePanel();
    return;
  }
  closeSharePanel();
}

function requestDraw() {
  if (!state.ready || !state.dirty) return;
  state.dirty = false;
  window.requestAnimationFrame(() => {
    const { width, height } = mapCanvas.getBoundingClientRect();
    drawMap(ctx, width, height);
  });
}

function syncZoomControls() {
  if (!zoomInButton || !zoomOutButton) return;
  zoomInButton.disabled = state.viewportScale >= MAX_VIEWPORT_SCALE;
  zoomOutButton.disabled = state.viewportScale <= MIN_VIEWPORT_SCALE;
}

function updateViewportTransform() {
  if (!state.data) return;
  const size = createCanvasBacking(mapCanvas);
  state.transform = buildTransform(
    state.data.meta.bounds,
    size.width,
    size.height,
    PANEL_PADDING,
    state.viewportScale,
    activeViewportCenter(),
  );
  state.dirty = true;
  syncZoomControls();
  syncMobileSheet();
  requestDraw();
}

function setViewportScale(nextScale) {
  const clampedScale = clamp(nextScale, MIN_VIEWPORT_SCALE, MAX_VIEWPORT_SCALE);
  state.viewportScale = clampedScale;
  state.viewportCenter = clampedScale > MIN_VIEWPORT_SCALE ? currentZoomFocusPoint() : null;
  state.panOffsetPx = [0, 0];
  state.pinnedScreen = null;
  syncBrowserUrl();
  updateViewportTransform();
}

function resize() {
  state.isMobile = isMobileLayout();
  updateViewportTransform();
}

function pointerToWorld(event) {
  const rect = mapCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const screenPoint = [x, y];
  if (!state.currentRender) {
    return { screenPoint, worldPoint: state.transform.toWorld(x, y) };
  }
  const worldPoint = state.currentRender.transform.toWorld(x, y);
  return { screenPoint, worldPoint };
}

function screenDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function currentProjectedPinPositions() {
  if (!state.currentRender?.projectPoint) {
    return { originScreen: null, probeScreen: null };
  }
  const originScreen = state.originPoint ? state.currentRender.projectPoint(state.originPoint) : null;
  const probeScreen = state.probePoint ? state.currentRender.projectPoint(state.probePoint) : null;
  return { originScreen, probeScreen };
}

function hitPinTarget(screenPoint, hitRadius = MOBILE_PIN_HIT_RADIUS) {
  const { originScreen, probeScreen } = currentProjectedPinPositions();
  if (probeScreen && screenDistance(screenPoint, probeScreen) <= hitRadius) {
    return "probe";
  }
  if (originScreen && screenDistance(screenPoint, originScreen) <= hitRadius) {
    return "origin";
  }
  return null;
}

function setProbePoint(worldPoint) {
  state.probePoint = worldPoint;
  state.probePinned = Boolean(worldPoint);
  syncRouteBuilderPanel();
  syncPinSummary();
}

function clearProbePoint() {
  state.probePoint = null;
  state.probePinned = false;
  state.probeLabel = null;
  syncRouteBuilderPanel();
  syncBrowserUrl();
  syncPinSummary();
}

function beginPinGesture(pointerId, screenPoint, worldPoint, hitRadius) {
  state.mobilePointerId = pointerId;
  state.mobileGestureStartScreen = screenPoint;
  state.mobileGestureMoved = false;

  const hitTarget = hitPinTarget(screenPoint, hitRadius);
  if (hitTarget) {
    state.mobileDragTarget = hitTarget;
    if (hitTarget === "origin") {
      state.originLabel = null;
      state.originPoint = worldPoint;
      state.pinned = true;
    } else if (hitTarget === "probe") {
      setProbePoint(worldPoint);
    }
    state.cursorScreen = screenPoint;
    state.cursorPoint = worldPoint;
  } else if (state.placingOrigin) {
    state.mobileDragTarget = "new-origin";
    state.originLabel = null;
    state.originPoint = worldPoint;
    state.pinned = false;
    clearProbePoint();
    setPlacingOrigin(false);
    state.cursorScreen = screenPoint;
    state.cursorPoint = worldPoint;
  } else if (state.placingDestination) {
    state.mobileDragTarget = "new-probe";
    setProbePoint(worldPoint);
    setPlacingDestination(false);
    state.cursorScreen = screenPoint;
    state.cursorPoint = worldPoint;
  } else {
    state.mobileDragTarget = "pan";
    state.panStartScreen = screenPoint;
    state.panBaseOffset = state.panOffsetPx.slice();
  }

  state.showPinHint = false;
  state.dirty = true;
}

function updatePinGesture(screenPoint, worldPoint, tapSlop) {
  state.mobileGestureMoved =
    state.mobileGestureMoved ||
    screenDistance(state.mobileGestureStartScreen || screenPoint, screenPoint) > tapSlop;

  if (state.mobileDragTarget === "pan") {
    state.panOffsetPx = [
      state.panBaseOffset[0] + screenPoint[0] - state.panStartScreen[0],
      state.panBaseOffset[1] + screenPoint[1] - state.panStartScreen[1],
    ];
    state.dirty = true;
    requestDraw();
    return;
  }

  state.cursorScreen = screenPoint;
  state.cursorPoint = worldPoint;

  if (state.mobileDragTarget === "origin" || state.mobileDragTarget === "new-origin") {
    state.originLabel = null;
    state.originPoint = worldPoint;
  } else if (state.mobileDragTarget === "probe" || state.mobileDragTarget === "new-probe") {
    setProbePoint(worldPoint);
  }

  state.dirty = true;
  requestDraw();
}

function handleMobilePointerDown(event) {
  if (!state.isMobile) return;
  closeSharePanel();
  closeSettingsMenus();

  const { screenPoint, worldPoint } = pointerToWorld(event);
  if (!withinBounds(worldPoint)) return;
  beginPinGesture(event.pointerId, screenPoint, worldPoint, MOBILE_PIN_HIT_RADIUS);
  mapCanvas.setPointerCapture(event.pointerId);
  requestDraw();
}

function handleMobilePointerMove(event) {
  if (!state.isMobile || state.mobilePointerId !== event.pointerId || !state.mobileDragTarget) return;
  const { screenPoint, worldPoint } = pointerToWorld(event);
  if (!withinBounds(worldPoint)) return;
  updatePinGesture(screenPoint, worldPoint, MOBILE_PIN_TAP_SLOP);
}

function resetMobileGestureState() {
  state.mobilePointerId = null;
  state.mobileDragTarget = null;
  state.mobileGestureStartScreen = null;
  state.mobileGestureMoved = false;
}

function handleMobilePointerUp(event) {
  if (!state.isMobile || state.mobilePointerId !== event.pointerId || !state.mobileDragTarget) return;

  const dragTarget = state.mobileDragTarget;
  const moved = state.mobileGestureMoved;

  if (dragTarget === "pan") {
    try { mapCanvas.releasePointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    resetMobileGestureState();
    return;
  }

  if (dragTarget === "origin" && !moved) {
    clearPinnedOrigin();
  } else if (dragTarget === "probe" && !moved) {
    clearProbePoint();
    state.dirty = true;
    requestDraw();
  } else {
    if (dragTarget === "origin" || dragTarget === "new-origin") {
      state.pinned = true;
      state.pinnedPoint = state.originPoint ? state.originPoint.slice() : null;
      state.pinnedScreen = state.cursorScreen ? state.cursorScreen.slice() : null;
      syncBrowserUrl();
    } else if (dragTarget === "probe" || dragTarget === "new-probe") {
      state.probePinned = true;
      syncBrowserUrl();
    }
    state.dirty = true;
    syncMobileSheet();
    requestDraw();
  }

  state.cursorScreen = null;
  state.cursorPoint = null;
  try {
    mapCanvas.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.error(error);
  }
  resetMobileGestureState();
}

function handleMobilePointerCancel(event) {
  if (!state.isMobile || state.mobilePointerId !== event.pointerId) return;
  state.cursorScreen = null;
  state.cursorPoint = null;
  resetMobileGestureState();
  state.dirty = true;
  requestDraw();
}

function handleDesktopPointerDown(event) {
  if (state.isMobile) return;
  closeSharePanel();
  closeSettingsMenus();

  const { screenPoint, worldPoint } = pointerToWorld(event);
  if (!withinBounds(worldPoint)) return;
  beginPinGesture(event.pointerId, screenPoint, worldPoint, DESKTOP_PIN_HIT_RADIUS);
  mapCanvas.setPointerCapture(event.pointerId);
  requestDraw();
}

function handleDesktopPointerMove(event) {
  if (state.isMobile) return;
  // Active gesture
  if (state.mobilePointerId === event.pointerId && state.mobileDragTarget) {
    const { screenPoint, worldPoint } = pointerToWorld(event);
    if (!withinBounds(worldPoint)) return;
    updatePinGesture(screenPoint, worldPoint, DESKTOP_PIN_TAP_SLOP);
    return;
  }
  // Hover preview — only when placing destination or no origin yet
  if (!state.mobileDragTarget && state.currentRender && state.data) {
    const { screenPoint, worldPoint } = pointerToWorld(event);
    if (state.placingDestination || state.placingOrigin) {
      state.cursorScreen = screenPoint;
      state.cursorPoint = worldPoint;
    } else {
      state.cursorScreen = null;
      state.cursorPoint = null;
    }
    state.dirty = true;
    requestDraw();
  }
}

function handleDesktopPointerUp(event) {
  if (state.isMobile || state.mobilePointerId !== event.pointerId || !state.mobileDragTarget) return;

  const dragTarget = state.mobileDragTarget;
  const moved = state.mobileGestureMoved;

  if (dragTarget === "pan") {
    try { mapCanvas.releasePointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    resetMobileGestureState();
    return;
  }

  if (dragTarget === "origin" && !moved) {
    clearPinnedOrigin();
  } else if (dragTarget === "probe" && !moved) {
    clearProbePoint();
    state.dirty = true;
    requestDraw();
  } else {
    if (dragTarget === "origin" || dragTarget === "new-origin") {
      state.pinned = true;
      state.pinnedPoint = state.originPoint ? state.originPoint.slice() : null;
      state.pinnedScreen = null;
      syncBrowserUrl();
    } else if (dragTarget === "probe" || dragTarget === "new-probe") {
      state.probePinned = true;
      syncBrowserUrl();
    }
    state.dirty = true;
    syncMobileSheet();
    requestDraw();
  }

  state.cursorScreen = null;
  state.cursorPoint = null;
  try {
    mapCanvas.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.error(error);
  }
  resetMobileGestureState();
}

function handleDesktopPointerCancel(event) {
  if (state.isMobile || state.mobilePointerId !== event.pointerId) return;
  state.cursorScreen = null;
  state.cursorPoint = null;
  resetMobileGestureState();
  state.dirty = true;
  requestDraw();
}

function withinBounds(point) {
  const [minX, minY, maxX, maxY] = state.data.meta.bounds;
  return point[0] >= minX && point[0] <= maxX && point[1] >= minY && point[1] <= maxY;
}

function syncFullscreenButton() {
  const isFullscreen = document.fullscreenElement === panelCard;
  panelCard.classList.toggle("is-immersive", isFullscreen);
  const label = isFullscreen ? "Exit full screen" : "Enter full screen";
  fullscreenButton.setAttribute("aria-label", label);
  fullscreenButton.setAttribute("title", label);
}

function clearSearchResults() {
  for (const ui of searchUis) {
    ui.results.innerHTML = "";
  }
}

function setPinnedOrigin(worldPoint) {
  state.originPoint = worldPoint;
  state.pinnedPoint = worldPoint;
  state.pinnedScreen = null;
  state.pinned = true;
  state.cursorPoint = worldPoint;
  syncBrowserUrl();
  syncRouteBuilderPanel();
  syncPinSummary();
  state.dirty = true;
  syncMobileSheet();
  requestDraw();
}

function clearPinnedOrigin() {
  state.pinned = false;
  state.pinnedPoint = null;
  state.pinnedScreen = null;
  if (state.placingDestination) setPlacingDestination(false);
  if (state.placingOrigin) setPlacingOrigin(false);
  clearProbePoint();
  state.cursorScreen = null;
  state.cursorPoint = null;
  state.originPoint = null;
  state.originLabel = null;
  syncBrowserUrl();
  syncRouteBuilderPanel();
  syncPinSummary();
  state.dirty = true;
  syncMobileSheet();
  requestDraw();
}

function syncMobileSheet() {
  if (!mobileOriginTitle || !mobileStatusText || !mobileClearButton) return;

  if (!state.pinned || !state.originPoint) {
    mobileOriginTitle.textContent = state.cursorScreen ? "Release to pin the origin" : "Drag to set origin";
    mobileStatusText.textContent = "Touch and drag on the map to place your starting point.";
    mobileClearButton.hidden = true;
    return;
  }

  mobileOriginTitle.textContent = state.originLabel || "Pinned origin";
  mobileStatusText.textContent = state.probePoint
    ? "Drag either pin to reposition it. Tap a pin without dragging to remove it."
    : 'Origin pinned. Drag on the map to place a destination pin.';
  mobileClearButton.hidden = false;
}

function renderSearchResults(results) {
  clearSearchResults();
  if (!results.length) {
    setSearchMetaText("No NYC address matches found.");
    return;
  }
  setSearchMetaText("Choose a result to pin the origin there.");
  const markup = results
    .map(
      (result, index) => `
        <button class="search-result" type="button" data-result-index="${index}">
          <strong>${escapeHtml(result.title)}</strong>
          <span>${escapeHtml(result.subtitle)}</span>
        </button>
      `,
    )
    .join("");

  for (const ui of searchUis) {
    ui.results.innerHTML = markup;
    for (const button of ui.results.querySelectorAll(".search-result")) {
      button.addEventListener("click", () => {
        const result = results[Number(button.dataset.resultIndex)];
        const worldPoint = lonLatToWorld(result.lon, result.lat);
        if (!withinBounds(worldPoint)) {
          setSearchMetaText("That result fell outside the current NYC map bounds.");
          return;
        }
        setAddressInputs(result.title);
        setSearchMetaText(`Pinned origin to ${result.title}.`);
        clearSearchResults();
        state.originLabel = shortOriginLabel(result.title);
        setPinnedOrigin(worldPoint);
      });
    }
  }
}

function lonLatToWorld(lon, lat) {
  const metersPerDegLat = 111_320.0;
  const metersPerDegLon = metersPerDegLat * Math.cos((state.data.meta.lat0 * Math.PI) / 180);
  return [lon * metersPerDegLon, lat * metersPerDegLat];
}

// How we might implement address and point to point mapping.
async function searchAddress(query) {
  const params = new URLSearchParams({
    q: `${query}, New York City`,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "us",
    limit: "5",
    bounded: "1",
    viewbox: "-74.30,40.95,-73.65,40.45",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }
  const payload = await response.json();
  return payload.map((item) => ({
    title: item.display_name.split(",").slice(0, 2).join(",").trim(),
    subtitle: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
  }));
}

function setLocateButtonsBusy(isBusy) {
  const label = isBusy ? "Locating…" : "Use My Location";
  for (const button of [mobileLocateButton]) {
    if (!button) continue;
    button.disabled = isBusy;
    button.textContent = label;
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    setSearchMetaText("Location access is not available on this device.");
    return;
  }

  setLocateButtonsBusy(true);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLocateButtonsBusy(false);
      const worldPoint = lonLatToWorld(position.coords.longitude, position.coords.latitude);
      if (!withinBounds(worldPoint)) {
        setSearchMetaText("That location falls outside the current NYC map bounds.");
        return;
      }
      state.originLabel = "My location";
      setPinnedOrigin(worldPoint);
      setSearchMetaText("Pinned origin to your current location.");
    },
    (error) => {
      console.error(error);
      setLocateButtonsBusy(false);
      setSearchMetaText("Could not access your location. Check permissions and try again.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    },
  );
}

async function init() {
  const response = await fetch(DATA_URL);
  state.data = await response.json();
  state.travelSettingsDefaults = getTravelSettingsDefaults();
  state.travelSettings = sanitizeTravelSettings(loadStoredTravelSettings(), state.travelSettingsDefaults);
  state.dynamicAdjacency = buildDynamicAdjacency();
  state.routeStationIndex = buildRouteStationIndex();
  state.isMobile = isMobileLayout();
  state.ready = true;

  const manhattan = state.data.boroughs.find((borough) => borough.name === "Manhattan");
  state.cursorPoint = null;
  state.originPoint = null;

  const sharedView = parseSharedView();
  if (sharedView.zoom) {
    state.viewportScale = sharedView.zoom;
  }
  if (sharedView.origin) {
    const restoredPoint = lonLatToWorld(sharedView.origin.lon, sharedView.origin.lat);
    if (withinBounds(restoredPoint)) {
      state.originPoint = restoredPoint;
      state.pinnedPoint = restoredPoint;
      state.cursorPoint = restoredPoint;
      state.pinned = true;
      if (sharedView.probe) {
        const restoredProbe = lonLatToWorld(sharedView.probe.lon, sharedView.probe.lat);
        if (withinBounds(restoredProbe)) {
          state.probePoint = restoredProbe;
          state.probePinned = true;
        }
      }
    }
  }

  syncRouteBuilderPanel();
  syncPinSummary();
  syncTravelSettingsInputs();
  syncZoomControls();

  resize();
  window.addEventListener("resize", resize);

  for (const menu of settingsMenus) {
    menu.addEventListener("toggle", () => {
      if (menu.open) {
        closeSharePanel();
        closeSettingsMenus(menu);
      }
    });
  }

  for (const input of settingsInputs) {
    input.addEventListener("input", () => {
      const key = input.dataset.settingKey;
      const unit = input.dataset.settingUnit;
      if (!key || !unit) return;
      const rawValue = Number(input.value);
      if (!Number.isFinite(rawValue)) {
        syncTravelSettingsInputs();
        return;
      }
      const current = currentTravelSettings();
      const nextSettings = {
        ...current,
        [key]: unit === "mph" ? mphToMetersPerMinute(rawValue) : rawValue,
      };
      applyTravelSettings(nextSettings);
    });
  }

  for (const button of settingsResetButtons) {
    button.addEventListener("click", () => {
      applyTravelSettings(state.travelSettingsDefaults);
    });
  }

  for (const button of settingsSaveButtons) {
    button.addEventListener("click", () => {
      const menu = button.closest(".settings-menu");
      if (menu) {
        menu.open = false;
      }
    });
  }

  mapCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state.isMobile) {
      handleMobilePointerDown(event);
      return;
    }
    handleDesktopPointerDown(event);
  });

  mapCanvas.addEventListener("pointermove", (event) => {
    if (state.isMobile) {
      handleMobilePointerMove(event);
      return;
    }
    handleDesktopPointerMove(event);
  });

  mapCanvas.addEventListener("pointerup", (event) => {
    event.preventDefault();
    if (state.isMobile) {
      handleMobilePointerUp(event);
      return;
    }
    handleDesktopPointerUp(event);
  });

  mapCanvas.addEventListener("pointercancel", (event) => {
    if (state.isMobile) {
      handleMobilePointerCancel(event);
      return;
    }
    handleDesktopPointerCancel(event);
  });

  mapCanvas.addEventListener("pointerleave", () => {
    closeSharePanel();
    if (state.isMobile || state.mobileDragTarget) return;
    state.cursorScreen = null;
    state.cursorPoint = null;
    state.dirty = true;
    requestDraw();
  });

  zoomOutButton.addEventListener("click", () => {
    closeSharePanel();
    closeSettingsMenus();
    setViewportScale(state.viewportScale / VIEWPORT_ZOOM_STEP);
  });

  zoomInButton.addEventListener("click", () => {
    closeSharePanel();
    closeSettingsMenus();
    setViewportScale(state.viewportScale * VIEWPORT_ZOOM_STEP);
  });

  fullscreenButton.addEventListener("click", async () => {
    closeSharePanel();
    closeSettingsMenus();
    try {
      if (document.fullscreenElement === panelCard) {
        await document.exitFullscreen();
      } else {
        await panelCard.requestFullscreen();
      }
    } catch (error) {
      console.error(error);
    } finally {
      syncFullscreenButton();
      resize();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    syncFullscreenButton();
    resize();
  });

  shareButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeSettingsMenus();
    toggleSharePanel();
  });

  nativeShareAction.addEventListener("click", async () => {
    try {
      await navigator.share({
        title: document.title,
        text: getShareText(),
        url: getShareUrl(),
      });
      closeSharePanel();
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error(error);
        setSearchMetaText("Could not open the share sheet. Try another option.");
      }
    }
  });

  downloadImageAction.addEventListener("click", () => {
    closeSharePanel();
    downloadShareImage().catch((error) => {
      console.error(error);
      setSearchMetaText("Could not save the image. Try again.");
      shareButton.disabled = false;
    });
  });

  shareInstagramAction.addEventListener("click", async () => {
    closeSharePanel();
    try {
      await navigator.clipboard.writeText(getShareUrl());
      await downloadShareImage();
      setSearchMetaText("Image downloaded and link copied for Instagram.");
    } catch (error) {
      console.error(error);
      setSearchMetaText("Could not prep the Instagram share. Try again.");
      shareButton.disabled = false;
    }
  });

  for (const link of [shareXAction, shareFacebookAction, shareLinkedInAction]) {
    link.addEventListener("click", () => {
      closeSharePanel();
    });
  }

  document.addEventListener("click", (event) => {
    const clickedInsideShare = sharePanel.contains(event.target) || shareButton.contains(event.target);
    if (!sharePanel.hidden && !clickedInsideShare) {
      closeSharePanel();
    }

    const clickedInsideSettings = settingsMenus.some(
      (menu) => menu.contains(event.target),
    );
    if (!clickedInsideSettings) {
      closeSettingsMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sharePanel.hidden) {
      closeSharePanel();
    }
    if (event.key === "Escape") {
      closeSettingsMenus();
    }
  });

  for (const ui of searchUis) {
    ui.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = ui.input.value.trim();
      if (!query) {
        setSearchMetaText("Enter an NYC address to search.");
        clearSearchResults();
        return;
      }

      setSearchBusy(true);
      setSearchMetaText("Looking up NYC address matches…");
      clearSearchResults();

      try {
        const results = await searchAddress(query);
        renderSearchResults(results);
      } catch (error) {
        console.error(error);
        setSearchMetaText("Address lookup failed. Try a more specific NYC address.");
      } finally {
        setSearchBusy(false);
      }
    });
  }

  originSearchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = originAddressInput.value.trim();
    if (!query) {
      originSearchMeta.hidden = false;
      originSearchMeta.textContent = "Enter an NYC address to search.";
      originSearchResults.innerHTML = "";
      return;
    }
    originSearchButton.disabled = true;
    originSearchMeta.hidden = false;
    originSearchMeta.textContent = "Looking up address…";
    originSearchResults.innerHTML = "";
    try {
      const results = await searchAddress(query);
      if (!results.length) {
        originSearchMeta.textContent = "No NYC address matches found.";
        return;
      }
      originSearchMeta.textContent = "Choose a result to pin the origin.";
      originSearchResults.innerHTML = results.map((r, idx) => `
        <button class="search-result" type="button" data-result-index="${idx}">
          <strong>${escapeHtml(r.title)}</strong>
          <span>${escapeHtml(r.subtitle)}</span>
        </button>
      `).join("");
      for (const btn of originSearchResults.querySelectorAll(".search-result")) {
        btn.addEventListener("click", () => {
          const result = results[Number(btn.dataset.resultIndex)];
          const worldPoint = lonLatToWorld(result.lon, result.lat);
          if (!withinBounds(worldPoint)) {
            originSearchMeta.textContent = "That result fell outside the current NYC map bounds.";
            return;
          }
          originAddressInput.value = result.title;
          originSearchMeta.textContent = `Origin pinned to ${result.title}.`;
          originSearchResults.innerHTML = "";
          state.originLabel = shortOriginLabel(result.title);
          setPinnedOrigin(worldPoint);
          setAddressInputs(result.title);
        });
      }
    } catch (err) {
      console.error(err);
      originSearchMeta.textContent = "Address lookup failed. Try a more specific NYC address.";
    } finally {
      originSearchButton.disabled = false;
    }
  });

  destSearchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = destAddressInput.value.trim();
    if (!query) {
      destSearchMeta.hidden = false;
      destSearchMeta.textContent = "Enter an NYC address to search.";
      destSearchResults.innerHTML = "";
      return;
    }
    destSearchButton.disabled = true;
    destSearchMeta.hidden = false;
    destSearchMeta.textContent = "Looking up address…";
    destSearchResults.innerHTML = "";
    try {
      const results = await searchAddress(query);
      if (!results.length) {
        destSearchMeta.textContent = "No NYC address matches found.";
        return;
      }
      destSearchMeta.textContent = "Choose a result to pin the destination.";
      destSearchResults.innerHTML = results.map((r, idx) => `
        <button class="search-result" type="button" data-result-index="${idx}">
          <strong>${escapeHtml(r.title)}</strong>
          <span>${escapeHtml(r.subtitle)}</span>
        </button>
      `).join("");
      for (const btn of destSearchResults.querySelectorAll(".search-result")) {
        btn.addEventListener("click", () => {
          const result = results[Number(btn.dataset.resultIndex)];
          const worldPoint = lonLatToWorld(result.lon, result.lat);
          if (!withinBounds(worldPoint)) {
            destSearchMeta.textContent = "That result fell outside the current NYC map bounds.";
            return;
          }
          destAddressInput.value = result.title;
          destSearchMeta.textContent = `Destination pinned to ${result.title}.`;
          destSearchResults.innerHTML = "";
          state.probeLabel = result.title;
          setProbePoint(worldPoint);
          syncBrowserUrl();
        });
      }
    } catch (err) {
      console.error(err);
      destSearchMeta.textContent = "Address lookup failed. Try a more specific NYC address.";
    } finally {
      destSearchButton.disabled = false;
    }
  });

  // Time picker
  document.querySelectorAll(".day-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.day;
      if (state.selectedDayType === day) return;
      document.querySelectorAll(".day-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.selectedDayType = day;
      timePickerInput.disabled = false;
      if (state.selectedTimeMinutes === null) {
        const [h, m] = timePickerInput.value.split(":").map(Number);
        state.selectedTimeMinutes = h * 60 + m;
      }
      clearTimeBtn.hidden = false;
      state.dirty = true;
      requestDraw();
      syncRouteBuilderPanel();
    });
  });

  timePickerInput?.addEventListener("change", () => {
    if (!state.selectedDayType) return;
    const [h, m] = timePickerInput.value.split(":").map(Number);
    state.selectedTimeMinutes = h * 60 + m;
    state.dirty = true;
    requestDraw();
    syncRouteBuilderPanel();
  });

  clearTimeBtn?.addEventListener("click", () => {
    state.selectedDayType = null;
    state.selectedTimeMinutes = null;
    document.querySelectorAll(".day-pill").forEach((b) => b.classList.remove("active"));
    timePickerInput.disabled = true;
    clearTimeBtn.hidden = true;
    state.dirty = true;
    requestDraw();
    syncRouteBuilderPanel();
  });

  setOriginBtn?.addEventListener("click", () => setPlacingOrigin(!state.placingOrigin));
  setDestinationBtn?.addEventListener("click", () => setPlacingDestination(!state.placingDestination));
  clearOriginBtn?.addEventListener("click", () => clearPinnedOrigin());
  clearDestBtn?.addEventListener("click", () => { clearProbePoint(); state.dirty = true; requestDraw(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (state.placingOrigin) setPlacingOrigin(false);
      else if (state.placingDestination) setPlacingDestination(false);
    }
  });

  mobileClearButton.addEventListener("click", () => {
    clearPinnedOrigin();
    setSearchMetaText("Origin cleared. Tap the map or search for a new starting point.");
  });

  mobileLocateButton.addEventListener("click", () => {
  
    useCurrentLocation();
  });

  mobileShareButton.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: getShareText(),
          url: getShareUrl(),
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error(error);
          setSearchMetaText("Could not open the share sheet. Try the share icon instead.");
        }
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setSearchMetaText("Share link copied to your clipboard.");
    } catch (error) {
      console.error(error);
      setSearchMetaText("Could not copy the share link. Try again.");
    }
  });

  mobileSheetToggle.addEventListener("click", () => {
    if (state.mobileDrawerDidSwipe) {
      state.mobileDrawerDidSwipe = false;
      return;
    }
    setDrawerCollapsed(!state.drawerCollapsed);
  });

  mobileSheetToggle.addEventListener("pointerdown", (event) => {
    beginMobileDrawerGesture(event);
  });

  mobileSheetToggle.addEventListener("pointermove", (event) => {
    updateMobileDrawerGesture(event);
  });

  mobileSheetToggle.addEventListener("pointerup", (event) => {
    endMobileDrawerGesture(event);
  });

  mobileSheetToggle.addEventListener("pointercancel", (event) => {
    cancelMobileDrawerGesture(event);
  });

  for (const [addBtn, undoBtn, comparisonsEl] of [
    [addComparisonBtn, undoRouteBtn, routeComparisons],
    [mobileAddComparisonBtn, mobileUndoRouteBtn, mobileRouteComparisons],
  ]) {
    addBtn?.addEventListener("click", addNewComparison);
    undoBtn?.addEventListener("click", undoLastRoute);
    comparisonsEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      if (btn.dataset.action === "focus") setActiveSequence(idx);
      if (btn.dataset.action === "remove") removeSequence(idx);
    });
  }

  document.addEventListener("click", (e) => {
    const collapseBtn = e.target.closest(".nearest-route-collapse-btn");
    if (collapseBtn) {
      collapseBtn.closest(".nearest-route-panel")?.classList.toggle("is-collapsed");
    }
  });

  initRoutePalette(routePalette);
  initRoutePalette(mobileRoutePalette);

  setupFooterEmojiBursts();
  syncFullscreenButton();
  syncMobileSheet();

  setDrawerCollapsed(true);
}

init().catch((error) => {
  console.error(error);
  statusText.textContent = "Failed to load transit map data.";
});
