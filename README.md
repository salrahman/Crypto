# Crypto Watch (Accessible)
A modern, clean, and **accessible** crypto price dashboard for Bitcoin (BTC), Ethereum (ETH), Litecoin (LTC), Dogecoin (DOGE), and Solana (SOL). Designed to be hosted on **GitHub Pages**.

## Features
- Live prices (EUR/USD/GBP) with 24h change
- Minimal 7-day sparkline per coin
- Screen reader announcements for updates
- Keyboard friendly, high contrast, focus-visible
- Theme toggle (respects system theme by default)
- No build step, no keys *required* for layout — but see key note below

## Data Source
Prices and charts are fetched client-side from the **CoinGecko API**. CoinGecko deprecated the keyless API; for reliability, use a free **Demo** API key.

## Using a CoinGecko API Key (recommended)
1. Create a CoinGecko account and get a free **Demo** API key from the Developer Dashboard.
2. Open the app and paste the key into the **API key** field in the header, then click **Save**.  
3. When a key is present, the app uses `https://pro-api.coingecko.com/api/v3` and appends your key as `x_cg_pro_api_key`.

## Local Development
Just open `index.html` in a browser, or serve the folder:
```bash
python3 -m http.server 8080
```

## Deploy to GitHub Pages
1. Create a new public repo (e.g., `crypto-watch`).
2. Add these files, commit, and push to `main`.
3. In **Settings → Pages**, set **Source** to `Deploy from a branch`, then pick `main` and `/ (root)`.
4. Optional: add a `.nojekyll` file at the repo root.
5. Wait a minute—your site will be live at `https://<your-user>.github.io/<repo>/`.

## Accessibility Notes
- Landmarks: header, main, footer
- “Skip to content” link for keyboard users
- Live announcements via `aria-live` (polite) when prices change or settings update
- Canvas charts include offscreen text descriptions (`figcaption.sr-only` and `aria-describedby`)
- All controls are labeled and reachable via keyboard

---

© 2025 Crypto Watch. All rights reserved.
