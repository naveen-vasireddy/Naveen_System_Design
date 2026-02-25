# Recovery Demo Notes: Datacenter Outage Simulation

**Date:** Day 49

## Simulation Steps
1. Started the primary WebSocket gateway and connected a test client.
2. Simulated a hard datacenter crash by manually killing the Gateway process.
3. The client successfully detected the connection drop (`ws.on('close')`).
4. Brought the Gateway back online to simulate traffic routing to a healthy DC.

## Reconnection Strategy Observations
*   **Thundering Herd Prevention:** Implemented exponential backoff. If 10,000 clients disconnect simultaneously, they won't instantly DDoS the recovering server.
*   **Jitter:** Added up to 200ms of random jitter to the backoff delay to spread out the reconnection attempts smoothly.
*   **Recovery:** When the server was restored, the client successfully reconnected automatically on its next backoff cycle.
