import { ClusterManager } from './clusterManager';

const cluster = new ClusterManager();

console.log('--- Initializing Cluster with 3 Nodes ---');
cluster.addNode('Node_A:6379');
cluster.addNode('Node_B:6380');
cluster.addNode('Node_C:6381');

const keys = [];
for (let i = 0; i < 50; i++) {
  keys.push(`key:${i}`); 
}
console.log('\n--- Routing Check ---');
keys.forEach(key => {
    const node = cluster.getNodeForKey(key);
    console.log(`Key "${key}" \t-> routes to \t${node}`);
});

console.log('\n--- Scaling Event: Node_C Dies ---');
cluster.removeNode('Node_C:6381');

console.log('\n--- Re-Routing Check ---');
keys.forEach(key => {
    const node = cluster.getNodeForKey(key);
    console.log(`Key "${key}" \t-> routes to \t${node}`);
});