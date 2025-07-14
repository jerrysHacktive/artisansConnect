const winston = require('winston');

// Create a Winston logger
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json() // Output logs in JSON format
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize logs for console
        winston.format.simple() // Simple text format for console
      ),
    }),
  ],
});

// Example log messages
// logger.info('Application started', { user: 'Jerry' });
// logger.warn('Low memory warning', { memoryUsage: '80%' });
// logger.error('Failed to connect to database', { errorCode: 500 });
// logger.debug('Processing request', {
//   requestId: '12345',
//   timestamp: new Date(),
// });
