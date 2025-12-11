import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { pool } from './db';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import webhookRoutes from './routes/webhooks';
import packagesRoutes from './routes/packages';
import aiRoutes from './routes/ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// Health check endpoints
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.get('/health/db', async (_req: Request, res: Response) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', error });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/projects/:id/ai', aiRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/github`);
    console.log(`📦 Projects: http://localhost:${PORT}/api/projects`);
    console.log(`🪝 Webhooks: http://localhost:${PORT}/api/webhooks/github`);
    console.log(`📦 Packages: http://localhost:${PORT}/api/packages`);
    console.log(`🤖 AI Q&A: http://localhost:${PORT}/api/projects/:id/ai/q`);
});
