// shared/outbox/demo.ts
import { consumeEvent, OutboxMessage } from './consumer';
import { v4 as uuidv4 } from 'uuid'; // You might need to install uuid if not present: npm i uuid @types/uuid
// OR use a simple random string generator if you don't want to install dependencies:
const generateId = () => Math.random().toString(36).substring(7);

// --- 1. SIMULATED DATABASE ---
interface Order {
  id: string;
  amount: number;
}

// In-memory "Tables"
const ordersTable: Order[] = [];
const outboxTable: { id: string; message: OutboxMessage; published: boolean }[] = [];

// Simulate a DB Transaction (All or Nothing)
function createOrderWithOutbox(amount: number) {
  const orderId = generateId();
  const eventId = generateId();

  console.log(`\n[Transaction] 🔄 Beginning transaction for Order ${orderId}...`);

  // Step A: Write to "Orders" Table
  const newOrder = { id: orderId, amount };
  ordersTable.push(newOrder);
  console.log(`[Transaction] 💾 Saved Order to DB.`);

  // Step B: Write to "Outbox" Table (Same Transaction)
  const event: OutboxMessage = {
    id: eventId,
    eventType: 'ORDER_CREATED',
    payload: { orderId, amount }
  };
  outboxTable.push({ id: eventId, message: event, published: false });
  console.log(`[Transaction] 📮 Saved Event to Outbox Table.`);

  console.log(`[Transaction] ✅ COMMIT success.`);
}

// --- 2. OUTBOX WORKER (Background Process) ---
async function startOutboxWorker() {
  console.log(`[Worker] 👷 Starting Outbox Publisher...`);

  setInterval(async () => {
    // Find unpublished events
    const pendingEvents = outboxTable.filter(row => !row.published);

    if (pendingEvents.length === 0) return;

    for (const row of pendingEvents) {
      console.log(`[Worker] 📤 Publishing event ${row.id}...`);
      
      // Simulate Network Publish to the Consumer
      // In real life, this would be: await kafka.send(...)
      const success = await consumeEvent(row.message);

      if (success) {
        row.published = true;
        console.log(`[Worker] 📩 ACK received. Marked ${row.id} as published.`);
      } else {
        console.log(`[Worker] ❌ Publish failed. Will retry next tick.`);
      }
    }
  }, 2000); // Check every 2 seconds
}

// --- 3. RUN SIMULATION ---
async function run() {
  // Start the worker
  startOutboxWorker();

  // Create an order (Triggering the Outbox pattern)
  createOrderWithOutbox(99.99);

  // Wait a bit, then create another to show continuous processing
  setTimeout(() => {
    createOrderWithOutbox(50.00);
  }, 5000);
}

run();