import { ClusterManager } from './clusterManager';
import { ReplicationManager } from './replication';

const cluster = new ClusterManager();

// Setup 3 nodes
cluster.addNode('10.0.0.1:6379');
cluster.addNode('10.0.0.2:6379');
cluster.addNode('10.0.0.3:6379');

const replicator = new ReplicationManager(cluster, 3);

async function test() {
  console.log('--- Test 1: Replica Selection ---');
  const key = 'user:123';
  const nodes = replicator.getReplicaSet(key);
  console.log(`Key "${key}" maps to primary + replicas:`, nodes);

  console.log('\n--- Test 2: Distributed Write ---');
  const writeSuccess = await replicator.set(key, 'Naveen');
  console.log('Write result (Quorum met?):', writeSuccess);

  console.log('\n--- Test 3: Read Repair Simulation ---');
  // This will trigger the logic that detects missing data on simulated nodes
  const val = await replicator.get(key); 
  console.log('Final fetched value:', val);
}

test();