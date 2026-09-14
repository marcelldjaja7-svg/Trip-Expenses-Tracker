# TripTab — trip expense splitter

A local-first web app for splitting shared trip costs with friends. Multi-currency (settle in **IDR** by default), equal / amount / percent splits, settle-up suggestions, and no account required. Opens in **dark mode**, with an Apple-like iOS interface (grouped lists, system-blue controls, light mode available).

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

1. **Create a trip** — name it, pick a vibe emoji, optional dates, and a home/base currency. New trips default to **Indonesian Rupiah (IDR)**. You can still settle in USD, SGD, etc.
2. **Add friends** — everyone on the trip. You can rename or recolor them later.
3. **Log expenses** — amount, currency, who paid, who is on the bill, category, note, date.
   - **Equal** — split evenly among people marked **In**.
   - **Amounts** — type each person’s share.
   - **%** — split by percentage (must add up to 100%).
   - Tap **Out** to exclude someone from that expense. **Everyone** / **Just payer** are shortcuts.
4. **Set conversion rates** — when an expense isn’t in IDR (or your chosen base), set e.g. “1 USD = 16200 IDR”. Edit rates anytime under **Trip**. Live fetch is a shortcut, not a requirement.
5. **Settle up** — open the settle tab for net balances and the fewest suggested payments. Copy a payment, or tap **Log payment** after someone actually pays.
6. **Share / backup** — copy a text summary, copy a share link, or download JSON. Import JSON on the home screen to restore. Data lives in this browser’s `localStorage` until you export it.

Use the sun/moon control to switch light and dark. There’s a **Bali demo trip** on the home screen if you want to click around before creating your own.

## Stack

React + Vite + TypeScript + Tailwind CSS v4. Everything runs in the browser.
