// 1. The Logical Clock (Lamport)
class LamportClock {
  public time: number = 0;
  
  public tick() { 
    this.time++; 
  }
  
  public update(receivedTime: number) { 
    this.time = Math.max(this.time, receivedTime) + 1; 
  }
}

// 2. The Chat Message Event Schema
interface ChatMessage {
  messageId: string;
  roomId: string;
  senderId: string;
  content: string;
  logicalTimestamp: number; // Used for strict causal ordering in the backend
  physicalTimestamp: number; // Kept strictly for the UI to display (e.g., "10:05 AM")
}

// 3. The Backend Chat Room (Message Store)
class ChatRoom {
  private messages: ChatMessage[] = [];
  private roomClock = new LamportClock();

  public receiveMessage(msg: ChatMessage) {
    // 1. Update the server's logical clock based on the incoming message
    this.roomClock.update(msg.logicalTimestamp);

    // 2. Finalize the message with the server's authoritative logical time
    const finalizedMessage = {
      ...msg,
      logicalTimestamp: this.roomClock.time
    };

    this.messages.push(finalizedMessage);
    
    // 3. Sort messages by logical timestamp to guarantee causality.
    // We ONLY fall back to physical time if there is an exact logical tie (concurrent events).
    this.messages.sort((a, b) => {
      if (a.logicalTimestamp === b.logicalTimestamp) {
        return a.physicalTimestamp - b.physicalTimestamp;
      }
      return a.logicalTimestamp - b.logicalTimestamp;
    });

    console.log(`[Server] Processed message from ${msg.senderId}. Room Logical Time: ${this.roomClock.time}`);
  }

  public getOrderedMessages() {
    return this.messages;
  }
}

// 4. The Frontend Client
class ChatClient {
  public clientClock = new LamportClock();

  constructor(public clientId: string) {}

  public sendMessage(content: string, roomId: string): ChatMessage {
    this.clientClock.tick(); // Increment logical clock on local action
    
    return {
      messageId: `msg-${Math.random().toString(36).substring(2, 7)}`,
      roomId,
      senderId: this.clientId,
      content,
      logicalTimestamp: this.clientClock.time,
      physicalTimestamp: Date.now() // Wall-clock time for the UI display
    };
  }
}

// --- INTEGRATION DEMO ---
function runChatIntegration() {
  console.log("=== CHAT LOGICAL CLOCK INTEGRATION ===\n");
  const room = new ChatRoom();
  const alice = new ChatClient("Alice");
  const bob = new ChatClient("Bob");

  // 1. Alice sends a message first
  const msg1 = alice.sendMessage("Hello everyone! This is the first message.", "room-1");
  
  // 2. Bob sends a message second
  const msg2 = bob.sendMessage("Hi Alice! Replying to your first message.", "room-1");

  // 3. SIMULATE NETWORK OUT-OF-ORDER DELIVERY
  // Bob's message arrives at the server IMMEDIATELY
  room.receiveMessage(msg2); 

  // Alice's message got stuck in network traffic and arrives 100ms LATE
  setTimeout(() => {
    room.receiveMessage(msg1);

    console.log("\n=== FINAL ORDERED CHAT HISTORY ===");
    console.table(room.getOrderedMessages().map(m => ({
      Sender: m.senderId,
      Message: m.content,
      LogicalTime: m.logicalTimestamp,
      UITime: new Date(m.physicalTimestamp).toLocaleTimeString()
    })));
  }, 100);
}

runChatIntegration();
