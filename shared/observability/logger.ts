
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  correlationId?: string; // Critical for tracing across services later (Day 44)
  metadata?: Record<string, any>;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, correlationId?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      correlationId,
      metadata,
    };
    
    // In production, you might write to a file or stream. 
    // For now, stdout is fine as Docker captures it.
    console.log(JSON.stringify(entry));
  }

  public info(message: string, meta?: Record<string, any>, correlationId?: string) {
    this.log(LogLevel.INFO, message, meta, correlationId);
  }

  public warn(message: string, meta?: Record<string, any>, correlationId?: string) {
    this.log(LogLevel.WARN, message, meta, correlationId);
  }

  public error(message: string, meta?: Record<string, any>, correlationId?: string) {
    this.log(LogLevel.ERROR, message, meta, correlationId);
  }
}
