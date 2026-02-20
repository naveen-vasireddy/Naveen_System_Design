import jwt from 'jsonwebtoken';

// In a real production system, this must be loaded from a secure environment variable.
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-chat-key';

export interface JwtPayload {
  userId: string;
  username: string;
}

export class AuthService {
  /**
   * Generates a token for a user.
   * In a full system, this would be called by your Login REST API.
   */
  static generateToken(userId: string, username: string): string {
    return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' });
  }

  /**
   * Verifies a token and returns the payload if valid.
   * The Gateway will call this when a new WebSocket connection attempts to open.
   */
  static verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('[Auth] Invalid or expired token');
      return null;
    }
  }
}