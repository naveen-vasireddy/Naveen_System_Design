import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './logger'; // From Day 42

const logger = new Logger('gateway-service');

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. Extract existing correlation ID or generate a new one
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

  // 2. Attach it to the request object so downstream handlers can use it
  req.headers['x-correlation-id'] = correlationId;
  (req as any).correlationId = correlationId;

  // 3. Attach it to the response header so the client knows it
  res.setHeader('x-correlation-id', correlationId);

  // 4. Log the incoming request with the correlation ID
  logger.info(`Incoming ${req.method} ${req.path}`, {}, correlationId);

  next();
};