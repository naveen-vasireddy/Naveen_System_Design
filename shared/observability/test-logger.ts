import { Logger } from './logger';

const logger = new Logger('test-service');

logger.info('Server started', { port: 8080 });
logger.warn('High memory usage', { memoryUsage: '85%' });
logger.error('DB Connection failed', { error: 'ECONNREFUSED' }, 'req-12345-abcde');