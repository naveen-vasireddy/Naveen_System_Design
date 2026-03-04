# Edge Caching & Invalidation Strategy

## Context
Our e-commerce product pages (Catalog) are highly read-heavy. To minimize database load and reduce latency, we are implementing an edge caching layer using the **Stale-While-Revalidate (SWR)** pattern.

## How SWR Works for Product Pages
When a user requests a product page:
1. **Cache Hit (Fresh):** If the cache is less than 60 seconds old, we serve it immediately.
2. **Cache Hit (Stale):** If the cache is between 60 seconds and 1 hour old, we immediately serve the stale data to the user (keeping latency low), but trigger an asynchronous background fetch to the database to update the cache for the next user.
3. **Cache Miss:** If the data is missing or older than 1 hour, we block and fetch from the database synchronously.

## Invalidation Strategy
SWR handles passive updates, but we also need **Active Invalidation** for critical business events to prevent customers from seeing incorrect data:

* **Price Changes:** When an Admin updates a product's price, the Catalog Service will emit a `ProductUpdated` event. A worker will listen for this and explicitly call `DEL product:{id}` in the Redis edge cache.
* **Out of Stock:** When the Inventory Service reaches 0 for an item, it emits an `InventoryDepleted` event. The cache must be immediately invalidated so the UI reflects "Out of Stock" instead of letting users attempt to buy it.
