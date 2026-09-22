import { app } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { runStartupEnvValidation } from './config/envValidator';
import { ShareController } from './controllers/shareController';

async function startServer(): Promise<void> {
  try {
    // 1. Validate environment configuration
    runStartupEnvValidation(config);

    // 2. Safe cleanup of stale temporary upload files
    ShareController.cleanStaleSpoolFiles();

    // 3. Connect to PostgreSQL
    await connectDatabase();

    // 4. Start HTTP listener
    const server = app.listen(config.port, () => {
      console.log(`[DevParcel Backend] Server running on http://localhost:${config.port}`);
      console.log(`[DevParcel Backend] Environment: ${config.nodeEnv}`);
      console.log(`[DevParcel Backend] Client URL: ${config.clientUrl}`);
      console.log(`[DevParcel Backend] Public Share Base URL: ${config.publicShareBaseUrl}`);
    });

    // 5. Graceful shutdown
    const handleShutdown = async (signal: string) => {
      console.log(`\n[DevParcel Backend] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        console.log('[DevParcel Backend] Server terminated cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    process.on('uncaughtException', (err: any) => {
      console.error('[DevParcel Backend] Uncaught exception:', err.message || err);
    });

    process.on('unhandledRejection', (reason: any) => {
      console.error('[DevParcel Backend] Unhandled rejection:', reason?.message || reason);
    });
  } catch (err: any) {
    console.error('[DevParcel Backend] Failed to start server:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { startServer };
