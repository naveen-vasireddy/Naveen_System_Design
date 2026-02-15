import net from 'net';
import { LRUCache } from '../../shared/cache/lru';

// Configuration
const PORT = 6381;
const CACHE_SIZE = 1000;
const DEFAULT_TTL = 0; // 0 = Infinity (No expiry)

// Initialize Cache with <string, string> types
const cache = new LRUCache<string, string>(CACHE_SIZE);

const server = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on('data', (data) => {
    // 1. Clean the input
    const commandStr = data.toString().trim();
    if (!commandStr) return; // Ignore empty lines

    // 2. Parse command
    const parts = commandStr.split(' ');
    
    // FIX 1: Access the first element before uppercasing
    const action = parts[0].toUpperCase(); 

    try {
      switch (action) {
        case 'SET': {
          // FIX 2: Access array indices for arguments
          const key = parts[1];
          const value = parts[2];
          const ttlSec = parts[3];
          
          if (!key || !value) {
            socket.write('ERROR: Missing key or value\r\n');
            break;
          }

          // Handle optional TTL
          const ttlMs = ttlSec ? parseInt(ttlSec) * 1000 : Infinity;

          cache.set(key, value, ttlMs);
          socket.write('OK\r\n');
          break;
        }

        case 'GET': {
          const key = parts[1];
          if (!key) {
            socket.write('ERROR: Missing key\r\n');
            break;
          }

          const value = cache.get(key);
          if (value) {
            socket.write(`${value}\r\n`);
          } else {
            socket.write('(nil)\r\n');
          }
          break;
        }

        case 'DEL': {
           // Placeholder for delete
           socket.write('1\r\n'); 
           break;
        }

        case 'PING': {
            socket.write('PONG\r\n');
            break;
        }

        default:
          socket.write('ERROR: Unknown command\r\n');
      }
    } catch (err) {
      socket.write(`ERROR: ${(err as Error).message}\r\n`);
    }
  });

  socket.on('error', (err) => {
    console.error(`Socket error: ${err.message}`);
  });
});

server.listen(PORT, () => {
  console.log(`TCP Cache Server running on port ${PORT}`);
});