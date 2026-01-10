/**
 * Centralized logging utility for the renderer process
 * Automatically suppresses debug/info logs in production builds
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev: boolean;
  private isStaging: boolean;
  private appEnv: string;

  constructor() {
    this.appEnv = import.meta.env.RENDERER_VITE_APP_ENV || 'development';
    this.isDev = this.appEnv === 'development';
    this.isStaging = this.appEnv === 'staging';
  }

  /**
   * Debug logging - only shown in development mode
   * Use for detailed debugging information
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Info logging - shown in development and staging
   * Use for general informational messages
   */
  info(message: string, ...args: any[]): void {
    if (this.isDev || this.isStaging) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Warning logging - shown in all environments
   * Use for non-critical issues that should be investigated
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * Error logging - shown in all environments
   * Use for errors and exceptions
   */
  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * Get the current environment
   */
  getEnvironment(): string {
    return this.appEnv;
  }
}

// Export singleton instance
export const logger = new Logger();
