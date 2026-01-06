import { Server } from './types';

export class RoundRobinBalancer {
  private currentIndex = 0;
  constructor(public servers: Server[]) {}

  public getNextServer(): Server {
    const server = this.servers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    return server;
  }
}