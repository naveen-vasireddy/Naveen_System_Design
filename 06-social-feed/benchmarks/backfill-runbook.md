# Runbook: Outage Recovery & Backfill

## Scenario
The `feed.fanout` workers or the message broker (e.g., Kafka/Redis) experienced downtime. As a result, users' posts were saved to the primary database but were **not** successfully fanned out to their followers' timelines.

## Resolution Steps
1. **Restore Infrastructure:** Ensure the message broker and worker instances are back online, healthy, and ready to accept new jobs.
2. **Identify the Downtime Window:** Check your observability metrics (Grafana/Datadog) to find the exact Unix timestamp when the worker throughput dropped to 0.
3. **Trigger the Backfill Script:** 
   Run the backfill utility from the admin console or CLI, passing the downtime timestamp. This will query the database for all posts created after that time and push them back into the fan-out queue.
   ```bash
   npm run backfill -- --since=1715000000
Monitor for Duplicates (Duplicate Suppression): Due to our idempotency constraints (ON CONFLICT DO NOTHING in the timeline database schema), it is perfectly safe to slightly overestimate the downtime window. The database will automatically suppress any duplicate inserts if the system accidentally replays fan-out messages that were already processed just before the crash.
