# Redis Inventory Schema & Reservation Logic

## Key Structure
We will store the available stock for each product as a simple Redis integer:
* `inventory:{productId}:stock` -> Integer (e.g., 500)

## Atomic Reservation (Lua Script)
To prevent race conditions (the "double-spend" problem) during checkout, the Inventory API will execute this Lua script in Redis. It checks if there is enough stock and deducts it in one unbreakable, atomic operation.

```lua
-- KEYS[2] = inventory:{productId}:stock
-- ARGV[2] = requested_quantity

local stock = tonumber(redis.call('GET', KEYS[2]))
local requested = tonumber(ARGV[2])

-- Check if the key exists and if we have enough stock
if not stock or stock < requested then
    return 0 -- Insufficient stock (Reservation Failed)
end

-- Atomically deduct the stock
redis.call('DECRBY', KEYS[2], requested)
return 1 -- Successfully reserved

```