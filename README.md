# TripTab — trip expense splitter

A local-first web app for splitting shared trip costs with friends. Multi-currency (settle in **IDR** by default), equal / amount / percent splits, settle-up suggestions, and no account required. Opens in **dark mode**, with an Apple-like iOS interface (grouped lists, system-blue controls, light mode available).

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

On your phone on the same Wi‑Fi, you can also use your computer’s LAN address if Vite prints a `Network:` URL. Friends **not** on your network need the deployed site below.

## Share with friends (other phones)

1. Deploy TripTab so it has a public URL. After this repo is on GitHub, turn on **Settings → Pages → GitHub Actions**, merge to `main`, and open:
   `https://<your-github-username>.github.io/Trip-Expenses-Tracker/`
2. Create a trip, tap the **share** button (or **Trip → Start Live Trip / Invite Friends**).
3. Send that link (it looks like `…/Trip-Expenses-Tracker/?t=…`). Friends open it on any phone, and expenses they add show up for everyone on the same link (the trip syncs every few seconds). Anyone with the link can edit.

Until the site is deployed, a live invite copied from `localhost` only works on this computer.

Live rooms use a public paste host so no account is required. Anyone with the link can edit. Rooms may expire if nobody opens them for a while — download JSON as a backup.

Snapshot JSON export still works as a one-way backup.

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
6. **Share with friends** — tap share / **Invite Friends** for a **live** link so everyone can add expenses on their own phone. Copy a text summary or download JSON as a backup.

Use the sun/moon control to switch light and dark. There’s a **Bali demo trip** on the home screen if you want to click around before creating your own.

## Stack

React + Vite + TypeScript + Tailwind CSS v4. Everything runs in the browser.
