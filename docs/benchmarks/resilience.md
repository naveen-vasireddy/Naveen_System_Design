 | Scenario                | Success Rate   | Total Time    | Insight
                                            |
|-------------------------|---------------|--------------|------------------------------------------|-------------------------|---------------|--------------|-------------------------------------------------------------------------------------|
| Baseline                | 78.8%         | 62,615ms      | Matches the ~20% failure rate; no
protection results in unacceptable availability.   |
| Retries Only            | 100.0%        | 84,871ms      | High availability, but at the cost of        
significant tail latency and resource consumption. |
| Integrated (CB + Retries) | 99.9%          | 81,601ms      | Optimal balance; maintains high
availability while "failing fast" to save ~3.2 seconds of system time.   |