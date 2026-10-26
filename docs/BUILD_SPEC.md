# HeadsUp — Live Disruption & Safety Alerts (hyperDart component)

> **This file is a build brief for Claude (Claude Code or any coding agent).**
> Read it top to bottom before writing code. Build in the order given in §12.
> When the build is finished, move this file to `docs/BUILD_SPEC.md` and write the
> real submission `README.md` described in §14.
> Source of truth for requirements: `Live_Disruption_Safety_Alerts_Problem_Statement.pdf` (summarised in §0.1).
> §16 lists facts verified against the live API / local toolchain — they override older text in this brief.

---

## Build progress

Update this checklist as each phase in §12 is completed. One phase at a time.

| # | Phase | Status | Notes |
|---|---|---|---|
| 1 | Scaffold & verify, `.gitignore`, live NWS call, fixtures | ✅ Done | Template copied non-interactively (React **19**, `demovideo`). Real searchData captured from the hyperDart NLU; 11 NWS fixtures. See §16. |
| 2 | Pure logic in `lib/` + Vitest | ✅ Done | 79 tests passing (`npm test`) |
| 3 | Core UI, all §6 states, theming, `componentLoaded`, manual matrix | ✅ Done | Matrix automated with headless Chrome: 6 example queries × 2 formats × 3 themes, no errors, `componentLoaded` ×1, no overflow |
| 4 | Timeline ribbon with scrubbing | ✅ Done | Drag + keyboard (←/→, PgUp/PgDn, Home, End), live readout |
| 5 | Map (lazy) | ✅ Done | Plain Leaflet loaded with `import()`; Esri gray canvas (CARTO now needs a key) |
| 6 | Polish (motion, a11y, chips, auto-refresh, verified official links) | ✅ Done | Agency URLs checked for HTTP 200 |
| 7 | Stretch: live non-US source (only if 1–6 solid) | ✅ Done | Environment Canada (MSC GeoMet OGC API, CORS-enabled) |
| 8 | Ship: final README, GitHub, video, config links, publish | 🟡 Partly | README written, publish validation verified with placeholder links. **Author to do:** git repo + push, video, fill `github`/`demovideo`, Partner Portal package + token, `npm publish` |

Environment (checked 2026-10-26): Node v24.21.0, npm 11.19.0, git 2.50.1, macOS. Folder is **not** a git repo yet.

