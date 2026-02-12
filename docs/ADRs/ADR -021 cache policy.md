# ADR-021: Cache Protocol Design

**Status:** Accepted
**Date:** Day 36

## Context
We are building a distributed cache. We need a way for clients (and other cache nodes) to communicate.
Options:
1.  **HTTP/JSON:** Easy to debug, but high overhead (headers, parsing).
2.  **Binary Protocol:** Extremely efficient (e.g., Protobuf), but hard to debug/implement manually.
3.  **Text Protocol:** Good balance. Readable via `telnet`, easy to parse, lower overhead than HTTP.

## Decision
We will use a **custom Text Protocol** over TCP.
*   Commands are newline (`\r\n`) terminated.
*   Arguments are space-separated.
*   **Trade-off:** We sacrifice some performance (parsing text) for developer experience (debuggability) and simplicity during the learning phase.
