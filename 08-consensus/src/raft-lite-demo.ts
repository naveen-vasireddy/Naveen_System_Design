type NodeState = 'FOLLOWER' | 'CANDIDATE' | 'LEADER';

interface LogEntry {
  term: number;
  command: string;
}

class RaftNode {
  public state: NodeState = 'FOLLOWER';
  public currentTerm: number = 0;
  public log: LogEntry[] = [];
  
  private votedFor: string | null = null;
  private votesReceived: number = 0;
  private peers: RaftNode[] = [];

  constructor(public id: string) {}

  public connect(peers: RaftNode[]) {
    this.peers = peers.filter(p => p.id !== this.id);
  }

  // --- 1. LEADER ELECTION ---
  public startElection() {
    this.state = 'CANDIDATE';
    this.currentTerm++;
    this.votedFor = this.id;
    this.votesReceived = 1; // Vote for self
    
    console.log(`[Election] Node ${this.id} becoming CANDIDATE for term ${this.currentTerm}`);

    // Request votes from peers
    for (const peer of this.peers) {
      const granted = peer.requestVote(this.currentTerm, this.id);
      if (granted) this.votesReceived++;
    }

    // Check for quorum (majority)
    const majority = Math.floor((this.peers.length + 1) / 2) + 1;
    if (this.votesReceived >= majority) {
      console.log(`\n👑 [Election] Node ${this.id} WON election with ${this.votesReceived} votes! Becoming LEADER.\n`);
      this.state = 'LEADER';
      this.sendHeartbeats();
    } else {
      console.log(`[Election] Node ${this.id} lost election. Back to FOLLOWER.`);
      this.state = 'FOLLOWER';
    }
  }

  public requestVote(candidateTerm: number, candidateId: string): boolean {
    if (candidateTerm > this.currentTerm) {
      this.currentTerm = candidateTerm;
      this.state = 'FOLLOWER';
      this.votedFor = candidateId;
      console.log(`   -> Node ${this.id} voted for ${candidateId}`);
      return true;
    }
    return false;
  }

  // --- 2. LOG REPLICATION ---
  public executeCommand(command: string) {
    if (this.state !== 'LEADER') {
      console.log(`[Error] Node ${this.id} is not the Leader. Cannot accept writes.`);
      return;
    }

    console.log(`[Write] Leader ${this.id} received command: "${command}"`);
    const entry = { term: this.currentTerm, command };
    this.log.push(entry);

    // Replicate to followers
    let ackCount = 1; // Leader automatically acknowledges
    for (const peer of this.peers) {
      const success = peer.appendEntries(this.currentTerm, this.id, entry);
      if (success) ackCount++;
    }

    const majority = Math.floor((this.peers.length + 1) / 2) + 1;
    if (ackCount >= majority) {
      console.log(`[Commit] Command "${command}" committed to Quorum (${ackCount} nodes) ✅\n`);
    }
  }

  public appendEntries(leaderTerm: number, leaderId: string, entry?: LogEntry): boolean {
    if (leaderTerm >= this.currentTerm) {
      this.currentTerm = leaderTerm;
      this.state = 'FOLLOWER'; // Acknowledge leader authority
      
      if (entry) {
        this.log.push(entry);
        console.log(`   -> Node ${this.id} replicated log: "${entry.command}"`);
      }
      return true;
    }
    return false;
  }

  public sendHeartbeats() {
    if (this.state === 'LEADER') {
      for (const peer of this.peers) {
        peer.appendEntries(this.currentTerm, this.id);
      }
    }
  }
}

// --- DEMO EXECUTION ---
function runRaftDemo() {
  console.log("=== STARTING RAFT-LITE CLUSTER DEMO ===\n");

  // Initialize a 3-node cluster
  const nodeA = new RaftNode("A");
  const nodeB = new RaftNode("B");
  const nodeC = new RaftNode("C");

  nodeA.connect([nodeB, nodeC]);
  nodeB.connect([nodeA, nodeC]);
  nodeC.connect([nodeA, nodeB]);

  // 1. Simulate a network timeout triggering an election on Node B
  nodeB.startElection();

  // 2. Client attempts to write data through the Leader
  nodeB.executeCommand("SET user_123_status = 'active'");
  nodeB.executeCommand("SET cluster_config = 'v2'");

  // 3. Print final state
  console.log("=== FINAL CLUSTER STATE ===");
  console.log(`Node A (${nodeA.state}) Log:`, nodeA.log.map(l => l.command));
  console.log(`Node B (${nodeB.state}) Log:`, nodeB.log.map(l => l.command));
  console.log(`Node C (${nodeC.state}) Log:`, nodeC.log.map(l => l.command));
}

runRaftDemo();