// 1. Define Ecommerce Events (The Append-Only Facts)
type EcommerceEvent = 
  | { type: 'OrderPlaced'; orderId: string; customerId: string; timestamp: number }
  | { type: 'PaymentProcessed'; orderId: string; amount: number; timestamp: number }
  | { type: 'InventoryReserved'; orderId: string; sku: string; timestamp: number }
  | { type: 'OrderShipped'; orderId: string; trackingNumber: string; timestamp: number };

// 2. The Audit Event Store
class AuditEventStore {
  private events: EcommerceEvent[] = [];

  // Write Path (Commands from the Ecommerce System)
  public append(event: EcommerceEvent) {
    this.events.push(event);
  }

  // Read Path (Full Audit Trail)
  public getEventsForOrder(orderId: string): EcommerceEvent[] {
    return this.events.filter(e => e.orderId === orderId).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Read Path (Time-Travel Queries)
  public getEventsUpTo(orderId: string, timestamp: number): EcommerceEvent[] {
    return this.getEventsForOrder(orderId).filter(e => e.timestamp <= timestamp);
  }
}

// 3. The Audit Read Model (Materialized View)
class OrderAuditView {
  // Dynamically calculates the state of an order by replaying a stream of events
  public buildState(events: EcommerceEvent[]) {
    const state: any = { status: 'UNKNOWN', amountPaid: 0, items: [] };
    
    for (const event of events) {
      switch (event.type) {
        case 'OrderPlaced':
          state.status = 'PLACED';
          state.customerId = event.customerId;
          break;
        case 'InventoryReserved':
          state.items.push(event.sku);
          state.status = 'RESERVED';
          break;
        case 'PaymentProcessed':
          state.amountPaid += event.amount;
          state.status = 'PAID';
          break;
        case 'OrderShipped':
          state.status = 'SHIPPED';
          state.trackingNumber = event.trackingNumber;
          break;
      }
    }
    return state;
  }
}

// 4. Integration Demo: Executing an Ecommerce Audit Query
function runAuditQuery() {
  const store = new AuditEventStore();
  const auditView = new OrderAuditView();
  const orderId = "ECOMM-ORD-777";

  // Simulate the E-commerce system saving events over time
  const baseTime = Date.now() - 100000;
  store.append({ type: 'OrderPlaced', orderId, customerId: "CUST-1", timestamp: baseTime });
  store.append({ type: 'InventoryReserved', orderId, sku: "LAPTOP-X1", timestamp: baseTime + 1000 });
  store.append({ type: 'PaymentProcessed', orderId, amount: 1200, timestamp: baseTime + 2000 });
  store.append({ type: 'OrderShipped', orderId, trackingNumber: "TRK-999", timestamp: baseTime + 5000 });

  console.log("=== ECOMMERCE ADMIN AUDIT SYSTEM ===\n");
  
  // Query 1: The Raw Audit Trail
  console.log(`[Audit] Fetching full tamper-proof event trail for Order ${orderId}...`);
  console.log(store.getEventsForOrder(orderId));

  // Query 2: Current Materialized State
  console.log(`\n[Audit] Replaying events to calculate CURRENT order state...`);
  console.log(auditView.buildState(store.getEventsForOrder(orderId)));

  // Query 3: Time-Travel Debugging
  // An admin asks: "What was the state of the order exactly 1.5 seconds after it was placed?"
  const timeTravelTarget = baseTime + 1500;
  console.log(`\n[Audit] TIME-TRAVEL: Calculating order state at timestamp ${timeTravelTarget}...`);
  console.log(auditView.buildState(store.getEventsUpTo(orderId, timeTravelTarget)));
}

runAuditQuery();