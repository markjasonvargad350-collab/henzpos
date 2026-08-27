# User Guide — Demand Forecast & Reorder Recommendation

This guide explains how to operate the **Demand Forecast** tab in the HENZ POS system. It is written for the store owner / buyer (no statistics background assumed). For the algorithm and formulas behind it, see [`METHODOLOGY.md`](METHODOLOGY.md).

---

## 1. What this screen is for

Every other screen in the app tells you what happened (sales, stock, expiry). This one looks **forward**:

- **Demand forecast** — how many units of each item you are likely to sell per day in the near term, learned from your own sales history.
- **Reorder recommendation** — for each item, whether to reorder, **how many** to order, and **by when**, so you neither run out nor over-buy.
- **Expiry-aware alerts** — for short shelf-life items, it will not tell you to order more than you can realistically sell before they expire.
- **School-opening season** — an optional boost for the June–August enrollment surge.

It **never** changes your data. It only reads sales and stock and shows advice. Nothing here is written to the database.

---

## 2. Getting to the tab

1. Log in as staff (**Staff Login**, top-right).
2. In the admin navigation bar, click **Demand Forecast** (the trend-line icon, next to *Sales & Reports*).

The forecast is always shown for the **branch currently selected** in the header (Main or D'Jabez). Switch branches in the header dropdown to see that branch's plan.

---

## 3. Real sales vs. Sample data

At the top-right there is a toggle:

| Mode | What it shows | When to use |
|---|---|---|
| **Real sales** (green) | Forecast learned from your actual recorded sales | Normal day-to-day use |
| **Sample data** (amber) | A built-in *simulated* demonstration dataset | Training, demos, and the thesis defense |

**Sample data is clearly marked** with an amber banner — *"SIMULATED demonstration data — not real sales."* It is a reproducible simulation (120 days of history) that lives only in this screen's memory and is never saved. Use it to see how the forecast will look once real sales build up.

> If you are on **Real sales** and no sales have been recorded yet, you'll see a note explaining that the reorder plan below is using the **min-stock rule** as a cold-start fallback. That is expected — the forecast gets smarter automatically as real sales accumulate. Switch to **Sample data** to preview the full experience.

---

## 4. The controls row

- **Assumed supplier lead time** (default **7 days**) — how long stock takes to arrive after you order. The catalogue does not store per-supplier lead times, so this is an assumption you can adjust; every recommendation recalculates instantly when you change it. Raise it for slow suppliers (the system will tell you to order earlier and hold more safety stock).
- **School-opening season** — shows whether the peak-season boost is ON. When ON, forecasts in **June–August** are lifted by ~25% to anticipate the enrollment surge. (This is set by the store-wide *July peak season* switch in Settings.)

---

## 5. Reading the KPI cards

| Card | Meaning |
|---|---|
| **Needs Reorder** | How many items are Critical or Reorder-now |
| **Suggested Units** | Total units the plan recommends ordering across all items |
| **Expiry-Risk Items** | Short shelf-life items whose order was capped (or blocked) to avoid expiry waste |
| **Avg Forecast Error** | Average MAPE — typical percentage the forecast is off. Lower is better; "—" means not enough sales to score yet |

---

## 6. The forecast chart

Click any row in the table to chart that product (by default the first item with real history is shown).

- **Solid green line** — actual daily sales history.
- **Dashed indigo line** — the forecast for the next 14 days.
- **Dashed rose line** — the average daily demand for reference.
- The vertical divider marks **today** (history on the left, forecast on the right).

Above the chart you'll see the chosen **method** (e.g. *Holt's linear trend*), a **confidence** tag, the fitted **α / β** smoothing constants, and the **MAE / RMSE / MAPE** error figures for that product.

---

## 7. The reorder table

Sorted **most-urgent first**. Columns:

| Column | Meaning |
|---|---|
| **Product** | Name + SKU; shows "• N pre-ordered" if unclaimed pre-orders are committed |
| **Trend** | A 30-day mini sparkline of recent demand |
| **On hand** | Current stock at the selected branch |
| **Demand/day** | Forecast daily sales |
| **Cover** | How many days the current stock will last |
| **ROP** | Reorder point — order when stock reaches this level |
| **Order** | **Suggested quantity to order** (blank if none needed) |
| **Urgency** | Colour band (see below) |
| **Why** | Plain-English explanation of the recommendation |

**Urgency colours:**

- 🔴 **Critical** — out of stock, or stock runs out before a new order could arrive. Order immediately.
- 🟠 **Reorder now** — at or below the reorder point.
- 🔵 **Watch** — below the ideal stocking level; fine for now.
- 🟢 **OK** — comfortably stocked.

**Expiry handling:** for short shelf-life items, the suggested quantity is automatically **capped** at what can sell before expiry — and if nothing can, it recommends **not** reordering and suggests a promo to move current stock. The "Why" column always explains this in words.

---

## 8. Exporting for reports / thesis

Two buttons at the top-right:

- **Reorder CSV** — the full purchase plan (quantities, order-by dates, reasons). Open in Excel/Sheets to hand to a supplier or paste into a report.
- **Metrics CSV** — per-product accuracy figures (MAE / RMSE / MAPE), the method chosen, and the fitted parameters. This is the **model-validation table** for the Results chapter of the paper.

When you are in **Sample data** mode, both files are prefixed `SAMPLE_` so demo exports are never mistaken for real ones.

---

## 9. Frequently asked

**Does this change my stock or sales?** No. It only reads and advises. It writes nothing to the database.

**Why does an item say "No sales history yet"?** No completed sales recorded for it yet, so the plan uses your existing min-stock level as a safe fallback. It becomes a real forecast once sales come in.

**Why is a suggested order smaller than I expected?** Likely the expiry cap (short shelf-life) or the item already has enough cover. The "Why" column states the reason.

**The forecast looks flat.** With little or steady history the system uses a level (flat) model on purpose — it will switch to a trend model once there are ~28 days of data showing a real trend.
