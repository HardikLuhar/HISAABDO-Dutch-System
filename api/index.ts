/**
 * Vercel Serverless Function — Express API Handler
 * 
 * This wraps the entire Express app as a single Vercel serverless function.
 * All /api/* requests are routed here via vercel.json rewrites.
 */
import express from 'express';

const app = express();

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check — placed BEFORE route imports to always work even if imports fail
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

// Debug endpoint to check env vars are loaded
app.get('/api/debug-env', (req, res) => {
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (hidden)' : 'NOT SET',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'SET (hidden)' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'not set',
  });
});

// Import routes — wrapped in try/catch to prevent crash
try {
  const { authRouter } = require('../server/routes/auth');
  const { groupsRouter } = require('../server/routes/groups');
  const { expensesRouter } = require('../server/routes/expenses');
  const { settlementsRouter } = require('../server/routes/settlements');
  const { analyticsRouter } = require('../server/routes/analytics');
  const { notificationsRouter, activityRouter } = require('../server/routes/notifications');
  const { ocrRouter } = require('../server/routes/ocr');

  // Mount API routes
  app.use('/api/auth', authRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/groups', expensesRouter);
  app.use('/api/groups', settlementsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/activities', activityRouter);
  app.use('/api/receipt', ocrRouter);
} catch (err: any) {
  console.error('❌ Failed to load routes:', err);
  // Return error for any API route that failed to load
  app.use('/api', (req, res) => {
    res.status(500).json({ 
      error: 'Server initialization failed', 
      details: err.message,
      hint: 'Check environment variables in Vercel Dashboard → Settings → Environment Variables'
    });
  });
}

// Global API error handler
app.use('/api', (err: any, req: any, res: any, next: any) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
