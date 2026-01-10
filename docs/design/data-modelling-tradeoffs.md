# Data Modeling Trade-offs: Normalization vs. Denormalization

## 1. Hot Path Analysis
The primary hot path for our URL Shortener is the **GET /:short_code** request. To minimize latency, we must minimize the number of disk seeks and table lookups required to resolve a URL.

## 2. Comparison Matrix

| Metric | Normalized (3NF) | Denormalized |
| :--- | :--- | :--- |
| **Read Latency** | Higher (due to joins) | **Lower (single-row lookup)** |
| **Write Latency** | Lower (single-table update) | Higher (must update multiple locations) |
| **Data Integrity** | **High (Single source of truth)** | Low (Risk of "stale" duplicated data) |
| **Storage Cost** | Optimized / Minimal | Redundant / Higher |
| **Query Complexity**| Complex SQL Joins | Simple Key-Value access |

## 3. Join Strategies
- **Normalization Strategy:** We use `short_urls.user_id` as a foreign key. To show a "User Dashboard," we join `short_urls` with `users`. This is acceptable for the **Management Path** (low traffic).
- **Denormalization Strategy:** For the **Redirection Path** (hot path), we store all necessary metadata (like `is_active` status) within the `short_urls` record to avoid joining with a `status` table.

## 4. Storage Cost Discussion
While denormalization increases the size of each record, the cost of extra SSD storage is significantly lower than the cost of the additional database nodes we would need to handle the CPU load of constant joins at 10,000 RPS.