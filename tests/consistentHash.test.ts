import { ConsistentHash } from '../shared/consistentHash';

// Configuration
const VIRTUAL_NODES = 100; // As defined in Day 20 [1]
const INITIAL_NODES = ['Node-A', 'Node-B', 'Node-C', 'Node-D'];
const NEW_NODE = 'Node-E';
const TOTAL_KEYS = 10000;

function runMovementTest() {
  const chash = new ConsistentHash(VIRTUAL_NODES);
  
  // 1. Setup Initial Ring
  INITIAL_NODES.forEach(node => chash.addNode(node));
  
  // 2. Map 10,000 keys to their initial nodes
  const initialMappings = new Map<string, string>();
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const key = `key-identifier-${i}`;
    const node = chash.getNode(key);
    if (node) initialMappings.set(key, node);
  }

  console.log(`--- Initial State: ${INITIAL_NODES.length} Nodes ---`);

  // 3. Add the 5th Node (Scale-up Event)
  chash.addNode(NEW_NODE);
  console.log(`Added: ${NEW_NODE}`);

  // 4. Measure Movement
  let movedKeys = 0;
  const newNodeKeys = [];

  for (let i = 0; i < TOTAL_KEYS; i++) {
    const key = `key-identifier-${i}`;
    const newNode = chash.getNode(key);
    const oldNode = initialMappings.get(key);

    if (newNode !== oldNode) {
      movedKeys++;
      if (newNode === NEW_NODE) {
        newNodeKeys.push(key);
      }
    }
  }

  // 5. Calculate Results
  const movementPercentage = (movedKeys / TOTAL_KEYS) * 100;
  
  console.log(`--- Results ---`);
  console.log(`Total Keys: ${TOTAL_KEYS}`);
  console.log(`Keys Moved: ${movedKeys}`);
  console.log(`Movement Percentage: ${movementPercentage.toFixed(2)}%`);
  
  // Check against Day 21 Threshold [1]
  if (movementPercentage < 25) {
    console.log("Status: PASS (<25% movement achieved)");
  } else {
    console.log("Status: FAIL (>25% movement - check virtual node distribution)");
  }
}

runMovementTest();