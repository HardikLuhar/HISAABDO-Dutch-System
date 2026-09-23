/**
 * Vercel Serverless Function Entry Point
 * 
 * Imports the Express app from server/app.ts and exports it
 * as the default handler for Vercel's @vercel/node runtime.
 */
import { app } from '../server/app.js';

export default app;
