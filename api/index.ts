/**
 * Vercel Serverless Function — Express API Handler
 * 
 * This wraps the entire Express app as a single Vercel serverless function.
 * All /api/* requests are routed here via vercel.json rewrites.
 */
import express from 'express';
import { authRouter } from '../server/routes/auth.js';
import { groupsRouter } from '../server/routes/groups.js';
import { expensesRouter } from '../server/routes/expenses.js';
import { settlementsRouter } from '../server/routes/settlements.js';
import { analyticsRouter } from '../server/routes/analytics.js';
import { notificationsRouter, activityRouter } from '../server/routes/notifications.js';
import { ocrRouter } from '../server/routes/ocr.js';

const app = express();

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check
app.get('/api/health', (req, res) => {
  const envCheck = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
  };
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'vercel-serverless',
    env: envCheck
  });
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
