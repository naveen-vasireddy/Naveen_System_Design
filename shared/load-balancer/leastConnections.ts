import { Server } from './types';

export class LeastConnectionsBalancer {
  constructor(public servers: Server[]) {}

  public getNextServer(): Server {
    // Selects server with the smallest total pressure (active + queue)
    return this.servers.reduce((prev, curr) => {
      const prevLoad = prev.activeConnections + prev.queue.length;
      const currLoad = curr.activeConnections + curr.queue.length;
      return prevLoad < currLoad ? prev : curr;
    });
  }
}