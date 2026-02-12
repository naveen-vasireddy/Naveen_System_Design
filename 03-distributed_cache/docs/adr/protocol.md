# Cache Protocol Specification

**Version:** 1.0
**Type:** Text-based (ASCII)
**Line Terminator:** `\r\n` (CRLF)

## Commands

### 1. SET
Stores data with an optional TTL.
Format: `SET <key> <value> <ttl_seconds>`
- `key`: String (no spaces)
- `value`: String (no spaces)
- `ttl_seconds`: Integer (optional)

Example:
> SET user:123 naveen 60
< OK

### 2. GET
Retrieves data by key.
Format: `GET <key>`

Example:
> GET user:123
< naveen

### 3. DEL
Removes data by key.
Format: `DEL <key>`

Example:
> DEL user:123
< 1