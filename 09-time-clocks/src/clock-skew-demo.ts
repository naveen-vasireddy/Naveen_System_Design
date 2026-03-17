// 1. The Logical Clock
class LamportClock {
  public time: number = 0;

  // Called before any local event or before sending a message
  public tick() {
    this.time++;
  }

  // Called when receiving a message
  public update(receivedTime: number) {
    this.time = Math.max(this.time, receivedTime) + 1;
  }
}

// 2. A Simulated Distributed Node
class SystemNode {
  public logicalClock = new LamportClock();
  
  // clockSkewMs simulates a server whose NTP (Network Time Protocol) is out of sync
  constructor(public id: string, public clockSkewMs: number) {}

  // Simulates reading the system's "wall clock" with the artificial skew
  public getPhysicalTime(): number {
    return Date.now() + this.clockSkewMs;
  }

  public performLocalAction(actionName: string) {
    this.logicalClock.tick();
    console.log(`[Node ${this.id}] ${actionName}`);
    console.log(`   -> Physical Time: ${new Date(this.getPhysicalTime()).toISOString()}`);
    console.log(`   -> Logical Time:  ${this.logicalClock.time}\n`);
  }

  public sendMessage(receiver: SystemNode, message: string) {
    this.logicalClock.tick();
    const sendPhysicalTime = this.getPhysicalTime();
    const sendLogicalTime = this.logicalClock.time;

    console.log(`[Node ${this.id}] Sending: "${message}" to Node ${receiver.id}`);
    console.log(`   -> Physical Time: ${new Date(sendPhysicalTime).toISOString()}`);
    console.log(`   -> Logical Time:  ${sendLogicalTime}\n`);

    // Simulate a 50ms network delay across the wire
    setTimeout(() => {
      receiver.receiveMessage(this.id, message, sendLogicalTime);
    }, 50); 
  }

  public receiveMessage(senderId: string, message: string, senderLogicalTime: number) {
    // Crucial step: The receiver updates its logical clock based on the sender's clock
    this.logicalClock.update(senderLogicalTime);
    const recvPhysicalTime = this.getPhysicalTime();
    
    console.log(`[Node ${this.id}] Received: "${message}" from Node ${senderId}`);
    console.log(`   -> Physical Time: ${new Date(recvPhysicalTime).toISOString()}  <-- SKEW DETECTED!`);
    console.log(`   -> Logical Time:  ${this.logicalClock.time}\n`);
  }
}

// --- DEMO EXECUTION ---
function runClockSkewDemo() {
  console.log("=== STARTING CLOCK SKEW & LAMPORT TIMESTAMP DEMO ===\n");

  // Node A has a normal, accurate physical clock. 
  // Node B's clock is lagging behind by a massive 2 seconds (clock skew).
  const nodeA = new SystemNode("A", 0);
  const nodeB = new SystemNode("B", -2000); 

  // 1. Node A performs a local action
  nodeA.performLocalAction("User clicked checkout");

  // 2. Node A sends a message to Node B to process the payment
  nodeA.sendMessage(nodeB, "Process Payment");
}

runClockSkewDemo();