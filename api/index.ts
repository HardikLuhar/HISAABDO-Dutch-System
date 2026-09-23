/**
 * Vercel Serverless Function — Express API Handler
 * 
 * This wraps the entire Express app as a single Vercel serverless function.
 * All /api/* requests are routed here via vercel.json rewrites.
 */
import express from 'express';
import { authRouter } from '../server/routes/auth';
import { groupsRouter } from '../server/routes/groups';
import { expensesRouter } from '../server/routes/expenses';
import { settlementsRouter } from '../server/routes/settlements';
import { analyticsRouter } from '../server/routes/analytics';
import { notificationsRouter, activityRouter } from '../server/routes/notifications';
import { ocrRouter } from '../server/routes/ocr';

const app = express();

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), runtime: 'vercel-serverless' });
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

export default app;
