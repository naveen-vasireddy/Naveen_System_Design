// 05-ecommerce/src/reliability.ts

// In production, this must be a distributed cache like Redis 
// so all API instances share the same idempotency state.
const idempotencyCache = new Map<string, string>(); 

export class ReliabilityModule {
  
  /**
   * 1. Idempotency Keys on Orders
   * Checks if a checkout request with this exact key has already been processed.
   */
  static async checkOrderIdempotency(idempotencyKey: string): Promise<string | null> {
    if (idempotencyCache.has(idempotencyKey)) {
      console.log(`[Idempotency] CACHE HIT for key ${idempotencyKey}. Skipping Saga and returning cached response.`);
      return idempotencyCache.get(idempotencyKey) || null;
    }
    return null;
  }

  static async saveOrderResponse(idempotencyKey: string, response: string) {
    // Save the successful response so future retries get the same result
    idempotencyCache.set(idempotencyKey, response);
  }

  /**
   * 2. Retry-Safe Payments
   * Wraps the external payment call (e.g., Stripe) with exponential backoff and retries.
   * Passing the idempotency key ensures Stripe won't double-charge if we retry a timeout.
   */
  static async processPaymentWithRetry(orderId: string, amount: number, idempotencyKey: string, maxRetries = 3) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`[Payments] Attempt ${attempt}: Charging $${amount} for order ${orderId} (Stripe Key: ${idempotencyKey})`);
        
        // Simulate an unreliable network call to a payment gateway
        const networkSuccess = Math.random() > 0.3; // 30% chance of a random network timeout
        
        if (!networkSuccess) {
           throw new Error('Network Timeout during Payment Gateway call');
        }
        
        console.log(`[Payments] Charge successful on attempt ${attempt}`);
        return true; // Payment succeeded
        
      } catch (error: any) {
        console.warn(`[Payments] Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries) {
           console.error(`[Payments] Max retries reached. Failing payment.`);
           return false; // Payment failed after all retries
        }
        
        // Exponential backoff before retrying (100ms, 200ms, 400ms...)
        const delay = Math.pow(2, attempt) * 100;
        console.log(`[Payments] Waiting ${delay}ms before retrying...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
}