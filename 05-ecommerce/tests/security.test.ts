import { requireAdmin, validateProductPayload, createProductEndpoint, AuditLogger } from '../src/security';

describe('Day 67: Security & RBAC Policies', () => {
  const adminUser = { id: 'user-admin', role: 'admin' };
  const standardUser = { id: 'user-123', role: 'customer' };

  it('should reject non-admin users', () => {
    expect(() => requireAdmin(standardUser)).toThrow('FORBIDDEN: Admin privileges required.');
  });

  it('should reject malformed product payloads', () => {
    const badPayload = { name: 'Laptop', price: -50 }; // Negative price
    expect(() => validateProductPayload(badPayload)).toThrow('BAD_REQUEST');
  });

  it('should allow admins to create products and log the action', () => {
    const payload = { name: 'Wireless Mouse', price: 25.99 };
    const startingLogCount = AuditLogger.logs.length;

    const result = createProductEndpoint(adminUser, payload);

    expect(result.id).toBe('prod-999');
    expect(AuditLogger.logs.length).toBe(startingLogCount + 1);
    expect(AuditLogger.logs[AuditLogger.logs.length - 1].action).toBe('CREATE_PRODUCT');
  });
});
