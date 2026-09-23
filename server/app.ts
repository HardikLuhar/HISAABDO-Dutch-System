import express from 'express';
import { authRouter } from './routes/auth';
import { groupsRouter } from './routes/groups';
import { expensesRouter } from './routes/expenses';
import { settlementsRouter } from './routes/settlements';
import { analyticsRouter } from './routes/analytics';
import { notificationsRouter, activityRouter } from './routes/notifications';
import { ocrRouter } from './routes/ocr';

const app = express();

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
    }
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

export { app };