Current folder contents (pre-scaffold): `README.md` (this brief), `hyperdart.config.js` (template config with the organisers' keywords/regex — see §16 for fixes it needs), `Live_Disruption_Safety_Alerts_Problem_Statement.pdf`.

**Layout decision:** the repo root must be the component root (the `github` link must point at the repo root, and `hyperdart.config.js` / `package.json` live there). Scaffold into a temporary subfolder, move its contents up into this folder, keep our edited `hyperdart.config.js` merged with the template's, and move the PDF to `docs/`.

---

## 0. Goal in one sentence

When someone searches "weather alerts in Houston", "is there a heat advisory in Phoenix" or
"alerts near me", answer **"Is anything happening there right now, how serious, where exactly,
and until when?"** in under 2 seconds, from official data only, and never give false reassurance.

## 0.1 Problem statement summary (from the PDF)

**Minimum requirements:** active alerts for a place (what, how serious, where exactly, until when) · specific hazards (floods, heat, tornadoes…) · "near me" queries using the searcher's location · no alerts and places outside coverage answered honestly, never with false reassurance.

**Suggested extras:** map of where each alert applies · plain-language guidance based on the official instructions · timeline/countdown in the place's local time · other official sources for places outside the US.

> "We're looking for original ideas, a unique design and solid engineering, not a copy of an official bulletin page. The best components answer the question at a glance and then let people dig deeper."

**Required example queries:**

| User query | Component shows |
|---|---|
| weather alerts in Houston | Active alerts for Houston, or a clear "no active alerts" |
| flood warnings in Colorado | Flood warnings across Colorado |
| severe weather alerts in Alaska | Severe alerts across Alaska |
| is there a heat advisory in Phoenix | A direct yes or no, with details if yes |
| weather alerts near me | Alerts for the searcher's location |
| weather alerts in Delhi | An honest answer for a place the data source doesn't cover |

**Example `searchData`** (organiser-provided, trimmed). Note `userLocation.position.countryCode` is nested under `position`:

```json
[{
  "query": "weather alerts in Houston",
  "entities": [{
    "word": "Houston", "collectionName": "CITIES", "collectionType": "HD_LOCATION",
    "entityInfo": { "geo": {
      "lat": 29.76328, "long": -95.36327, "city": "Houston", "state": "Texas", "stateAbb": "TX",
      "country": "United States", "countryCode": "US", "tz": "America/Chicago" } }
  }],
  "userLocation": {
    "position": { "coords": { "latitude": 26.4631, "longitude": 80.3479 }, "countryCode": "IN" },
    "source": "ip"
  }
}]
```

**Submission checklist:**
- [ ] Public GitHub repo with a `.gitignore` (`node_modules`, `dist` — templates don't ship one)
- [ ] Component published to the hyperDart dev registry with plain `npm publish` (validation via `scripts/validate-publish.js` must run)
- [ ] README: idea, design decisions, data sources, libraries, how it was built incl. AI tools used and what the author wrote/changed personally
- [ ] 2–3 min demo video on YouTube
- [ ] `github` (repo root, not a `/tree/main` link) and demo video link set in `hyperdart.config.js`
- [ ] Package created in Partner Portal (My packages → Create package) and token set before first publish

## 1. How we win (judging weights → what we optimise)

| Criterion | Weight | What we do about it |
|---|---|---|
| Design & creativity | 25% | Verdict-first card, a scrubbable **timeline ribbon** (signature interaction), severity "signal bar", polished map; looks right in sidebar **and** mainline, light, dark **and** lightsOut |
| Usefulness & clarity | 20% | First line of the card answers the question in plain words ("Yes — Flash Flood Warning until 9:45 PM CDT"). Details are one tap away |
| Accuracy & responsibility | 15% | Official NWS text only, shown verbatim on demand; correct use of `ends` vs `expires`; honest "no alerts", "outside coverage" and "couldn't check" states that never imply safety |
| Robustness | 15% | Normalised input, coverage check before calling the API, timeouts, one retry, dedupe of updates, empty states, error states; all tested with fixtures |
| Understanding (live review) | 15% | Small, readable modules. Adding a hazard or query pattern = one line in one file (§11) |
| Code quality & README | 10% | Pure logic separated from UI, unit tests, clear README |

**Rule: extra features only count once basics work.** Build the core (§12, phases 1–3) completely before any stretch feature.

---

## 2. Platform facts (from the hyperDart docs — do not deviate)

- Scaffold: `npm create hyper-dart@latest <componentName>` → choose **Framework: React**, variant **React (JavaScript + Vite)**. Frontend-only is enough; NWS allows browser calls, so no backend.
- Stack in template: **React 18.3.1, Vite, MUI v6, Emotion**. Keep it.
- Entry: `src/frontend/index.jsx` exports `withHD(NewComponent)` from `@hyperdart/frontend`. **Never remove `withHD`.** Rename `NewComponent` to `HeadsUp` and keep the wrapper.
- Local dev: `npm install` then `npm start`. The sandbox (`src/sandbox/main.jsx`) renders `<HDSandbox config searchData resource />` with `searchData.json`. The sandbox header lets you type queries to test keywords/regex and switch device sizes and themes.
- Props received (React + Vite): `props.searchData`, `props.UIOptions`, message handlers.
  - `UIOptions.themeName`: `light` | `dark` | `lightsOut`
  - `UIOptions.format`: `sidebar` | `mainline`
  - `UIOptions.sandbox`: `true` locally, `false` in production
- Views: **mainline max width 720px, sidebar max width 420px, recommended height ~600px.** Must be responsive.
- `props.messageHandlers.componentLoaded()` — call **exactly once**, from the top-level component, **after** the verdict has rendered with real data (or a final error/empty state). Not on mount.
- `searchQuery(query)` handler starts a new search. Docs spell it both `props.messageHandler.searchQuery` and `props.messageHandlers.*` — write a helper that tries both (§7.6).
- `searchData` may arrive as **an array or a single object** → always normalise.
- `hyperdart.config.js`: `triggers.keywords`, `query_format.regex` (optional `fallBackRegex`), `client`, `format: { mainline: true, sidebar: true }`, `info`. No `server` block (frontend-only). The current config **does** contain a `server` block pointing at `dist/backend/*` — remove it unless the generated React (frontend-only) template keeps one (see §16).
- Publish: create the package in the Partner Portal first (My packages → Create package), run the token command it shows, scope the package name (`@<your_user_name>/headsup`), `"private": false`, `publishConfig.registry = https://dev-registry.hyperdart.com`, `files: ["hyperdart.config.js","dist","resource.json"]`. Then `npm version patch && npm run build && npm publish`.
- Validation rejects the package if: `client.location` file missing, keywords or regex empty / contain empty strings, demo video not a valid YouTube link, github not a valid GitHub link. **Never** use `--ignore-scripts` or remove `prepublishOnly`.
- The problem statement writes the field as `demovideo`, the docs as `demoVideo`. **Use whichever spelling the generated template already has. Do not rename it.**

Docs: https://hyperdart.com/docs/docs/intro

---

## 3. Data source: NWS Alerts API

```
GET https://api.weather.gov/alerts/active?point={lat},{lon}&status=actual&message_type=alert,update
GET https://api.weather.gov/alerts/active?area={STATE}&status=actual&message_type=alert,update
Header: Accept: application/geo+json
```

- Round lat/lon to **4 decimals**.
- `area` takes state/territory codes (TX, CO, AK, PR, GU, VI, AS, MP…).
- Response is a GeoJSON `FeatureCollection`. `feature.id` / `properties['@id']` is the alert **URL**; `properties.id` is a **URN** (`urn:oid:…`) — see §16. Each `feature.properties` has (among others):
  `id, event, headline, description, instruction, severity (Extreme|Severe|Moderate|Minor|Unknown),
  urgency (Immediate|Expected|Future|Past|Unknown), certainty (Observed|Likely|Possible|Unlikely|Unknown),
  areaDesc, affectedZones[] (URLs), geocode {UGC[], SAME[]}, references[], sent, effective, onset,
  expires, ends, messageType, senderName, response, parameters {NWSheadline[], VTEC[], ...}`.
- `feature.geometry` is often **null** (zone-based alerts). For the map, fetch each URL in
  `affectedZones` (returns a Feature with geometry). Cache by URL, limit concurrency to 4,
  cap at ~25 zones per render, and lazy-load only when the map is visible.
- Errors come back as `application/problem+json` with `title`/`detail`/`status`. Expect 500/503 and throttling.
  The service has quiet days with zero alerts — that is normal, not a bug.
- **Before writing UI, call the API live once** (any state with active alerts) and save real responses as fixtures (§10). Check field names against the live payload; trust the payload over this brief if they differ.
- OpenAPI spec: https://api.weather.gov/openapi.json

### Time semantics (accuracy-critical)

- **`ends`** = when the hazard is expected to end. **`expires`** = when this *message* stops being valid (it may be re-issued).
- "Until when" = `ends`. If `ends` is null → say **"Until further notice"** and, in details, "This bulletin is valid until {expires}; NWS may extend or update it." Never present `expires` as the end of the hazard.
- `onset` (fallback `effective`) in the future → state is **"Starts {time}"**, not "Active".
- Display times in the **place's local time**: use `entityInfo.geo.tz` when present (e.g. `America/Chicago`) with `Intl.DateTimeFormat(…, { timeZone, timeZoneName: 'short' })`. When no tz (state/near-me), format using the UTC offset already in the ISO string and label it "local time". Alaska/multi-tz states: format each alert with its own offset.
- Relative text ("ends in 2 h 15 m") uses `Date.now()` and updates every 60 s.

---

## 4. Query understanding

Write `src/frontend/lib/parseQuery.js` (pure function, unit-tested). Input: normalised searchData. Output:

```js
{
  kind: 'point' | 'state' | 'country' | 'nearMe' | 'none',
  place: { label, lat, lon, stateAbb, countryCode, tz, collectionName },
  hazard: null | 'flood' | 'heat' | 'tornado' | 'winter' | 'wind' | 'fire' | 'hurricane' | 'airQuality' | 'storm' | ...,
  severeOnly: boolean,      // query said "severe"
  yesNo: boolean,           // "is there a/an/any …"
  rawQuery: string
}
```

Rules:
- Normalise: `const sd = Array.isArray(searchData) ? searchData[0] : searchData`. Guard every access with `?.`.
- Pick the first entity with `collectionType === 'HD_LOCATION'`.
  - `CITIES`, `ZIP_CODES`, `COUNTY/DISTRICT_ADMIN2`, `COUNTRIES_CAPITAL` → `point` (use geo lat/long).
  - `STATES_ADMIN1` → `state` (use `stateAbb`; if missing, map the state name to its code via a lookup table).
  - `COUNTRIES` → `country`. For US: national summary (§6.6). For others: outside coverage.
- Query matches `near me|around me|my location` or no location entity → `nearMe` using `sd.userLocation.position.coords` (country from `sd.userLocation.position.countryCode`). If that's missing too → `none`.
- `yesNo = /^\s*(is|are)\s+there\b/i` ; `severeOnly = /\bsevere\b/i`.
- Hazard: match the query against `HAZARDS` (§11) synonyms, longest match first ("flash flood" before "flood", "winter storm" before "storm").
- Note: the geo field is `long`, not `lng`.

### Coverage decision (before any network call)

`NWS_COUNTRIES = ['US','PR','GU','VI','AS','MP','UM']`. If `countryCode` is not in the list → **outside coverage** state (§6.5). Don't call NWS for Delhi.
If the API still returns 400/404 for a point, treat as outside coverage, not as "no alerts".

---

## 5. Data pipeline (`src/frontend/lib/`)

1. `nwsClient.js` — `fetchActiveAlerts({ point | area, signal })`
   - 8 s timeout via `AbortController`, **one** retry after 800 ms for network errors/5xx/429, no retry for 4xx.
   - In-memory cache keyed by URL, 60 s TTL. Returns `{ ok, alerts, fetchedAt, error }`.
   - Never throw into the UI; return a typed error: `'network' | 'timeout' | 'server' | 'outOfBounds' | 'unknown'`.
2. `normalizeAlert.js` — map a feature to a flat object:
   `{ id, event, tier ('warning'|'watch'|'advisory'|'statement'|'other' from the event name), severity, urgency, certainty, headline, nwsHeadline, description, instruction, areaDesc, areas[] (split on ';'), onset, ends, expires, sent, sender, zones[], geometry, status ('active'|'upcoming'|'endingSoon'), raw }`.
3. `dedupe.js` — drop any alert whose `properties.id` (URN) appears as `identifier` in another alert's `references[]` (it was superseded); drop `messageType === 'Cancel'`. `references[]` items are objects `{ '@id', identifier, sender, sent }`, not strings.
4. `rank.js` — sort by: severity (Extreme > Severe > Moderate > Minor > Unknown) → tier (warning > watch > advisory > statement) → urgency (Immediate first) → soonest `onset`.
5. `filterHazard.js` — keep alerts whose `event` matches the hazard family (§11). Keep the **unfiltered** list too: needed for "No flood warnings, but 3 other alerts are active".
6. `group.js` — for state/national views group by `event` with counts and merged areas.

All of `lib/` is plain JS with no React imports → easy to unit test and explain.

---

## 6. UX states (the heart of the judging)

Every state has: a **verdict line**, a **severity signal bar** (top 4px strip in the colour of the worst alert, grey when none), a **source + freshness line** ("National Weather Service · checked 11:54 AM CDT · ↻"), and follow-up chips.

### 6.1 Active alerts (point query)
- Verdict: **"Yes — 2 active alerts for Houston"** then the top alert as a hero:
  `Flash Flood Warning` · `Severe` pill · `In effect until 9:45 PM CDT (in 2 h 10 m)` · areas.
- Below: compact list of other alerts (event, tier pill, until).
- Tap an alert → detail sheet (§6.7).

### 6.2 Hazard-specific query ("flood warnings in Colorado", "is there a heat advisory in Phoenix")
- Matching alerts exist → **"Yes — Flood Warning in 4 Colorado counties"**.
- None match but others exist → **"No flood warnings in Colorado right now."** + second line, same weight: **"But 3 other alerts are active"** with list. Never stop at "No".
- Closely related, *more serious* alert exists (asked "heat advisory", an Extreme Heat Warning is active) → **"No heat advisory — an Extreme Heat Warning is in effect instead, which is more serious."** Implement via the `related`/`escalations` list in §11.
- yes/no queries render the verdict word **Yes / No** large.

### 6.3 Severe-only ("severe weather alerts in Alaska")
- Default filter Severe + Extreme. Toggle "Show all 14 alerts". If zero severe but others exist, say so explicitly.

### 6.4 No alerts
- Verdict: **"No active NWS alerts for Houston as of 11:54 AM CDT."**
- Sub-line (always): "This covers official National Weather Service alerts only. Conditions can change quickly — if you see danger, act on it and follow local officials."
- **Forbidden wording anywhere:** "safe", "all clear", "nothing to worry about", "you're fine", green check icons. Use a neutral grey/blue icon.
- Link: forecast at `https://forecast.weather.gov/MapClick.php?lat={lat}&lon={lon}`.

### 6.5 Outside coverage ("weather alerts in Delhi")
- Verdict: **"We can't check alerts for Delhi here."** Sub-line: "Our live source is the US National Weather Service, which covers the US and its territories only. No result here does **not** mean there are no alerts in Delhi."
- Show a card with the **country's official warning agency** from `src/frontend/data/officialSources.js` (country code → name + URL). Seed with at least: IN (India Meteorological Department, and NDMA SACHET alerts portal), CA (Environment Canada warnings), GB (Met Office warnings), AU (Bureau of Meteorology warnings), JP (JMA warnings), EU countries → MeteoAlarm, fallback → WMO Severe Weather Information Centre. **Verify every URL loads before committing.**
- If the user's own location is in the US, offer a chip "Alerts near me".

### 6.6 National US query ("weather alerts in the United States")
- Call `alerts/active?status=actual&message_type=alert,update&severity=Extreme,Severe`. Show counts by event and the top states; no giant list. Chip: "Pick a state or city for details".

### 6.7 Alert detail sheet (dig deeper)
- Plain summary first: what, how serious (severity + certainty + urgency in words: "Severe · Observed · Act now"), where (area chips), when (start → end, local time).
- **"What to do now"** — bullets built **only by splitting the official `instruction` text into sentences** (no rewriting, no AI). Label: "From the official NWS instructions". If `instruction` is null, say "No specific instructions were issued. Follow local officials."
- Collapsible **"Official bulletin"** with `headline`, `description`, `instruction` verbatim, `senderName`, `sent`, and a link to the alert's API URL — use `feature.id` or `properties['@id']` as-is (`properties.id` is a URN, not a URL; see §16).
- Short glossary tooltip: Warning = happening/imminent, act now · Watch = conditions possible, be prepared · Advisory = less serious, use caution.

### 6.8 Near me
- Header shows "Near you (approximate, based on your network)" when `userLocation.source === 'ip'`.
- Button "Use precise location" → `navigator.geolocation` inside try/catch (iframes may block it); on failure keep the IP result silently with a small note.
- If the user is outside coverage (e.g., India IP) → §6.5 using their country.

### 6.9 Loading and errors
- Skeleton of the verdict line (not a spinner) for up to 8 s.
- API failure → **"Couldn't reach the National Weather Service, so we can't confirm whether alerts are active."** Retry button + link to weather.gov. **Never** show the "no alerts" state on failure.
- No location at all → "Which place?" with chips (Houston, Phoenix, Colorado, Near me) that call `searchQuery`.

### 6.10 Freshness
- Auto-refresh every 120 s only while `document.visibilityState === 'visible'`. Show "Updated just now / 3 min ago". Manual ↻.

---

## 7. Design spec

### 7.1 Concept
"Answer first, then explore." The top 120px must answer all four questions without scrolling. Everything else is progressive disclosure.

### 7.2 Signature interaction: Timeline ribbon (build this well — it's our "unique design")
- Horizontal track from now−2 h to the latest `ends` (cap 72 h; "+" marker if beyond).
- One bar per alert (or per event group), coloured by severity; warnings solid, watches **striped**, advisories outlined → readable without colour.
- A vertical **"Now"** line. The user can **drag/scrub a time handle**; the verdict line updates: "At 9:00 PM tonight: 1 alert in effect". Keyboard: ←/→ moves 1 h, Home = now. Tick labels in local time.
- Mainline: full width below the hero. Sidebar: collapsed to a single 28px ribbon with tap-to-expand.

### 7.3 Map
- `react-leaflet` v4 (React 18) + CARTO basemaps (`light_all` / `dark_all` per theme) with required attribution. Lazy-load with `React.lazy` so it never delays the verdict.
- Draw alert polygons (feature geometry or fetched zone geometry) in severity colours with patterns matching the ribbon; a pin for the searched place / user location. Tapping a polygon selects that alert.
- If tiles or geometry fail → hide the map gracefully and show area chips only.
- Sidebar: 160px-tall mini map; mainline: map beside the alert list (≥600px wide) or below it.

### 7.4 Severity palette (own palette, not the NWS colour table)
Define once in `src/frontend/theme/severity.js` with light and dark variants, all ≥4.5:1 contrast for text:
- Extreme — deep magenta/crimson · Severe — red-orange · Moderate — amber · Minor — blue-teal · Unknown — slate · None — neutral grey.
Every coloured element also carries a **text label** and/or icon (MUI icons: `Warning`, `Visibility`, `Info`, plus hazard icons like `Water`, `Thermostat`, `Tornado`, `AcUnit`, `Air`, `LocalFireDepartment`, `Cyclone`).

### 7.5 Theming & layout
- Build the MUI theme from `UIOptions.themeName`: `light`, `dark`, `lightsOut` (true black #000 background, dimmer borders). Background stays transparent where the host expects it; test all three.
- Layout from `UIOptions.format` **and** a `ResizeObserver` on the root (host may resize). Breakpoint: <480px = compact.
- Typography: verdict 22–28px semi-bold; body 14px; tabular numbers for times.
- Motion: subtle (pulse on the "Now" line, 150ms transitions); respect `prefers-reduced-motion`.
- Accessibility: semantic headings, `aria-live="polite"` on the verdict, focus states, all actions keyboard-reachable.

### 7.6 Host integration helper
`src/frontend/lib/host.js`:
```js
export const getHandlers = (props) => props?.messageHandlers ?? props?.messageHandler ?? {};
export const runSearch = (props, q) => getHandlers(props).searchQuery?.(q);
export const signalLoaded = (() => { let done = false; return (props) => { if (!done) { done = true; getHandlers(props).componentLoaded?.(); } }; })();
```
Call `signalLoaded` in a `useEffect` after the first non-loading state renders (success, empty, outside coverage or error).

---

## 8. Component structure

Repo layout (repo root = component root; template-generated names may differ, follow the template):

```
.gitignore  package.json  hyperdart.config.js  resource.json  vite.config.js  README.md
docs/                 # BUILD_SPEC.md (this brief, moved at the end) + problem statement PDF
scripts/              # template's validate-publish.js, do not modify
fixtures/nws/         # saved API responses: city-active, state-many, ends-null, upcoming, empty, error-500
fixtures/searchData/  # sd-*.json from §10.1
src/sandbox/          # template's main.jsx + searchData.json
src/frontend/         # below
dist/                 # build output, gitignored, published
```

- Unit tests sit next to the module they test: `lib/parseQuery.test.js` etc.
- Fixture mode loads fixtures with a dynamic `import()` behind the sandbox check, so demo data never ends up in the production bundle.

```
src/frontend/
  index.jsx                 # export default withHD(HeadsUp)
  HeadsUp.jsx               # top-level: parse → fetch → state machine → layout
  hooks/useAlerts.js        # fetch, retry, refresh, cache
  hooks/useNow.js           # ticking clock (60 s)
  components/
    VerdictHeader.jsx       # verdict, signal bar, freshness line
    AlertHero.jsx
    AlertList.jsx
    TimelineRibbon.jsx      # signature interaction
    AlertMap.jsx            # lazy-loaded
    AlertDetail.jsx         # sheet/drawer with "What to do now" + official bulletin
    OutsideCoverage.jsx
    ErrorState.jsx
    FollowUpChips.jsx
  lib/                      # pure logic, no React (see §5)
    parseQuery.js  nwsClient.js  normalizeAlert.js  dedupe.js  rank.js
    filterHazard.js  group.js  time.js  host.js  hazards.js  states.js
  data/officialSources.js
  theme/makeTheme.js  theme/severity.js
```

State machine in `HeadsUp.jsx`: `idle → loading → (active | noneForHazard | none | outsideCoverage | error | needLocation)`.

---

## 9. hyperdart.config.js

Keep the provided keywords/regex and extend them. Example target (adapt to the template's existing structure and field names):

```js
triggers: {
  keywords: ['weather alerts','weather alert','weather warnings','weather warning','severe weather',
    'tornado warning','flood warning','heat advisory','winter storm warning','safety alerts',
    'flash flood warning','hurricane warning','red flag warning','air quality alert',
    'storm warning','blizzard warning','extreme heat warning','alerts near me'],
},
query_format: {
  regex: [
    // provided by the organisers (keep verbatim)
    '(weather|severe\\s+weather|safety|emergency)\\s+(alerts?|warnings?|advisories)\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
    '(tornado|flood|flash\\s+flood|heat|winter\\s+storm|storm|wind|fire\\s+weather|hurricane|air\\s+quality)\\s+(alerts?|warnings?|watch(es)?|advisor(y|ies))\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
    'is\\s+there\\s+(a|an|any)\\s+.*(warning|alert|watch|advisory)\\s+(in|for|near)\\s+HD_LOCATION(__\\w+)?.*',
    'HD_LOCATION(__\\w+)?\\s+(weather\\s+)?(alerts?|warnings?|advisories).*',
    '(weather\\s+)?(alerts?|warnings?)\\s+(near|around)\\s+me.*',
    // our additions
    '(blizzard|ice\\s+storm|extreme\\s+heat|red\\s+flag|tropical\\s+storm|storm\\s+surge|dust\\s+storm|freeze|frost|high\\s+wind|thunderstorm)\\s+(alerts?|warnings?|watch(es)?|advisor(y|ies))\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
    'any\\s+(weather\\s+)?(alerts?|warnings?)\\s+(in|for|near)\\s+HD_LOCATION(__\\w+)?.*',
    '(is\\s+there\\s+)?(a|an|any)?\\s*.*(warning|alert|watch|advisory)\\s+(near|around)\\s+me.*',
  ],
},
format: { mainline: true, sidebar: true },
```

Test every regex in the sandbox search bar with each example query (§10) before publishing. Remove any pattern that matches non-alert queries.

---

## 10. Testing

### 10.1 Fixtures (`fixtures/`)
Save real API responses early: a city with several alerts, a state with many (dedupe/grouping), an alert with `ends: null`, an upcoming alert (`onset` in the future), an empty FeatureCollection, a problem+json 500. Plus `searchData` variants:

| File | Query |
|---|---|
| `sd-houston.json` | weather alerts in Houston |
| `sd-colorado-flood.json` | flood warnings in Colorado |
| `sd-alaska-severe.json` | severe weather alerts in Alaska |
| `sd-phoenix-heat.json` | is there a heat advisory in Phoenix |
| `sd-near-me-us.json` / `sd-near-me-in.json` | weather alerts near me (US IP / India IP) |
| `sd-delhi.json` | weather alerts in Delhi |
| `sd-object-shape.json` | same as Houston but `searchData` is an object, not an array |
| `sd-no-location.json` | severe weather |

### 10.2 Fixture mode (sandbox only)
`?fixture=<name>` loads a fixture instead of calling NWS **only when `UIOptions.sandbox === true`**. Show a visible "DEMO DATA" badge. Never active in production. This is how the demo video works on a quiet day — say so honestly in the video.

### 10.3 Unit tests (Vitest)
`parseQuery`, `normalizeAlert` (ends vs expires), `dedupe`, `rank`, `filterHazard` (including escalation case), `time` (tz formatting, relative text), coverage decision. Add `"test": "vitest run"`.

### 10.4 Manual matrix before publishing
Every example query × {sidebar, mainline} × {light, dark, lightsOut} × {live, empty fixture, error fixture}. Also: network offline, very long `areaDesc`, 40+ alerts in a state.

---

## 11. Extensibility (live-review insurance)

All hazard knowledge lives in `src/frontend/lib/hazards.js`:

```js
export const HAZARDS = {
  flood:      { label: 'Flood',        synonyms: ['flash flood','flood','flooding'],       eventMatch: /flood/i,                 icon: 'Water' },
  heat:       { label: 'Heat',         synonyms: ['extreme heat','heat'],                  eventMatch: /heat/i,                  icon: 'Thermostat',
                escalations: { 'heat advisory': ['Extreme Heat Warning', 'Extreme Heat Watch', 'Excessive Heat Warning'] } },
  tornado:    { label: 'Tornado',      synonyms: ['tornado'],                              eventMatch: /tornado/i,               icon: 'Tornado' },
  winter:     { label: 'Winter',       synonyms: ['winter storm','blizzard','ice storm','freeze','frost','snow'],
                eventMatch: /winter|blizzard|ice storm|freeze|frost|snow|wind chill|cold/i, icon: 'AcUnit' },
  wind:       { label: 'Wind',         synonyms: ['high wind','wind'],                     eventMatch: /wind/i,                  icon: 'Air' },
  fire:       { label: 'Fire weather', synonyms: ['fire weather','red flag','fire'],       eventMatch: /red flag|fire/i,         icon: 'LocalFireDepartment' },
  hurricane:  { label: 'Tropical',     synonyms: ['hurricane','tropical storm','storm surge'], eventMatch: /hurricane|tropical|storm surge/i, icon: 'Cyclone' },
  airQuality: { label: 'Air quality',  synonyms: ['air quality','smoke'],                  eventMatch: /air quality|smoke|dust/i, icon: 'Masks' },
  storm:      { label: 'Storms',       synonyms: ['thunderstorm','storm'],                 eventMatch: /thunderstorm|storm/i,    icon: 'Thunderstorm' },
};
```

- **Adding a hazard** = one entry here (+ optional regex word in config).
- **Adding a query pattern** = one string in `query_format.regex`, plus a fixture and a test.
- Write this "how to extend" recipe into the final README. The author must be able to do it live in under 2 minutes.

---

## 12. Build order (do not skip ahead)

1. **Scaffold & verify** — create the template, run `npm start`, confirm the sandbox renders. Add `.gitignore` (`node_modules`, `dist`, `.env*`, `stats.html`). Call the NWS API live; save fixtures.
2. **Pure logic + tests** — everything in `lib/` with Vitest passing.
3. **Core UI** — verdict header, hero, list, detail sheet, all states in §6 (active, hazard, severe-only, none, outside coverage, near me, error, need-location). `componentLoaded`. Theming for all three themes, both formats. **Stop and run the full manual matrix.**
4. **Timeline ribbon** with scrubbing.
5. **Map** (lazy).
6. **Polish** — motion, accessibility pass, follow-up chips, auto-refresh, officialSources verified.
7. **Stretch (only if 1–6 are solid):** live non-US source, e.g. Environment and Climate Change Canada's alert data via their OGC API, *only* if it is official, CORS-enabled from the browser and returns structured alerts. Verify before building. Otherwise keep the honest link-out.
8. **Ship** — final README (§14), push to public GitHub, record video (§13), set `github` + demo video fields, `npm version patch && npm run build && npm publish`.

Bundle budget: keep `dist/index.modern.js` lean; map code in a separate lazy chunk. Check with the template's `rollup-plugin-visualizer`.

---

## 13. Demo video (2–3 min) outline

1. 0:00 — The problem in one line; type "weather alerts in Houston" → verdict appears.
2. 0:20 — Hazard query + yes/no query ("is there a heat advisory in Phoenix"), including the "No — but…" case.
3. 0:50 — Scrub the timeline ribbon; tap a map polygon; open detail → "What to do now" + official bulletin.
4. 1:30 — Responsibility: no-alerts wording, Delhi outside-coverage card, API-failure state (toggle network off).
5. 2:00 — Sidebar vs mainline, light/dark/lightsOut.
6. 2:20 — Architecture in 20 s (lib vs components; add a hazard in one line).
If live data is quiet that day, say so and switch to labelled fixture mode.

---

## 14. Final submission README.md (write at the end, replacing this file)

Sections: Idea · Screenshots/GIF (sidebar + mainline, light + dark) · How it answers the 4 questions · Design decisions (verdict-first, timeline ribbon, no-false-reassurance rules, ends vs expires) · Data sources (NWS Alerts API, zone endpoints, CARTO/OSM tiles with attribution, official agency links) · Libraries (React 18, MUI v6, Vite, react-leaflet, Leaflet, Vitest) · Architecture diagram · How to run, test, extend (§11 recipe) · Edge cases handled · Limitations (US-only live coverage, IP location is approximate, NWS outages) · **AI tools used and what the author wrote or changed personally** (be specific and honest) · Links: GitHub, demo video, registry package.

---

## 15. Hard rules for the coding agent

- Never invent alert data, advice or end times. Only official fields, shown faithfully.
- Never show a "no alerts" result when the request failed or the place is outside coverage.
- Never use the words safe / all clear / nothing to worry about.
- Never remove `withHD`, never skip publish validation.
- Keep `lib/` free of React; comment each module's purpose in 1–3 lines at the top.
- Prefer small, readable code over clever code — the author must explain it live.
- If something in this brief conflicts with the live API payload or the generated template, follow the live payload/template and note the change in the final README.

---

## 16. Verified facts & corrections log

Append here whenever something is checked against reality. These override earlier sections.

**2026-10-26 — live NWS call** (`alerts/active?area=TX&status=actual&message_type=alert,update`, 7 alerts, top one a Flash Flood Warning):
- `properties` keys seen: `@id, @type, affectedZones, areaDesc, category, certainty, code, description, effective, ends, event, eventCode, expires, geocode, headline, id, instruction, language, messageType, note, onset, parameters, references, response, scope, sender, senderName, sent, severity, status, urgency, web`. Matches §3, plus `eventCode`, `category`, `scope`, `code`, `language`, `note`, `web`.
- `feature.id` and `properties['@id']` = `https://api.weather.gov/alerts/urn:oid:…` (URL). `properties.id` = `urn:oid:…` (URN). → Corrected §3, §5.3 and §6.7: use `feature.id` for links and `properties.id` for dedupe.
- `references[]` = array of `{ "@id", identifier, sender, sent }`. Dedupe compares `identifier` with `properties.id`.
- `affectedZones` entries look like `https://api.weather.gov/zones/county/TXC141` (county zones, not only forecast zones).
- Times carry their own UTC offset (e.g. `2026-10-26T00:44:00-06:00`), which supports the "use the ISO offset when no tz" rule in §3.
- `ends` can equal `expires`. Still show `ends` as "until", and fall back to "Until further notice" only when `ends` is null.

**2026-10-26 — `hyperdart.config.js` as it is now** (must be fixed during Phase 1, keeping the organisers' regex verbatim):
- `import pkg from './package.json' assert { type: 'json' }` **fails on Node 24** (SyntaxError; tested). `with { type: 'json' }` works. Use whatever the freshly generated template ships with; if it still uses `assert`, switch to `with` (or use Node ≤20 for publishing) and note it in the final README.
- Keywords `'weather alerts '` and `'weather warnings '` have **trailing spaces** — trim them (the PDF lists them without spaces).
- Contains a `server` block (`dist/backend/index.js`, `wrangler.jsonc`, `schema.jsonc`). We are frontend-only → remove it, or validation may look for backend files that won't exist.
- `demoVideo` and `github` are empty strings — fill them in at Phase 8 (field spelling `demoVideo` already in the file → keep it, per §2).
- Our extra keywords/regex from §9 are not added yet.

**Library notes to check during setup:**
- `@mui/icons-material` may not be in the template — install the version matching the template's MUI v6 if needed. `Masks`, `Thunderstorm`, `Tornado`, `Cyclone` exist in that package.
- `react-leaflet@4` is the React 18 line (v5 needs React 19). Import `leaflet/dist/leaflet.css` and fix default marker icon URLs under Vite (or use `CircleMarker`).
- Pick the Vitest major that matches the template's Vite major.
- In a browser `User-Agent` can't be set, so we rely on the browser's own header (NWS allows browser calls).

**2026-10-26 — verified during the build** (these override earlier sections):
- `hyperdart.config.js` was **not** actually in the folder; it came from the template, which already uses `with { type: 'json' }`, has **no** `server` block and spells the field **`demovideo`** (kept).
- The React + Vite template ships **React 19.3** (not 18.3.1), MUI 6.5, Vite 6.4. So: `react-leaflet` v5 would be the matching line, Vitest 3.2 matches Vite 6.
- The scaffolder (`create-hyper-dart@1.0.12`) is interactive only; it just copies `template-react-vite/` and writes `package.json`, which was reproduced exactly.
- Production `withHD.initHD` passes `searchData[0]` (an **object**); the sandbox passes an array. Both handled.
- The sandbox resolves typed queries through `dev.hyperdart.com/nodeapi/search/sandboxNLUEngine`; its real output was saved as `fixtures/searchData/*`. The sandbox sends **no `userLocation`**, so near-me there falls back to "Use my location".
- Real NLU quirks handled: "tornado warning near me" → entity **Tornado, WV** (near-me wording now wins and hazard-word entities are ignored); ZIP codes come with **no coordinates** (only `description: "Houston"`); "San Juan" → San Juan, **Argentina**; non-US `stateAbb` values are GeoNames codes ("07", "ENG", "10").
- `area=XX` for a state excludes marine zones; the national feed includes many marine alerts (Small Craft, Gale) → shown separately.
- NWS point outside coverage returns `400 … "out of bounds"` (problem+json) → outside coverage.
- NWS event names come from `/alerts/types` (embedded in `data/nwsEventTypes.js`). "Excessive Heat" and "Wind Chill" events no longer exist ("Extreme Heat", "Extreme Cold").
- **Bundling:** a lazy chunk that shares React/MUI makes Rollup turn `index.modern.js` into a stub importing a hashed chunk (risky if the host serves only `client.location`). Fixed without touching `vite.config.js`: the map uses plain Leaflet and lazy-imports only `leaflet/dist/leaflet-src.esm.js`, which shares nothing → core stays in one file.
- **CARTO basemaps now require an API key** (tiles show a watermark) → switched to Esri World Light/Dark Gray canvas (keyless) with attribution.
- `api.weather.gov` and `api.weather.gc.ca` both send `Access-Control-Allow-Origin: *`.
- Environment Canada returns one feature per area (`id = <alertId>_<areaId>`), UTC `Z` timestamps, `validity_datetime` / `event_end_datetime` / `expiration_datetime`, `risk_colour_en`, `impact_en`, `confidence_en`; `province=QC` filtering works.
