// shared/queue-sim/basic.ts

interface Message {
    id: string;
    content: string;
}

// Simulates a database of processed IDs for deduplication
const processedIds = new Set<string>();

/**
 * Simulates a Consumer receiving a message.
 * Returns TRUE if processing was successful, FALSE if it crashed.
 */
function consumer(msg: Message, enableDedupe: boolean): boolean {
    console.log(`[Consumer] 📥 Received: "${msg.content}" (ID: ${msg.id})`);

    // 2. EXACTLY-ONCE LOGIC (Idempotency)
    if (enableDedupe) {
        if (processedIds.has(msg.id)) {
            console.log(`[Consumer] 🛑 Duplicate detected! Ignoring ID: ${msg.id}`);
            return true; // We acknowledge it so producer stops retrying
        }
        processedIds.add(msg.id);
    }

    // 1. Processing Logic (e.g., charge credit card, update DB)
    console.log(`[Consumer] ✅ Processed successfully.`);
    return true;
}

/**
 * Simulates a Flaky Network.
 * Sometimes the request reaches the consumer, but the ACK fails to get back.
 */
async function sendWithRetries(msg: Message, dedupe: boolean) {
    let attempts = 0;
    let acknowledged = false;

    while (!acknowledged && attempts < 5) {
        attempts++;
        console.log(`\n[Producer] 📤 Sending (Attempt ${attempts})...`);

        // Simulate Network: 50% chance the ACK is lost AFTER consumer processes it
        const processingSuccess = consumer(msg, dedupe);
        
        // Simulating the "ACK" getting lost on the way back
        const networkFail = Math.random() < 0.5; 

        if (processingSuccess && !networkFail) {
            console.log(`[Producer] 📩 ACK received. Done.`);
            acknowledged = true;
        } else {
            console.log(`[Producer] ❌ No ACK received (Network Packet Loss). Retrying...`);
            // Wait briefly before retry
            await new Promise(r => setTimeout(r, 500));
        }
    }
}

// RUN THE SIMULATION
async function run() {
    const msg: Message = { id: "order_123", content: "Charge $50" };

    console.log("--- SCENARIO 1: At-Least-Once (No Dedupe) ---");
    // Without dedupe, retries cause the logic to run multiple times
    processedIds.clear();
    await sendWithRetries(msg, false);

    console.log("\n\n--- SCENARIO 2: Exactly-Once (With Dedupe) ---");
    // With dedupe, the logic runs once, even if we receive it multiple times
    processedIds.clear();
    await sendWithRetries(msg, true);
}

run();
