# Integration Notes: Logical Clocks in Real-Time Chat

## The Problem: Network Jitter and Clock Skew
In our initial Real-Time Chat implementation (Project 4), messages were appended to the chat room history based on the physical time they arrived at the server. This created a severe vulnerability to **causality violations** due to network latency:
1. Alice sends Message A (e.g., "What is the password?").
2. Bob receives Message A and immediately sends Message B (e.g., "It's 12345").
3. If Alice's connection experiences network jitter, Bob's message might reach our backend server *before* Alice's message.
4. If we sort by server arrival time or skewed physical client clocks, the UI will show Bob answering a question that hasn't been asked yet.

## The Solution: Lamport Timestamps
To guarantee strict causal ordering, we integrated **Lamport Logical Clocks** into the chat event flow. 

### How it works:
1. **Client-Side Tick:** Every chat client maintains a logical integer counter. When Alice sends a message, her client increments the counter and attaches it to the message payload (e.g., `LogicalTime: 1`).
2. **Causal Updates:** When Bob receives Alice's message, his client updates its own internal clock to be `max(local_clock, message_clock) + 1`. When Bob replies, his message is mathematically guaranteed to have a higher logical timestamp (e.g., `LogicalTime: 2`).
3. **Backend Sorting:** When the backend `ChatRoom` receives messages, it no longer relies on physical arrival time. Instead, it sorts the internal message array strictly by the `logicalTimestamp`. 

## UI Implications
While the backend uses logical time to safely order the array and prevent race conditions, displaying "Time: 42" to a human user is confusing. Therefore, the message schema retains the `physicalTimestamp` (Wall-Clock time) strictly for display purposes on the frontend. The backend orders by logical time, and the frontend displays the physical time.