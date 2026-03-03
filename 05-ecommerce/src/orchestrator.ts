
/**
 * Mock APIs to simulate our Bounded Contexts
 */
const InventoryAPI = {
  reserve: async (orderId: string, items: any[]) => {
    console.log(`[Inventory] Reserving stock for order ${orderId}...`);
    return true; // Assume success for now
  },
  release: async (orderId: string, items: any[]) => {
    console.log(`[Inventory] COMPENSATION: Releasing stock for order ${orderId}...`);
    return true; 
  }
};

const PaymentsAPI = {
  charge: async (orderId: string, amount: number) => {
    console.log(`[Payments] Attempting to charge $${amount} for order ${orderId}...`);
    // We will simulate a failure or success based on the amount in our tests
    if (amount > 1000) return false; // Fail large orders
    return true;
  }
};

const OrdersDB = {
  updateStatus: async (orderId: string, status: 'PENDING' | 'RESERVED' | 'FINALIZED' | 'FAILED') => {
    console.log(`[Orders DB] Order ${orderId} status changed to: ${status}`);
  }
};

/**
 * The Saga Orchestrator
 */
export class OrderSagaOrchestrator {
  
  async processCheckout(orderId: string, items: any[], totalAmount: number) {
    console.log(`\n--- Starting Saga for Order: ${orderId} ---`);
    await OrdersDB.updateStatus(orderId, 'PENDING');

    try {
      // STEP 1: Reserve Inventory
      const inventoryReserved = await InventoryAPI.reserve(orderId, items);
      if (!inventoryReserved) {
        throw new Error('INVENTORY_RESERVATION_FAILED');
      }
      await OrdersDB.updateStatus(orderId, 'RESERVED');

      // STEP 2: Charge Payment
      const paymentSuccess = await PaymentsAPI.charge(orderId, totalAmount);
      if (!paymentSuccess) {
        // COMPENSATION TRIGGERED!
        console.warn(`[Orchestrator] Payment failed! Triggering compensations...`);
        await InventoryAPI.release(orderId, items);
        throw new Error('PAYMENT_FAILED');
      }

      // STEP 3: Finalize Order
      await OrdersDB.updateStatus(orderId, 'FINALIZED');
      console.log(`--- Saga Completed Successfully for Order: ${orderId} ---\n`);
      return 'SUCCESS';

    } catch (error: any) {
      await OrdersDB.updateStatus(orderId, 'FAILED');
      console.error(`--- Saga Aborted for Order: ${orderId} | Reason: ${error.message} ---\n`);
      return 'FAILED';
    }
  }
}

