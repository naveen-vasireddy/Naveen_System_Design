# Architecture: URL Shortener

```mermaid
graph TD
    Client[Client / User] -->|POST /shorten| LB[Load Balancer / API Gateway]
    Client -->|GET /:code| LB
    
    subgraph "Service Boundary"
        LB --> API[Node.js API Service]
        
        API -->|1. Check Cache| Redis[(Redis Cache)]
        
        API -- Cache Miss --> DB[(Database / Persistent Store)]
        API -- Async Write --> DB
    end
    
    Redis -.->|TTL Expiry| API