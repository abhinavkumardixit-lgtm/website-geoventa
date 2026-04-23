# VendorVista Site Selector

This folder contains a standalone business site-selection website built with plain HTML, CSS, and JavaScript.

## What it does

- Lets a user enter business type, supplier model, target location, budget, area, and forecast horizon
- Uses MCDA (multi-criteria decision analysis) to rank candidate sites
- Includes hooks for Google Maps Places data and US Census demographic data
- Predicts future land-price growth for each site
- Works immediately in demo mode with realistic synthetic fallback data

## Files

- `index.html`: website structure
- `styles.css`: layout and visual design
- `app.js`: MCDA engine, demo data generator, live API hooks, and forecast logic
- `config.js`: place your API keys and live-data settings here

## How to enable live data

Open `config.js` and set:

- `googleMapsApiKey`: browser API key for Google Maps JavaScript API + Places
- `censusApiKey`: optional US Census key
- `useLiveData`: `true`
- `currencyCode`: use `INR`, `USD`, or another ISO currency code

## Notes

- In demo mode the app simulates population, cluster, supplier, and competition signals so the UI still runs without network access.
- The Census integration is designed for US tract lookup. For non-US locations the app automatically falls back to synthetic demographic values.
- For production use, move API calls behind a secure backend so keys are not exposed in the browser.
- `aiNarrativeEndpoint` is optional. If you point it to your own backend, the app can request a richer AI-written forecast summary for the selected site.
