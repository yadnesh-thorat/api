import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import path from 'path';
import { initializeWebSocket } from './websocket/socketServer';
import { pool, testConnection } from './config/database';

// Routes
import projectRoutes from './routes/projects';
import apiRoutes from './routes/apis';
import endpointRoutes from './routes/endpoints';
import playgroundRoutes from './routes/playground';
import shareRoutes from './routes/share';
import searchRoutes from './routes/search';
import mockRoutes from './routes/mock';
import versionRoutes from './routes/versions';
import exportRoutes from './routes/export';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/apis', apiRoutes);
app.use('/api/endpoints', endpointRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/mock', mockRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/export', exportRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../public')));

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// For any other route, serve the React frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize WebSocket
initializeWebSocket(httpServer);

// Start server
const start = async () => {
    await testConnection();
    httpServer.listen(PORT, () => {
        console.log(`\n🚀 APIFlow Docs server running on http://localhost:${PORT}`);
        console.log(`📡 WebSocket server ready`);
        console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
};

start().catch(console.error);

export default app;
