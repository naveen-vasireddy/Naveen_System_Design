import { OrderSagaOrchestrator } from '../src/orchestrator';

describe('OrderSagaOrchestrator', () => {
  let orchestrator: OrderSagaOrchestrator;

  beforeEach(() => {
    // Initialize a fresh orchestrator before each test
    orchestrator = new OrderSagaOrchestrator();
  });

  it('should successfully complete the saga for a valid order', async () => {
    // In our mock PaymentsAPI, amounts <= 1000 succeed
    const result = await orchestrator.processCheckout('order-123', [{ id: 'item-1' }], 500);
    
    expect(result).toBe('SUCCESS');
  });

  it('should trigger compensations (release inventory) if payment fails', async () => {
    // In our mock PaymentsAPI, amounts > 1000 simulate a declined card
    const result = await orchestrator.processCheckout('order-999', [{ id: 'item-2' }], 5000);
    
    expect(result).toBe('FAILED');
    // If you watch your console output when running this, you will see the 
    // [Inventory] COMPENSATION: Releasing stock... log fire!
  });
});