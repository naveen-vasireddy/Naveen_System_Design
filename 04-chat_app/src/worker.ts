import { Client } from 'pg';
import Redis from 'ioredis';

// Setup connections (Assume these are configured via ENV vars in production)
const db = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/chat' });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function processOutbox() {
  try {
    // 1. Begin Transaction
    await db.query('BEGIN');

    // 2. Lock rows so multiple workers don't grab the same messages (SKIP LOCKED is crucial here)
    const { rows } = await db.query(`
      SELECT id, payload FROM outbox 
      WHERE status = 'PENDING' 
      ORDER BY created_at ASC 
      FOR UPDATE SKIP LOCKED 
      LIMIT 100
    `);

    if (rows.length === 0) {
      await db.query('COMMIT');
      return; // Nothing to do
    }

    console.log(`[Worker] Found ${rows.length} pending messages. Publishing...`);

    // 3. Publish to Redis Pub/Sub (or Kafka Topic)
    for (const row of rows) {
      // In a real app, you might publish to a channel specific to the room: `room:${row.payload.roomId}`
      await redis.publish('chat-messages-topic', JSON.stringify(row.payload));
    }

    // 4. Mark as PUBLISHED (or delete them to save space)
    const ids = rows.map(r => r.id);
    await db.query(`
      UPDATE outbox 
      SET status = 'PUBLISHED' 
      WHERE id = ANY($1)
    `, [ids]);

    // 5. Commit Transaction
    await db.query('COMMIT');
    console.log(`[Worker] Successfully published ${rows.length} messages.`);

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('[Worker] Error processing outbox:', error);
  }
}

// Start the worker loop
async function start() {
  await db.connect();
  console.log('[Worker] Outbox processor started.');
  
  // Poll every 1 second
  setInterval(processOutbox, 1000);
}

start();