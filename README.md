# NYC Transit Trivia Judge

An interactive NYC subway route comparison tool. Pin an origin and destination, then build competing subway route options to compare their travel times side by side.


## What It Does

- Place an origin pin and a destination pin on the NYC subway map
- Build route sequences from the subway line palette (e.g. A → C → E)
- Compare multiple route options: walk + ride + transfer breakdowns with times
- Schedule-aware routing: set a departure day and time to get clock-accurate results
- Pan and zoom the static geographic basemap
- Search for NYC addresses to place pins
- Share deep links to a view

The app uses MTA GTFS data for station locations, route shapes, and departure schedules. Walking access to and from stations is modeled with a configurable walk speed. The Staten Island Ferry connection is included; buses and regional rail are not.

## Requirements

- Python 3 (standard library only — no install step)
- `pnpm` and Node.js only if you want to run or deploy the Cloudflare Worker

## Build The Site Data

Run:

```bash
python3 build_commute_site_data.py
```

Output:

```text
site/data/commute_map_data.json
```

This produces the compact data bundle consumed by `site/app.js`. It includes stations, route states, adjacency graph, route schedules, route styles, and wait-time calibrations.

## Local Preview

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/site/
```

Notes:

- Address search uses OpenStreetMap Nominatim, so it requires internet access.
- Production-style URLs like `/nyc/@40.71267,-73.92366` are not available on plain static localhost. Use query-string sharing there instead.

## Cloudflare Worker Dev And Deploy

Install the Worker tooling:

```bash
pnpm install
```

Run the Worker locally:

```bash
pnpm run dev
```

Deploy:

```bash
pnpm run deploy
```

The Worker rewrites asset paths from `site/` and falls back to `site/index.html` for pretty origin routes.

If Wrangler postinstall steps were blocked on first install, run `pnpm approve-builds` before deploying.

## Project Layout

- `build_commute_site_data.py` — builds the site data bundle from MTA GTFS and geo sources
- `site/index.html` — app shell
- `site/app.js` — route comparison logic, map rendering, address search, sharing
- `site/styles.css` — site styles
- `site/data/commute_map_data.json` — generated dataset (not committed)
- `src/worker.js` — Cloudflare Worker entrypoint

## Notes

- Travel times use a constrained Dijkstra that only allows the routes in the selected sequence, so comparisons are apples-to-apples across options.
- Borough labels are placed from each borough's largest polygon to keep them stable for fragmented geometries.
- Share icons from [Iconmonstr](https://iconmonstr.com/).
