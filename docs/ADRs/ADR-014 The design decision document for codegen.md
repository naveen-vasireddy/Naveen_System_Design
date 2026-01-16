# ADR-014: Codegen & Collision Strategy
• Status: Accepted.
• Context: We need a way to generate unique, short identifiers for URLs.

• Decision: Use Base62 random generation (6 characters) combined with a Retry-on-Collision strategy.

• Rationale:
    ◦ Base62: Provides ~56 billion possible combinations while being case-sensitive and alphanumeric, keeping        
URLs short.
    ◦ Random vs. Counter: Random strings are not predictable, preventing attackers from "guessing" other 
shortened URLs.
    ◦ Collision Strategy: Upon generating a code, the system checks the Redis cache (and eventually the DB). If      
a collision is detected, the system will regenerate the code up to 3 times before failing.

• Consequences: There is a slight latency penalty on writes due to the existence check, but the read path
remains O(1).