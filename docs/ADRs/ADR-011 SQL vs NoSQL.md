 ## ADR-011: SQL vs NoSQL for Short Links

### Status: Proposed
Context: We need to choose a primary data store for the URL shortener. The system is expected to be      
read-heavy (typically a 100:1 read-to-write ratio) and must handle millions of unique entries.

### Decision:
For a global-scale URL shortener, NoSQL (MongoDB) is the preferred primary store, though SQL 
(Postgres) remains viable for smaller, more structured implementations.

### Rationale:
• Scalability: MongoDB supports sharding natively, which is critical as the "links" collection 
grows beyond the capacity of a single disk or node.
• Simplicity: The data is essentially a key-value pair (short_code -> original_url). A document
store avoids the overhead of ACID-compliant joins that are unnecessary for basic redirection.
• Performance: With proper indexing on the short_code, both systems provide fast lookups. However,       
NoSQL’s flexible schema allows for easier storage of unstructured "metadata" (like browser type or       
referral source) without costly migrations.
• Consistency vs. Availability: Per the CAP Theorem, a URL shortener usually favors Availability         
(AP). Users would rather get a redirected link quickly than wait for strict global consistency.

### Consequences:
• If MongoDB is chosen, we must implement application-level checks to ensure no duplicate 
short_code generation occurs during collisions, as cross-document transactions are more expensive        
than in SQL.