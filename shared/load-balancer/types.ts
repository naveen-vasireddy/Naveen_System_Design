/**
 * Represents a backend server in the simulation.
 * The activeConnections field is critical for the 
 * Least-Connections algorithm required for Day 13.
 */
export interface Server {
  id: string;
  url: string;
  activeConnections: number; // Tracks current load
}

/**
 * Initial configuration for the 5-server cluster 
 * specified in the Day 13 requirements.
 */
export const MOCK_SERVERS: Server[] = [
  { id: 'srv-1', url: 'http://server-1.internal', activeConnections: 0 },
  { id: 'srv-2', url: 'http://server-2.internal', activeConnections: 0 },
  { id: 'srv-3', url: 'http://server-3.internal', activeConnections: 0 },
  { id: 'srv-4', url: 'http://server-4.internal', activeConnections: 0 },
  { id: 'srv-5', url: 'http://server-5.internal', activeConnections: 0 },
];