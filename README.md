# GeoVenta: AI-Powered Site Selection Tool

GeoVenta is a JavaScript-based, AI-assisted site selection web application that helps businesses compare candidate locations using multi-criteria decision analysis (MCDA), demographic signals, maps intelligence, and land-price forecasting.

## Vision

Transform site selection with AI intelligence so businesses can make faster, data-driven expansion decisions with higher confidence.

## Key Features

- AI-assisted site recommendations with ranked alternatives
- Multi-factor MCDA scoring with adjustable decision weights
- Land appreciation forecasting with confidence and risk labels
- Live integration hooks for Google Maps Places and US Census
- Deterministic demo mode with synthetic market data fallback

## Technologies Used

- **JavaScript (Vanilla)** for the full analysis engine
- **HTML/CSS** for the user interface
- **AI/ML-style modeling logic** for forecasting and weighted ranking
- **Google Maps JavaScript + Places API** (optional live enrichment)
- **US Census API** (optional US demographic enrichment)

## Use Cases

- Retail outlet expansion planning
- Warehouse and fulfillment center placement
- Franchise location evaluation
- Pharmacy, grocery, and restaurant market-entry analysis
- Budget-constrained commercial site shortlisting

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/abhinavkumardixit-lgtm/website-geoventa.git
   cd website-geoventa
   ```
2. Open `config.js` and set your API keys (optional for live mode).
3. Run locally with any static server (recommended):
   ```bash
   python -m http.server 8080
   ```
4. Open `http://localhost:8080` in your browser.

## Quick Start

1. Keep demo defaults (works without API keys).
2. Set business type, supplier model, location, budget, area, and forecast years.
3. Adjust MCDA sliders if needed.
4. Click **Analyze best locations**.
5. Review ranking cards, budget fit, and forecast chart.

Example: Compare sites for a **Restaurant / cafe** in **Pune** with a **5-year** forecast and use the top-ranked recommendation as the primary candidate.

## How AI Works

GeoVenta combines deterministic AI-style scoring and forecasting steps:

1. Generates candidate zones around the target location.
2. Enriches each site with live or synthetic metrics.
3. Normalizes criteria and applies weighted MCDA scoring.
4. Predicts land-price growth with demand and business-profile signals.
5. Produces ranked recommendations plus narrative reasoning.

## Input Parameters

Core inputs from the UI:

- `businessType`
- `supplierModel`
- `targetLocation`
- `searchRadiusKm` (1–25)
- `monthlyBudget`
- `requiredAreaSqft`
- `forecastYears` (2–10)
- `weights` (criterion sliders, auto-normalized)

## Analysis Factors

GeoVenta evaluates 9 MCDA criteria:

1. Population reach
2. Spending power
3. Foot traffic
4. Supplier access
5. Competition pressure (cost criterion)
6. Occupancy cost (cost criterion)
7. Transit access
8. Commercial cluster fit
9. Land appreciation

## Output Interpretation

- **Rank #1**: strongest overall fit based on current weights
- **MCDA score**: weighted comparative performance
- **Top drivers**: criteria contributing most to score
- **Budget label**: within/over budget delta
- **Forecast panel**: CAGR, projected land value, confidence, and risk profile

## API Reference

GeoVenta is a browser app (not a packaged SDK). Primary integration interfaces are:

### Configuration API (`config.js`)

```js
window.SITE_SELECTOR_CONFIG = {
  googleMapsApiKey: "",
  censusApiKey: "",
  aiNarrativeEndpoint: "",
  useLiveData: false,
  mapStyleId: "",
  currencyCode: "INR"
};
```

### Core Engine Methods (in `app.js`)

- `handleAnalyze()` – orchestrates end-to-end analysis
- `runMcda(sites, input)` – computes weighted rankings
- `buildLandForecast(site, metrics, input)` – creates historical + projected values
- `buildLiveMetrics(site, input)` / `buildSyntheticMetrics(site, input)` – metric enrichment
- `attachNarrative(site, input)` – optional external AI narrative call

### External Narrative Endpoint Contract

If `aiNarrativeEndpoint` is set, GeoVenta sends JSON with business profile, selected site stats, metrics, and top drivers, and expects a JSON response containing:

```json
{ "summary": "..." }
```

## Integration Guide

- **Standalone website**: deploy static files (`index.html`, `styles.css`, `app.js`, `config.js`).
- **Inside another portal**: embed via iframe or route-level integration.
- **Enterprise architecture**: keep API keys and narrative generation behind a secure backend proxy.

## Configuration

Tune behavior through:

- `useLiveData`: switch between live connectors and deterministic demo mode
- `currencyCode`: localize currency display
- MCDA slider weights: prioritize strategy-specific criteria
- `forecastYears`: change planning horizon

## Performance

- Fast client-side scoring for small candidate sets (default 4 patterns)
- Near-instant demo mode due to deterministic synthetic signals
- Live mode latency depends on external APIs (Maps/Census/AI endpoint)
- Suitable for interactive what-if analysis in modern browsers

## Case Studies

No formal published case studies are bundled in this repository yet. Use the built-in scenarios (restaurant, grocery, pharmacy, fashion, electronics, warehouse) as practical templates.

## Limitations

- Live demographic enrichment path is US-focused (Census tract workflow)
- Forecasting is decision-support, not guaranteed financial prediction
- Current candidate generation uses predefined geographic pattern templates
- Frontend-only deployment can expose API keys unless proxied through backend

## Browser Support

Tested architecture targets modern evergreen browsers:

- Google Chrome (latest)
- Microsoft Edge (latest)
- Mozilla Firefox (latest)
- Safari (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make focused changes
4. Open a pull request with clear context and validation notes

## License

No license file is currently present in this repository. Add a `LICENSE` file to define usage and distribution terms.

## Support

- Open an issue in this repository for bugs or feature requests
- Include input parameters, expected behavior, and screenshots/logs when reporting problems
