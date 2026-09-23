import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { authRouter } from './server/routes/auth';
import { groupsRouter } from './server/routes/groups';
import { expensesRouter } from './server/routes/expenses';
import { settlementsRouter } from './server/routes/settlements';
import { analyticsRouter } from './server/routes/analytics';
import { notificationsRouter, activityRouter } from './server/routes/notifications';
import { ocrRouter } from './server/routes/ocr';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API routes
  app.use('/api/auth', authRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/groups', expensesRouter);
  app.use('/api/groups', settlementsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/activities', activityRouter);
  app.use('/api/receipt', ocrRouter);

  // Global API error handler
  app.use('/api', (err: any, req: any, res: any, next: any) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Splitwise server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server failed to start or encountered an error:', err);
    process.exit(1);
  });

  const handleShutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer().catch((err) => {
  console.error('Fatal error in startServer:', err);
  process.exit(1);
});
