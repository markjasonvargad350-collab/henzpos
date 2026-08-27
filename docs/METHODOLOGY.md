# Methodology — Machine-Learning Demand Forecasting and Reorder Recommendation

**System:** Web-Based Medical Supplies Inventory Management System with Machine-Learning-Based Demand Forecasting and Reorder Recommendation
**Store:** HENZ Health Care Products Trading (Main — Casa Conching, Jalandoni St; D'Jabez — 21 Gen. Luna St)
**This document** describes the algorithm, formulas, data pipeline, and validation for the forecasting/reorder half of the system. It maps 1:1 to the source so any formula here can be cited directly against a file and line.

| Concern | Source file |
|---|---|
| Demand forecasting (the ML) | [`src/lib/forecasting.ts`](../src/lib/forecasting.ts) |
| Reorder recommendation (inventory policy) | [`src/lib/reorder.ts`](../src/lib/reorder.ts) |
| Isolated simulated dataset (demo only) | [`src/data/sampleSalesHistory.ts`](../src/data/sampleSalesHistory.ts) |
| The admin screen | [`src/components/forecast/DemandForecast.tsx`](../src/components/forecast/DemandForecast.tsx) |
| Model-validation unit tests | [`src/lib/forecasting.test.ts`](../src/lib/forecasting.test.ts), [`src/lib/reorder.test.ts`](../src/lib/reorder.test.ts) |

---

## 1. Named algorithm

**Demand forecasting uses Exponential Smoothing — the Holt-Winters / ETS (Error-Trend-Seasonal) family of classical time-series methods.**

This is legitimately machine learning in the statistical-learning sense: the *features* are lagged daily demand, the *target* is next-day demand, the smoothing *parameters* (α, β) are **fitted by minimizing forecast error on held-out data**, and model quality is *validated* with error metrics (MAE, RMSE, MAPE) on that holdout. It is deliberately **interpretable** — not a black-box neural network — which is a defensible strength for a medical-supply setting where a buyer must justify every purchase order.

The system selects the most sophisticated model the available data can support (a *model-selection ladder*), so it produces a usable answer on day one and sharpens automatically as real sales accumulate:

| Data condition (observed days *n*, non-zero sale-days *nz*) | Model chosen | Rationale |
|---|---|---|
| *n* = 0, or *nz* = 0 | `none` → hand off to min-stock rule | No history to learn from (cold start) |
| *n* ≥ 14 **and** *nz*/*n* < 0.35 | **Croston's method** | Intermittent (lumpy) demand — many zero days |
| *n* < 14 | `naive-mean` | Too little history for smoothing |
| *n* ≥ 14 | **Simple Exponential Smoothing (SES)** | Level-only series |
| *n* ≥ 28 | **Holt's Linear Trend (double ES)** | Enough history to estimate a trend |
| always evaluated | 7-day moving average | Baseline floor for comparison |

Among the eligible candidates (SES, Holt, moving-average) the one with the **lowest held-out RMSE** wins, ties broken toward the simpler model. Croston is chosen up front when the series is intermittent, because RMSE on a mostly-zero series is misleading.

> **The reorder recommendation is *not* machine learning.** It is a classical **forecast-driven inventory-control policy** (operations research): the standard order-up-to / (s, S) model with safety stock sized to a service level. It *consumes* the ML forecast and turns it into a concrete "order N units by date D" decision. In the paper these should be presented as two distinct layers — the forecast predicts demand; the policy decides the reorder.

---

## 2. Data pipeline

The forecast is built per **product × branch**. Branch stock is always resolved through `branchStockField()` — the field `stockUsaBranch` denotes the **D'Jabez** branch, never inferred from the name.

### 2.1 Time key (`txEpochMs`, forecasting.ts)

Each sale's day is derived from the epoch milliseconds embedded in the transaction id (`tx-<epochMs>-<code>`), which is locale-independent and exact. If the id carries no usable epoch, the human `timestamp` string is parsed as a fallback; if neither parses, the row is **skipped** (never crashed on):

```
embedded = Number(id.split('-')[1])
if embedded is finite and > 0:  return embedded
parsed = Date(timestamp).getTime()
return isNaN(parsed) ? null : parsed
```

### 2.2 Daily demand series (`dayMapFor` → `seriesFromDayMap`)

1. Keep only `status === 'Completed'` transactions (refunds/voids excluded).
2. Keep only the target branch (or `'ALL'`), normalized via `normalizeBranch()`.
3. Bucket each transaction into a `YYYYMMDD` day key (`dateStamp`), summing `items[].quantity` for the target product.
4. **Zero-fill** into a *contiguous* daily array from the first observed sale-day (within the 90-day look-back) up to `asOf`. Every gap inside the history becomes an explicit `0` — Exponential Smoothing and Croston require real zeros to estimate the rate correctly. We do **not** fabricate zero-demand days *before* the product's first sale.

The result is `DemandSeries { points[], spanDays, nonZeroDays, totalQty }`.

Default window (`ForecastOptions`): look-back **90 days**, horizon **14 days**.

### 2.3 Train / test split (`holdoutStart`)

The last ~25% of the series (minimum 3 days) is held out as the test tail; the rest is used to fit parameters. Parameters are chosen on the **training portion's one-step-ahead error over the holdout** — never scored on data used to fit.

```
test  = max(3, floor(n * 0.25))
start = max(1, n − test)          # holdout = series[start:]
```

---

## 3. Forecasting formulas (`forecasting.ts`)

Let `yₜ` be observed demand on day *t*, `Lₜ` the level, `bₜ` the trend, `α` the level-smoothing and `β` the trend-smoothing constant, `ŷ` the forecast.

### 3.1 Simple Exponential Smoothing — `ses()`

```
Lₜ = α·yₜ + (1 − α)·Lₜ₋₁
one-step-ahead forecast for day t  =  Lₜ₋₁
```
Initialization: `L₀ = y₀`. Flat by construction — no trend term.

### 3.2 Holt's Linear Trend / double ES — `holt()` (headline method)

```
Lₜ = α·yₜ + (1 − α)·(Lₜ₋₁ + bₜ₋₁)
bₜ = β·(Lₜ − Lₜ₋₁) + (1 − β)·bₜ₋₁
h-step-ahead forecast:  ŷₜ₊ₕ = Lₜ + h·bₜ
```
Initialization: `L₀ = y₀`, `b₀ = y₁ − y₀`. The one-step fitted value for day *t* is `Lₜ₋₁ + bₜ₋₁`. This is the only method that projects a sloped (trending) horizon; all others project a flat rate.

### 3.3 Croston's method (intermittent demand) — `croston()`

Smooth the non-zero demand **size** `zₜ` and the **interval** `pₜ` between demands separately, then:
```
per-period demand rate  =  ẑ / p̂
```
Updated only on days with a sale (both size and interval smoothed with the same α); the daily forecast between demands is the standing rate.

### 3.4 Baselines

- **Naive mean** (`fittedNaiveMean`): forecast for day *t* is the expanding mean of all prior days.
- **Moving average** (`fittedMovingAverage`, window = 7): forecast for day *t* is the mean of the previous 7 days.

### 3.5 Parameter fitting — the "learning" step (`fitBest`)

Grid-search and keep the parameters that minimize **held-out RMSE**:

```
ALPHA_GRID = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
BETA_GRID  = [0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5]
```

```
function fitBest(values):
    n  = len(values);  nz = count(values > 0)
    if n == 0 or nz == 0:                    return method 'none'
    if n ≥ 14 and nz/n < 0.35:               # intermittent
        return argmin_RMSE over ALPHA_GRID of Croston
    if n < 14:                               return 'naive-mean'
    sesBest  = argmin_RMSE over ALPHA_GRID of SES
    holtBest = (n ≥ 28) ? argmin_RMSE over ALPHA_GRID × BETA_GRID of Holt : none
    maBase   = moving-average(window = 7)
    return lowest-holdout-RMSE of { sesBest, holtBest, maBase }   # simpler wins ties
```

### 3.6 Accuracy metrics — model validation (`accuracy`)

Computed on the holdout, on aligned `actual`/`predicted` arrays:

```
MAE  = (1/n) · Σ |aᵢ − pᵢ|
RMSE = sqrt( (1/n) · Σ (aᵢ − pᵢ)² )
MAPE = mean over { i : aᵢ > 0 } of |aᵢ − pᵢ| / aᵢ      (null if no positive actuals)
```

MAPE is intentionally **null** (shown as "—") rather than `∞` when every actual in the holdout is zero — division by zero is never reported as an error rate. These three numbers are exported per product (§6) as the model-validation table for the Results chapter.

### 3.7 Confidence label (`confidenceFor`)

A plain-language reliability tag derived from data volume and error:
```
none   : spanDays == 0 or nonZeroDays == 0
low    : spanDays < 14 or nonZeroDays < 5
high   : spanDays ≥ 28 and (MAPE is null or MAPE ≤ 0.35)
medium : otherwise
```

### 3.8 Horizon projection & daily rate (`forecastDemand`)

```
for h in 1..14:
    raw     = (method == 'holt') ? (L + h·b) : flatRate
    ŷ[h]    = max(0, raw) · seasonalFactor
dailyRate   = max(0, mean(ŷ))          # the demand/day handed to the reorder layer
dailyStdDev = sample standard deviation of the historical daily series
```

---

## 4. Seasonality — school-opening peak (`seasonalMultiplier`)

Presented as an **operator override, not a fitted seasonal index** (an honest limitation — a true seasonal index needs multiple years of history the store does not yet have). It reuses the existing `isJulyPeakSeasonMode` flag:

```
seasonalMultiplier =
    1                                if the peak flag is OFF
    peakMultiplier (default 1.25)    if flag ON and month ∈ {Jun, Jul, Aug}   # index 5,6,7
    1                                otherwise
```

The window is Jun–Aug because the Philippine school calendar has shifted toward August. The multiplier scales every horizon point (§3.8), so it lifts both the forecast line and, downstream, the suggested order quantity during the enrollment surge.

---

## 5. Reorder policy (`reorder.ts`)

A forecast-driven **order-up-to** model. Assumed defaults (all overridable; the lead time is surfaced and editable in the UI, explicitly labeled an assumption because the catalogue has no per-supplier lead-time data):

```
DEFAULT_LEAD_TIME_DAYS     = 7
DEFAULT_REVIEW_PERIOD_DAYS = 30
DEFAULT_SERVICE_Z          = 1.65     # ≈ 95% cycle service level
```

### 5.1 Core formulas

```
safetyStock  = z · σ_daily · √leadTime          # falls back to minStockLevel when σ ≤ 0
ROP          = dailyDemand · leadTime + safetyStock
orderUpTo    = dailyDemand · (leadTime + reviewPeriod) + safetyStock
suggestedQty = max(0, ceil(orderUpTo + committedPreOrders − onHand))     # expiry-capped, §5.4
daysOfCover  = onHand / dailyDemand              # null when demand = 0
```

`onHand = product[branchStockField(branch)]`. The safety-stock fallback to `minStockLevel` means that when demand is too thin to estimate a standard deviation, the policy **degrades gracefully to the store's existing low-stock trigger** rather than to zero.

### 5.2 Cold-start fallback (no sales history → `method === 'none'`)

```
minLevel     = max(0, minStockLevel)
dailyDemand  = minLevel / leadTime      (0 if minLevel = 0)   # proxy so cover/urgency still read
safetyStock  = minLevel
ROP          = minLevel
orderUpTo    = minLevel · 2                                   # matches the app's rebalance heuristic
```

This is why the reorder screen is useful on day one even with an empty sales record.

### 5.3 Urgency classification (`classifyUrgency`) → colour band

```
if dailyDemand ≤ 0:      onHand ≤ 0 → 'high'          else → 'ok'
cover = onHand / dailyDemand
onHand ≤ 0 or cover < leadTime → 'critical'   (rose)
onHand ≤ ROP                   → 'high'       (amber, "Reorder now")
onHand ≤ orderUpTo             → 'medium'     (sky,   "Watch")
otherwise                      → 'ok'         (emerald)
```

### 5.4 Expiry-aware cap (short shelf-life items)

For `shelfLifeType === 'short'` with a parseable `expiryDate`:
```
daysToExpiry = round((expiry − asOf) / dayMs)
if daysToExpiry ≤ leadTime + reviewPeriod:  flag expiryRisk
if dailyDemand > 0:
    sellableBeforeExpiry = floor(dailyDemand · max(0, daysToExpiry − leadTime))
    if sellableBeforeExpiry ≤ 0:            suggestedQty = 0        (don't reorder; flag risk)
    elif sellableBeforeExpiry < suggestedQty: suggestedQty = capped (flag risk)
elif daysToExpiry ≤ 0:                      suggestedQty = 0        (flag risk)
```
This prevents ordering perishables that cannot sell before they expire — the order must arrive (after the lead time) with enough shelf life left to actually move.

### 5.5 Order-by date

```
if suggestedQty > 0 and cover ≠ null:
    daysUntilOrder = max(0, floor(cover − leadTime))
    orderByDate    = asOf + daysUntilOrder days
```

### 5.6 Committed pre-orders — forward demand without double-counting (`committedPreOrderQty`)

Pre-orders are demand that hasn't been rung up yet, so they are added to the order need. Only **live** orders count:
```
counted:  orderStatus ∈ { Pending, Preparing, Ready for Pickup }  at the same branch
excluded: Claimed    → already written into `transactions` by completeSale (would double-count)
          Cancelled  → dead
```
This committed quantity is added in `suggestedQty` (§5.1) but is **never** mixed into the training series — it is future demand, not observed history.

---

## 6. Outputs for the research paper

The **Demand Forecast** tab exports two CSVs (filenames prefixed `SAMPLE_` when using the demo dataset):

1. **Reorder plan CSV** — product, on-hand, daily demand, days-of-cover, ROP, order-up-to, safety stock, suggested qty, committed pre-orders, urgency, order-by date, method, expiry-risk flag, plain-English reason.
2. **Forecast metrics CSV** — per product: chosen method, fitted α/β/window, observed days, sale-days, daily rate, daily σ, **MAE / RMSE / MAPE**, holdout n, confidence, seasonal factor. This is the ready-to-lift **model-validation table**.

---

## 7. Model-validation evidence (unit tests)

`npm test` runs the Vitest suites, which check the implementation against hand-computed expected values — the reproducible "model validation" evidence for the thesis:

- **`forecasting.test.ts`** — `txEpochMs` id-parse / timestamp-fallback / null; SES stays flat on a flat series and smooths a step by α; Holt tracks a perfect linear trend exactly; MAE/RMSE/MAPE (including the null-MAPE and empty-input cases); zero-fill contiguity (`[3,0,5]`); refund and cross-branch exclusion; cold-start returns `none`; seasonal multiplier applies only in the peak window.
- **`reorder.test.ts`** — safety-stock formula and its min-stock fallback; ROP and order-up-to; urgency bands; cold-start (`ROP = 20`, `orderUpTo = 40`, `suggested = 35`); on-hand resolved via `branchStockField` (D'Jabez reads `stockUsaBranch`); the expiry cap and the expired-perishable case; pre-order dedupe (Claimed and Cancelled excluded).

All 28 tests pass. The tests are dev-only (Vitest) and are never bundled into the production app.

---

## 8. Reproducibility of the demonstration dataset

The forecast can be demonstrated **today** even though the real `transactions` collection is intentionally empty (it is the official BIR tax record and must stay clean — an empty sales report is a correct one). The demo uses an **isolated, in-memory simulated dataset** (`sampleSalesHistory.ts`) generated by a **seeded PRNG** (mulberry32 seeded by an FNV hash of product id + day + branch — no `Math.random`, no `Date.now` inside the model), so the demonstration is byte-for-byte reproducible for the defense.

Simulated demand = per-product base rate × weekday shape × school-opening seasonal surge × mild upward trend + bounded noise, split 60/40 Main/D'Jabez, with ~6% of products left dormant on purpose to exercise the cold-start path. Exact parameters are exported as `SAMPLE_PARAMS` for citation (120 days of history, weekday and monthly-seasonal shape vectors, trend and noise fractions).

**Isolation guarantee (verifiable):** `sampleSalesHistory` is never imported by `POSContext.tsx`, and its output is never passed to `setDoc` / `writeBatch` / `addDoc` / `seedIfEmpty` or any Firestore write. Real and Sample modes differ only in *which transaction array* is fed to the identical pure pipeline (`forecasting.ts` / `reorder.ts`) — the mathematics is the same. Real forecasts sharpen automatically as genuine sales accumulate.
