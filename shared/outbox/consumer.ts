// 1. Simulates a database tracking processed message IDs
const processedIds = new Set<string>();

export interface OutboxMessage {
  id: string;
  eventType: string;
  payload: any;
}

/**
 * Simulates a Consumer that handles duplicates (Idempotency).
 * Returns TRUE if processed (or skipped as duplicate), FALSE if processing failed.
 */
export async function consumeEvent(event: OutboxMessage): Promise<boolean> {
  // 2. IDEMPOTENCY CHECK
  if (processedIds.has(event.id)) {
    console.log(`[Consumer] 🛑 Duplicate detected: ${event.id}. Skipping logic.`);
    return true; // Return true to tell the sender "Stop retrying, I have it."
  }

  // 3. Simulate processing (e.g., sending an email, updating a view)
  const success = Math.random() > 0.3; // 70% success rate to simulate flaky processing

  if (success) {
    processedIds.add(event.id);
    console.log(`[Consumer] ✅ Processed event: ${event.eventType} (Payload: ${JSON.stringify(event.payload)})`);
    return true;
  } else {
    console.log(`[Consumer] 💥 Processing failed for ${event.id}. Will retry.`);
    return false;
  }
}
