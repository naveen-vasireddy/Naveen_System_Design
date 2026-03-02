# Kafka Event Schemas (Saga Choreography/Orchestration)

To process an order across our Bounded Contexts, our services will publish and subscribe to the following Kafka topics and event schemas.

## 1. Topic: `orders.events`
Published by the Orders Service when a user first places an order.

**Event: OrderCreated**
```json
{
  "eventId": "uuid-1234",
  "eventType": "OrderCreated",
  "orderId": "ord-789",
  "userId": "user-456",
  "items": [
    { "productId": "prod-xyz", "quantity": 1 }
  ],
  "totalAmount": 99.99,
  "timestamp": "2026-03-02T12:00:00Z"
}
```
## 2. Topic: `inventory.events`
Published by the Inventory Service after it receives the OrderCreated event and attempts to deduct stock in Redis.
Event: InventoryReserved (or InventoryFailed)
```json
{
  "eventId": "uuid-5678",
  "eventType": "InventoryReserved",
  "orderId": "ord-789",
  "status": "SUCCESS", 
  "reason": null,
  "timestamp": "2026-03-02T12:00:01Z"
}
```
(Note: If status is FAILED, the reason might be "OUT_OF_STOCK", prompting the Orders service to fail the Saga).
## 3. Topic: `payments.events`
Published by the Payments Service after it attempts to charge the user's credit card via an external gateway like Stripe.
Event: PaymentProcessed
```json
{
  "eventId": "uuid-9012",
  "eventType": "PaymentProcessed",
  "orderId": "ord-789",
  "status": "SUCCESS",
  "transactionId": "ch_1N2M3L4K5J6",
  "timestamp": "2026-03-02T12:00:02Z"
}
```
