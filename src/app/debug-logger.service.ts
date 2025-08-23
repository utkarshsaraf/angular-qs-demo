import { Injectable } from '@angular/core';

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: any;
  component?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DebugLoggerService {
  private readonly logFileName = 'debug.log';
  private readonly maxLogSize = 1024 * 1024; // 1MB
  private readonly maxLogEntries = 1000;

  constructor() {
    this.initializeLogFile();
  }

  private initializeLogFile() {
    try {
      // Create initial log file with header
      const header = `=== Angular QuickSight Demo Debug Log ===\nStarted: ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`;
      this.writeToFile(header);
    } catch (error) {
      console.error('Failed to initialize log file:', error);
    }
  }

  info(message: string, data?: any, component?: string) {
    this.log('INFO', message, data, component);
  }

  warn(message: string, data?: any, component?: string) {
    this.log('WARN', message, data, component);
  }

  error(message: string, data?: any, component?: string) {
    this.log('ERROR', message, data, component);
  }

  debug(message: string, data?: any, component?: string) {
    this.log('DEBUG', message, data, component);
  }

  private log(level: LogEntry['level'], message: string, data?: any, component?: string) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      component
    };

    // Console logging
    this.logToConsole(logEntry);

    // File logging
    this.logToFile(logEntry);
  }

  private logToConsole(entry: LogEntry) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level}]`;
    
    switch (entry.level) {
      case 'ERROR':
        console.error(`${prefix} ${entry.component ? `[${entry.component}]` : ''} ${entry.message}`, entry.data || '');
        break;
      case 'WARN':
        console.warn(`${prefix} ${entry.component ? `[${entry.component}]` : ''} ${entry.message}`, entry.data || '');
        break;
      case 'DEBUG':
        console.debug(`${prefix} ${entry.component ? `[${entry.component}]` : ''} ${entry.message}`, entry.data || '');
        break;
      default:
        console.log(`${prefix} ${entry.component ? `[${entry.component}]` : ''} ${entry.message}`, entry.data || '');
    }
  }

  private logToFile(entry: LogEntry) {
    try {
      const logLine = this.formatLogEntry(entry);
      this.writeToFile(logLine);
      this.rotateLogFileIfNeeded();
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.padEnd(5);
    const component = entry.component ? `[${entry.component}]` : '[APP]';
    const data = entry.data ? ` | Data: ${JSON.stringify(entry.data, null, 2)}` : '';
    
    return `${timestamp} | ${level} | ${component} | ${entry.message}${data}\n`;
  }

  private writeToFile(content: string) {
    // In a browser environment, we'll use localStorage as a fallback
    // In a Node.js environment, we could write to actual files
    try {
      const existingLogs = localStorage.getItem('debugLogs') || '';
      const newLogs = existingLogs + content;
      
      // Keep only the last maxLogEntries lines
      const lines = newLogs.split('\n');
      if (lines.length > this.maxLogEntries) {
        const trimmedLogs = lines.slice(-this.maxLogEntries).join('\n');
        localStorage.setItem('debugLogs', trimmedLogs);
      } else {
        localStorage.setItem('debugLogs', newLogs);
      }
    } catch (error) {
      console.error('Failed to write to localStorage:', error);
    }
  }

  private rotateLogFileIfNeeded() {
    try {
      const logs = localStorage.getItem('debugLogs') || '';
      if (logs.length > this.maxLogSize) {
        // Keep only the last portion of logs
        const lines = logs.split('\n');
        const trimmedLogs = lines.slice(-this.maxLogEntries).join('\n');
        localStorage.setItem('debugLogs', trimmedLogs);
        
        // Add rotation notice
        const rotationNotice = `${new Date().toISOString()} | INFO  | [SYSTEM] | Log file rotated due to size limit\n`;
        localStorage.setItem('debugLogs', trimmedLogs + rotationNotice);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  // Method to download logs (useful for debugging)
  downloadLogs() {
    try {
      const logs = localStorage.getItem('debugLogs') || 'No logs available';
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-${new Date().toISOString().split('T')[0]}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download logs:', error);
    }
  }

  // Method to clear logs
  clearLogs() {
    try {
      localStorage.removeItem('debugLogs');
      this.initializeLogFile();
      console.log('Logs cleared successfully');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  // Method to get current log content
  getLogs(): string {
    try {
      return localStorage.getItem('debugLogs') || 'No logs available';
    } catch (error) {
      console.error('Failed to get logs:', error);
      return 'Failed to retrieve logs';
    }
  }
}
