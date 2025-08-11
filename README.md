# Crypto Watch (Accessible)
A modern, clean, and **accessible** crypto price dashboard for Bitcoin (BTC), Ethereum (ETH), Litecoin (LTC), Dogecoin (DOGE), and Solana (SOL). Designed to be hosted on **GitHub Pages**.

## Features
- Live prices (EUR/USD/GBP) with 24h change
- Minimal 7‑day sparkline per coin
- Screen reader announcements for updates
- Keyboard friendly, high contrast, focus-visible
- Theme toggle (respects system theme by default)
- No build step, no keys, just static files

## Data Source
Prices and charts are fetched client-side from the [CoinGecko public API](https://www.coingecko.com/). If CoinGecko later requires an API key, you can switch providers by editing `app.js` where `fetchPrices`/`fetchChart` are defined.

## Local Development
Just open `index.html` in a browser, or serve the folder:
```bash
python3 -m http.server 8080
```

## Deploy to GitHub Pages
1. Create a new public repo (e.g., `crypto-watch`).
2. Add these files, commit, and push to `main`.
3. In **Settings → Pages**, set **Source** to `Deploy from a branch`, then pick `main` and `/ (root)`.
4. Wait a minute—your site will be live at `https://<your-user>.github.io/<repo>/`.

## Accessibility Notes
- Landmarks: header, main, footer
- “Skip to content” link for keyboard users
- Live announcements via `aria-live` (polite) when prices change or settings update
- Canvas charts include offscreen text descriptions (`figcaption.sr-only` and `aria-describedby`)
- All controls are labeled and reachable via keyboard

---

© 2025 Crypto Watch. All rights reserved.
