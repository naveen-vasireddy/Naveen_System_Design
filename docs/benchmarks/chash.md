| Metric                 | Value               |
|------------------------|---------------------|
| Total Keys Tested      | 10,000              |
| Initial Node Count     | 4 (Node-A, Node-B, Node-C, Node-D) |
| Final Node Count       | 5 (Added Node-E)     |
| Keys Moved             | 1,900               |
| Movement Percentage    | 19.00%              |
| Target Threshold       | < 25.00%            |
| Status                 | PASS                |

Observations:
- Adding a 5th node resulted in exactly 19% movement, which is near the mathematical ideal of 20% (1/N
where N=5).
- The virtual nodes (set to 100 replicas on Day 20) successfully "smeared" the hash space, preventing the       
new node from "stealing" an unfairly large chunk of data from only one neighbor.
- This stability is critical for the upcoming Distributed Cache (Day 37) and AI Orchestrator (Day 87) 
where high data churn during scaling would degrade performance.