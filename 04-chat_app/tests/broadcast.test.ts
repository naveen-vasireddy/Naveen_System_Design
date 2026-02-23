import { BroadcastService, ChatClient } from '../src/broadcast';

// 1. STRONGLY MOCK IOREDIS: Return a dummy object with empty functions 
// so it never attempts a real network connection.
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      subscribe: jest.fn(),
      on: jest.fn(),
    };
  });
});

describe('BroadcastService Backpressure', () => {
  
  // 2. MOCK TIMERS: Prevent setInterval from hanging the test
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.clearAllTimers();
  });

  it('should drop messages when buffer exceeds MAX_BUFFER_SIZE', () => {
    const service = new BroadcastService('redis://localhost:6379');
    
    const mockClient: ChatClient = {
      ws: { readyState: 1, send: jest.fn() } as any,
      userId: 'user-1',
      roomId: 'room-1',
      messageBuffer: []
    };

    service.registerClient(mockClient);

    // 3. Simulate a flood of 101 messages
    for (let i = 0; i < 101; i++) {
      (service as any).enqueueMessage(mockClient, { id: i, text: `Msg ${i}` });
    }

    // 4. Verify the drop strategy worked
    expect(mockClient.messageBuffer.length).toBe(51); 
    expect(mockClient.messageBuffer[0].type).toBe('gap_detected');
    expect(mockClient.messageBuffer[50].id).toBe(100);
  });
});