import { Server } from './types';

/**
 * Round-robin Load Balancer
 * Distributes requests sequentially across the cluster of 5 servers.
 * Highly predictable but does not account for individual server load.
 */
export class RoundRobinBalancer {
  private currentIndex = 0;
  private servers: Server[];

  constructor(servers: Server[]) {
    if (servers.length === 0) {
      throw new Error("Balancer requires at least one server.");
    }
    this.servers = servers;
  }

  /**
   * Selects the next server in the sequence.
   * @returns The selected Server object
   */
  public getNextServer(): Server {
    const server = this.servers[this.currentIndex];

    // Increment the index and use the modulo operator to 
    // wrap back to 0 once we reach the end of the 5 servers.
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;

    return server;
  }

  /**
   * Utility to see which index is next for the simulation
   */
  public getTargetIndex(): number {
    return this.currentIndex;
  }
}