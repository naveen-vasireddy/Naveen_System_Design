
// 1. Define our Immutable Events
type OrderEvent = 
  | { type: 'OrderCreated'; orderId: string; customerId: string; timestamp: number }
  | { type: 'ItemAdded'; orderId: string; itemName: string; price: number; timestamp: number }
  | { type: 'OrderShipped'; orderId: string; timestamp: number };

// 2. The Event Store (Append-Only Log)
class EventStore {
  private log: OrderEvent[] = [];

  // Write Path (Command)
  public append(event: OrderEvent) {
    console.log(`[EventStore] Appending Event: ${event.type} for Order ${event.orderId}`);
    this.log.push(event);
  }

  // Get all events for a specific aggregate (Order)
  public getEventsByOrderId(orderId: string): OrderEvent[] {
    return this.log.filter(e => e.orderId === orderId).sort((a, b) => a.timestamp - b.timestamp);
  }
}

// 3. The Materialized View (Read Model)
interface OrderReadModel {
  orderId: string;
  customerId: string;
  status: 'PENDING' | 'SHIPPED';
  totalAmount: number;
  items: string[];
}

class OrderMaterializedView {
  // In a real system, this Map would be a Postgres table or Redis hash optimized for fast reads
  private view = new Map<string, OrderReadModel>();

  // This function simulates processing events from a message broker to update the read view
  public handleEvent(event: OrderEvent) {
    let order = this.view.get(event.orderId);

    switch (event.type) {
      case 'OrderCreated':
        this.view.set(event.orderId, {
          orderId: event.orderId,
          customerId: event.customerId,
          status: 'PENDING',
          totalAmount: 0,
          items: []
        });
        break;

      case 'ItemAdded':
        if (order) {
          order.items.push(event.itemName);
          order.totalAmount += event.price;
        }
        break;

      case 'OrderShipped':
        if (order) {
          order.status = 'SHIPPED';
        }
        break;
    }
  }

  // Read Path (Query) - Lightning fast, no complex joins or calculations required!
  public getOrder(orderId: string): OrderReadModel | undefined {
    return this.view.get(orderId);
  }
}

// --- DEMO EXECUTION ---
async function runDemo() {
  console.log("=== STARTING EVENT SOURCING & CQRS DEMO ===\n");
  
  const eventStore = new EventStore();
  const orderView = new OrderMaterializedView();

  // Helper to simulate saving an event and immediately updating the read model
  const publishEvent = (event: OrderEvent) => {
    eventStore.append(event);
    orderView.handleEvent(event);
  };

  const orderId = "ORD-123";

  // 1. Simulate a user taking actions (Commands)
  publishEvent({ type: 'OrderCreated', orderId, customerId: "CUST-99", timestamp: Date.now() });
  publishEvent({ type: 'ItemAdded', orderId, itemName: "Mechanical Keyboard", price: 150, timestamp: Date.now() + 10 });
  publishEvent({ type: 'ItemAdded', orderId, itemName: "Wireless Mouse", price: 80, timestamp: Date.now() + 20 });
  publishEvent({ type: 'OrderShipped', orderId, timestamp: Date.now() + 30 });

  // 2. Query the Read Model (CQRS)
  console.log("\n[Client Query] Fetching current order state from Materialized View...");
  console.log(orderView.getOrder(orderId));

  // 3. Time-Travel Debugging (Audit Log)
  console.log("\n[Audit] Fetching raw immutable event history from the Append-Only Log...");
  console.log(eventStore.getEventsByOrderId(orderId));
}

runDemo();