// 05-ecommerce/src/security.ts

/**
 * 1. Audit Logs
 * Appends administrative actions to a traceable log.
 */
export class AuditLogger {
  static logs: Array<{ adminId: string; action: string; timestamp: Date; payload: any }> = [];

  static logAction(adminId: string, action: string, payload: any) {
    const entry = { adminId, action, timestamp: new Date(), payload };
    this.logs.push(entry);
    console.log(`[AUDIT LOG] ${entry.timestamp.toISOString()} | Admin: ${adminId} | Action: ${action}`);
  }
}

/**
 * 2. Admin RBAC (Role-Based Access Control)
 * Ensures only users with the 'admin' role can execute sensitive functions.
 */
export function requireAdmin(user: { id: string; role: string }) {
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN: Admin privileges required.');
  }
}

/**
 * 3. Input Validation
 * Validates incoming payloads to prevent bad data or injection attacks.
 */
export function validateProductPayload(payload: any) {
  if (!payload.name || typeof payload.name !== 'string') {
    throw new Error('BAD_REQUEST: Product name is required and must be a string.');
  }
  if (!payload.price || typeof payload.price !== 'number' || payload.price <= 0) {
    throw new Error('BAD_REQUEST: Product price must be a positive number.');
  }
  return true;
}

/**
 * Example Admin Endpoint logic combining all three policies:
 */
export function createProductEndpoint(user: any, productPayload: any) {
  // Step A: RBAC Check
  requireAdmin(user);
  
  // Step B: Input Validation
  validateProductPayload(productPayload);
  
  // Step C: Execute Business Logic (Mocked)
  const newProduct = { id: 'prod-999', ...productPayload };
  
  // Step D: Audit the Action
  AuditLogger.logAction(user.id, 'CREATE_PRODUCT', newProduct);
  
  return newProduct;
}
