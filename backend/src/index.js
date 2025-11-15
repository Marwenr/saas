/**
 * Backend server entry point
 */
import { start, stop } from './server.js';

// Start the server
start();

// Graceful shutdown
process.on('SIGINT', async () => {
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stop();
  process.exit(0);
});
