import Redis from 'ioredis';

const redis = new Redis('redis://localhost:6379');
let count = 0;

console.log('Firing messages into the system...');

// Fire a message every 50 milliseconds (20 messages per second)
setInterval(() => {
  const message = {
    roomId: 'room-1',
    id: count++,
    text: `Load test message ${count}`,
    timestamp: Date.now() // This is what the simulation script uses to calculate latency!
  };

  redis.publish('chat-messages-topic', JSON.stringify(message));
  
  if (count % 100 === 0) {
    console.log(`[FireMessages] Published ${count} messages`);
  }
}, 50);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n[FireMessages] Shutting down (published ${count} messages total)`);
  process.exit(0);
});