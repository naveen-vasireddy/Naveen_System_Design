## URL Shortener Database Design

### Postgres Schema (Relational)
Postgres is chosen for scenarios requiring strong consistency and complex relational queries, such       
as detailed user analytics.

#### Schema Definition
```sql
CREATE TABLE short_urls (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE NOT NULL, -- The unique identifier (e.g., 'abc123')
    original_url TEXT NOT NULL,             -- The destination URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,                    -- Optional TTL for links
    user_id UUID,                            -- Link ownership for multi-tenancy
    version INTEGER DEFAULT 1                -- For optimistic locking if needed
);
```
#### Indexing for read-heavy paths [1]
```sql
CREATE INDEX idx_short_code ON short_urls(short_code);
```
### MongoDB Schema (Document-based)
MongoDB is optimized for horizontal scalability and high availability, making it ideal for the "AP"      
side of the CAP theorem where we prioritize availability during network partitions.

#### Document Structure
```json
{
  "_id": "ObjectId",
  "short_code": "String",
  "original_url": "String",
  "created_at": "ISODate",
  "expires_at": "ISODate",
  "metadata": {
    "user_id": "String",
    "clicks": 0,
    "last_accessed": "ISODate"
  }
}
```
#### Indexing
```sql
db.urls.createIndex({ "short_code": 1 }, { unique: true });
```

Optional: TTL index for automatic expiration of links
```sql
db.urls.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
```
[1] The index allows O(log N) lookup for the redirection logic.