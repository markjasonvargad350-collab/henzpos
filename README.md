# HENZ POS — Medical Supplies Inventory & Demand Forecasting

> **Web-Based Medical Supplies Inventory Management System with Machine-Learning-Based Demand Forecasting and Reorder Recommendation**

A production point-of-sale and inventory system for **HENZ Health Care Products Trading** (Iloilo City, Philippines), with a classical time-series **machine-learning** engine that forecasts demand and recommends when/how much to reorder.

- 🌐 **Live:** https://henzpos.vercel.app
- 📦 **Repo:** https://github.com/markjasonvargad350-collab/henzpos
- 🏪 **Branches:** Main (Casa Conching, Jalandoni St) · D'Jabez (21 Gen. Luna St)

---

## Table of contents
1. [What it is](#what-it-is)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Feature map](#feature-map)
5. [The ML core (the thesis)](#the-ml-core-the-thesis)
6. [Project structure](#project-structure)
7. [Getting started](#getting-started)
8. [Roles & access](#roles--access)
9. [Deployment](#deployment)
10. [Known limitations & future work](#known-limitations--future-work)
11. [Working on this project — rules for Claude](#working-on-this-project--rules-for-claude)
12. [Go-live checklist](#go-live-checklist)

---

## What it is

A single-page web app (no backend server) that runs a two-branch medical-supplies store:

- **Cashier register** records real sales → those sales become the **training data**.
- An **inventory module** tracks stock, batches, and expiry per branch.
- A **machine-learning forecast** (exponential-smoothing family) projects future demand per product.
- A **reorder engine** turns that forecast + lead time + safety stock into concrete "reorder N units now" recommendations.

Everything is backed by **Firebase Firestore** in hybrid-offline mode, so terminals keep working without internet and sync automatically when it returns.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript (tsconfig **non-strict**) |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Data / Auth | Firebase 12 (Firestore + Authentication) |
| Offline | `vite-plugin-pwa` (service worker) + Firestore IndexedDB persistence |
| Icons / misc | lucide-react, jsbarcode, jsqr, qrcode, canvas-confetti, motion |
| Tests | Vitest |
| Hosting | Vercel (auto-deploy on push to `main`) |

> ℹ️ `@google/genai` is a **leftover dependency** from the original AI Studio scaffold and is not used anywhere — safe to remove during cleanup.

---

## Architecture

- **Client-only SPA.** No application server runs in production; the app talks to Firestore directly from the browser. (`express`/`tsx` are vestigial scaffold deps.)
- **Firestore is the single source of truth**, configured for **hybrid offline** (`persistentLocalCache` + multi-tab) in [`src/lib/firebase.ts`](src/lib/firebase.ts). Reads/writes queue locally and sync when online.
- **All global state + Firestore wiring lives in one context:** [`src/context/POSContext.tsx`](src/context/POSContext.tsx). Components consume it via the `usePOS()` hook.
- **Pure business logic is isolated in `src/lib/`** (no React, no I/O) so it is unit-testable and can never accidentally touch live data.
- **Shared store settings** (e.g. payment details) live in the Firestore `system/` collection; per-device settings (e.g. receipt format) live in `localStorage`.
- Firestore security is enforced by [`firestore.rules`](firestore.rules); Firebase project wiring is in [`firebase-applet-config.json`](firebase-applet-config.json) (public web config — **not** a secret) and [`firebase.json`](firebase.json).

---

## Feature map

Tiered by how central each feature is to the thesis title (useful for the defense):

### 🟢 Core (the research contribution)
- **Inventory & Expiry** — `src/components/inventory/InventoryManagement.tsx`
- **ML Demand Forecast** — `src/lib/forecasting.ts` + `src/components/forecast/`
- **Reorder Recommendation** — `src/lib/reorder.ts`

### 🔵 Supporting (feeds / hosts the core)
- **Cashier Register / POS** — `src/components/pos/` (generates the sales that train the forecast)
- **Firebase sync + PWA offline** — the "web-based" platform

### 🟡 Peripheral (operationally useful for the store, out-of-scope for the title)
- Customer **Pre-Order Portal** + **Prep Desk** + preset kits — `src/components/checklist/`, `src/components/prep/`
- **Multi-branch** + inter-branch transfers — `src/components/database/UnifiedDatabaseModal.tsx`
- **Receipt customizer** & printing — `src/components/pos/ReceiptCustomizerModal.tsx`, `src/utils/printReceipt.ts`
- **Payment QR editor** — Settings → Payment Counter (`src/components/pos/PaymentModal.tsx`)
- **Barcode/QR scanning**, **label printing**, multi-cart, sound effects, email alerts

> The email "auto-send" path calls a backend (`/api/send-email`) that does not exist in this deployment — it falls back to opening the staff mail client. See `src/utils/emailNotifier.ts`.

---

## The ML core (the thesis)

**File:** [`src/lib/forecasting.ts`](src/lib/forecasting.ts) — pure, unit-tested, interpretable (deliberately **not** deep learning).

- **Algorithm family:** Exponential Smoothing (Holt-Winters / ETS).
  - **Holt's linear trend** (double exponential smoothing) — headline method.
  - **SES** (simple exponential smoothing) — flat series.
  - **Croston's method** — intermittent / lumpy demand.
  - **Moving average** & **naive mean** — baselines / cold-start.
- **"Learning" step:** smoothing parameters (α, β) are **fitted** by grid search, minimizing one-step-ahead error on a held-out tail (~last 25%).
- **Model selection:** picks the lowest held-out **RMSE**, preferring the simpler model on a tie.
- **Quality metrics:** MAE / RMSE / MAPE, plus a `confidence` tier (none/low/medium/high).
- **Seasonality:** an operator-toggled school-opening (Jun–Aug) peak multiplier.

**Reorder engine:** [`src/lib/reorder.ts`](src/lib/reorder.ts) combines forecasted daily demand, lead time, safety stock, current branch stock, and **committed (unclaimed) pre-order quantities** to produce reorder-point and reorder-quantity recommendations.

**Demo without real data:** the Forecast screen has a **real ↔ sample** toggle that runs a seeded, in-memory simulation through the *same* pipeline — ideal for demonstrating the ML before live sales accumulate. The sample data is never persisted.

Tests: `src/lib/forecasting.test.ts`, `src/lib/reorder.test.ts` (run with `npm run test`).

---

## Project structure

```
henzpos/
├─ firebase-applet-config.json   # Firebase web config (public client keys)
├─ firebase.json · firestore.rules · vercel.json · vite.config.ts · tsconfig.json
├─ index.html · package.json
└─ src/
   ├─ App.tsx · main.tsx · types.ts
   ├─ context/POSContext.tsx       # global state + ALL Firestore wiring (usePOS)
   ├─ lib/                         # pure, unit-tested logic
   │   ├─ forecasting.ts (+test)   #   ML demand forecasting
   │   ├─ reorder.ts     (+test)   #   reorder recommendation
   │   ├─ firebase.ts              #   Firestore/Auth init (offline cache)
   │   ├─ branches.ts · scanMatch.ts · housekeeping.ts · myOrders.ts
   │   └─ barcode.ts · phone.ts · adminCode.ts (+tests)
   ├─ components/
   │   ├─ pos/        # register, payment, receipt, scanner, carts
   │   ├─ inventory/  # inventory & expiry management
   │   ├─ forecast/   # forecast UI + charts
   │   ├─ reports/    # sales & reports
   │   ├─ checklist/  # customer pre-order portal
   │   ├─ prep/       # prep desk queue
   │   ├─ database/   # unified DB / branch status
   │   ├─ admin/      # staff login + admin unlock
   │   └─ common/     # header nav, settings, toasts, QR/barcode renderers
   ├─ data/           # seed catalog, preset kits, sample sales (demo only)
   └─ utils/          # printing, audio, csv, ids, receipt settings, email
```

---

## Getting started

**Prerequisites:** Node.js 18+ (`firebase-applet-config.json` is already committed, so no `.env` setup is needed).

```bash
npm install
npm run dev
```

The dev server runs at **http://localhost:3000**.

### Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | Type-check (`tsc --noEmit`) |

> ⚠️ **The dev/preview server points at LIVE production Firestore.** See the rules below before testing anything that writes.

---

## Roles & access

- **Customer** (no login): anonymous Firebase session; sees only the **Pre-Order Portal**.
- **Staff** (shared email/password): register, pre-order portal, prep desk, inventory.
- **Admin** (staff + in-app admin code): everything above **plus** Sales & Reports, Demand Forecast, and Settings.

Staff share one Firebase Email/Password account (`STAFF_EMAIL` in the config). Admin is an in-app elevation on top of the staff session.

---

## Deployment

**Push to `main` → Vercel auto-builds and deploys.** There is no separate deploy step.

```bash
git add -A
git commit -m "your message"
git push origin main   # triggers the Vercel deploy
```

Verify a build locally first with `npm run build`.

---

## Known limitations & future work

Named on purpose — a system this size has trade-offs, and documenting them honestly is part of the engineering story (and the kind of self-awareness a thesis panel rewards).

> ✅ **Recently closed:** sales (`transactions`) and inter-branch (`stock_transfers`) records are now readable by **staff sessions only**, enforced in [`firestore.rules`](firestore.rules) — not merely hidden in the UI. The customer portal no longer even subscribes to them.

**1. Customer pre-order records are readable by any visitor.**
The zero-login order tracker reads the whole `preOrders` collection and lets a visitor search by name or phone, so `preOrders` reads stay open to any signed-in (including anonymous) session. That exposes pre-order PII — name, contact number, items — at the API layer, even though the UI only shows a customer their own orders.
*Why it's hard:* there are no customer accounts to scope reads to, and orders aren't tied to a stable identity.
*Future work:* give each order an opaque token looked up through a Cloud Function (so the collection is never broadly readable), or tie orders to the anonymous Firebase UID and drop the name/phone search.

**2. No real administrative security boundary.**
All staff share one Firebase account, and admin elevation is a client-side code check ([`src/lib/adminCode.ts`](src/lib/adminCode.ts)) — Firestore rules cannot tell staff from admin, and there is no per-user audit trail (the cashier name on a receipt is free text).
*Future work:* per-user staff accounts with Firebase **custom claims** (`role: admin`) enforced in rules.

**3. Forecasting & reports load the full transaction history in the browser.**
The ML forecast and sales reports process every transaction client-side. With ~10-year BIR retention this dataset only grows, raising load time and Firestore read cost over the years.
*Future work:* date-bounded queries, pre-aggregated monthly rollups, or scheduled server-side aggregation.

**4. Device-local critical settings.**
The admin-code hash, receipt layout, default cashier name, and email settings live in `localStorage` — per-device, not synced, and lost if browser data is cleared.
*Future work:* move non-secret device settings into the shared `system/` collection.

**5. Email "auto-send" has no mail server.**
`sendEmailNotification` posts to a `/api/send-email` endpoint that does not exist in this client-only deployment; it records the attempt as *Pending* and the UI falls back to opening Gmail/mailto for a human to send ([`src/utils/emailNotifier.ts`](src/utils/emailNotifier.ts)).
*Future work:* a serverless function (Vercel) calling a transactional email provider (Resend/SendGrid), with the API key in Vercel env vars.

**6. Payments are recorded, not verified.**
The "Level 0 QR Ph" flow shows a static QR and stores whatever reference number the customer types; nothing confirms the funds arrived.
*Future work:* a payment-gateway webhook (keys server-side only).

**7. Automated tests cover only the pure logic layer.**
`src/lib/` (forecasting, reorder, admin-code, barcode, phone) is unit-tested; the UI and Firestore-wiring layers are not, and TypeScript runs non-strict.
*Future work:* component/integration tests (e.g. Testing Library) against the Firestore emulator; enable `strict`.

**8. Single large JS bundle (~1.66 MB / ~437 KB gzipped).**
No route-level code-splitting, so first load ships the whole app — including admin-only screens — to every customer.
*Future work:* lazy-load the admin views (reports/forecast) and heavy libraries.

---

## Working on this project — rules for Claude

**Point me at this section when you want me to follow the project's guardrails.** These are non-negotiable because the dev environment talks to the real store's live database and tax records.

**Safety**
- 🔴 **The dev/preview server uses LIVE production Firestore.** Never trigger a Firestore **write** while verifying a change. Saving a product or submitting a pre-order writes; auto-generating or printing a label does not.
- 🔴 **`transactions` is the official BIR tax record.** Never seed fake sales, never write test sales, and its `update` rule stays permanently `if false`. Real sales must be retained ~10 years — don't bulk-purge them.
- 🔴 **The service worker must never intercept Firestore/auth traffic.** After any build, `grep -Eic "firebase|googleapis|firestore|identitytoolkit" dist/sw.js` must return **0**. Don't touch the SW's Firestore bypass or the PWA config.
- 🔴 **Never fabricate real-world data** — payment numbers, pricing, supplier/lead-time facts. The owner enters payment details via **Settings → Payment Counter**.
- 🔴 **Don't sign out the staff session** (no staff password is on hand; it strands the app).
- 🔴 **Secrets** (e.g. a future payment-gateway key) never go in client-shipped files — only in Vercel Environment Variables read by serverless functions.

**Conventions**
- Resolve branch stock only via `branchStockField()` (note: the field `stockUsaBranch` **means the D'Jabez branch**).
- Keep business logic in `src/lib/` **pure** (no React/Firestore) and unit-tested.
- Match the surrounding code's style; the repo is TypeScript non-strict.

**Workflow**
- ✅ **Verify every change with:** `npm run lint` → `npm run test` → `npm run build`, plus the `dist/sw.js` grep (must be 0).
- ✅ **Commit and push only when I explicitly ask.** A background notification is not permission.
- ✅ Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Go-live checklist

- [ ] **Payment info:** Settings → Payment Counter → real GCash name/number, QR Ph image, bank account(s).
- [ ] **Default cashier/terminal name:** Settings → Receipt tab (stops receipts saying the placeholder name).
- [ ] **Clear demo data:** use in-app "Clear Old Records" for sales / Cancelled / Claimed; cancel then purge any demo pre-orders.
- [ ] **Review the product catalog** (`src/data/initialProducts.ts` seeds only an empty DB).
- [ ] **Set the admin code.**
- [ ] *(optional cleanup)* remove the unused `@google/genai` dependency.

---

*HENZ Health Care Products Trading · Medical Supplies & Nursing Duty Kits · FDA Regulatory Compliant*
