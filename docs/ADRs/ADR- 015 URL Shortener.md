# ADR-015: Layered Defense Strategy for URL Shortener 
Status: Accepted, Date: Day 24

Context:
The URL Shortener service exposes a public write endpoint (POST /shorten). Without protection, this endpoint is      
vulnerable to:
1. Denial of Service (DoS): Malicious actors or bugs in client code could flood the service, exhausting the 
Base62 namespace and database connection limits.
2. Abuse/Phishing: Attackers frequently use URL shorteners to mask malicious links (malware, phishing sites) to      
bypass email filters.
3. Cost: Unchecked writes increase storage costs (Redis/DB) without adding value.

Decision:
We will implement a Layered Defense Strategy consisting of:
1. Per-IP Rate Limiting: Using a Fixed Window algorithm backed by Redis (10 requests per minute).
2. Domain Blocklist: A static application-level validation to reject known malicious domains.
3. Input Validation: Strict parsing of the URL to ensure protocol compliance (HTTP/HTTPS only).

Alternatives Considered:
• User Authentication (API Keys):
    ◦ Pros: Granular control, easy to ban specific users, no NAT issues.
    ◦ Cons: Increases friction for a public demo tool; requires building a user management system (out of scope      
for Phase 1).
• CAPTCHA:
    ◦ Pros: Highly effective against bots.
    ◦ Cons: Destroys the developer experience for API clients (curl/Postman) and adds latency.
• Real-time Reputation Services (e.g., Google Safe Browsing API):
    ◦ Pros: Much more effective than a static blocklist.
    ◦ Cons: Adds significant latency to the write path and introduces external dependencies/costs.

Rationale:
• Simplicity vs. Protection: The Per-IP Rate Limit provides the best balance for this stage. It prevents 
trivial script flooding while maintaining a frictionless "public" API experience.
• Fail-Open: As noted in the implementation, if Redis fails, the rate limiter allows traffic. We prioritize 
Availability over strict protection for this demo service (following the trade-off vocabulary from Day 2).
• Performance: The blocklist check is O(1) (or O(N) on the list size) and happens in memory, adding negligible       
latency.

Consequences:
• False Positives: Users behind shared IP addresses (e.g., corporate NATs, public Wi-Fi) may trigger the rate        
limit collectively.
• Bypass: Sophisticated attackers can rotate IPs or use domains not yet on our static blocklist.
• Maintenance: The blocklist requires manual updates or a sync mechanism to remain effective.