# TripTab — trip expense splitter

A local-first web app for splitting shared trip costs with friends. Multi-currency, equal or custom splits, settle-up suggestions, and no account required.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

Tests:

```bash
npm test
```

No API keys. Optional “Fetch live” rates use the public [Frankfurter](https://www.frankfurter.app/) API; if the network is down, keep using the manual rates.

## How to use (with your group)

1. **Create a trip** — name it, pick a vibe emoji, optional dates, and a home/base currency (the one you’ll settle in).
2. **Add friends** — everyone on the trip. You can rename or recolor them later.
3. **Log expenses** — amount, currency, who paid, who shared it, category, note, date. Equal split is the default; switch to custom shares when someone only had the coconut, not the villa.
4. **Set conversion rates** — when an expense isn’t in the base currency, set “1 EUR = X USD” (or whatever your base is). Edit rates anytime under **Trip**. Live fetch is a shortcut, not a requirement.
5. **Settle up** — open the settle tab for net balances and the fewest suggested payments. Copy a payment, or tap **Log payment** after someone actually pays.
6. **Share / backup** — copy a text summary, copy a share link, or download JSON. Import JSON on the home screen to restore. Data lives in this browser’s `localStorage` until you export it.

There’s a **Bali demo trip** on the home screen if you want to click around before creating your own.

## Stack

React + Vite + TypeScript + Tailwind CSS v4. Everything runs in the browser.
