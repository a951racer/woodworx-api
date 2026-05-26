import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import env from './config/env';
import { connectDB } from './config/db';

async function start(): Promise<void> {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`[server] WoodworX API running on port ${env.PORT}`);
    console.log(`[server] Environment: ${env.NODE_ENV}`);
  });
}

start().catch((error) => {
  console.error('[server] Failed to start:', error);
  process.exit(1);
});
