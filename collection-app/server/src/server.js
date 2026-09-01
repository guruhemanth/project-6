import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDatabase } from './config/db.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';
import authRoutes from './routes/authRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

dotenv.config({ override: true });

const app = express();
const httpServer = createServer(app);

// Socket.io server with CORS configured for all clients
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Optional Redis Adapter setup for horizontal scaling
if (process.env.REDIS_URL) {
  try {
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const { default: Redis } = await import('ioredis');
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('⚡ Redis Adapter configured for Socket.io clustering.');
  } catch (redisErr) {
    console.warn('⚠️ Could not initialize Redis adapter:', redisErr.message);
  }
}

// Make io accessible to controllers via req.app.get('io')
app.set('io', io);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Health check (public, no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', collectionRoutes);
app.use('/api', historyRoutes);
app.use('/api', expenseRoutes);

// Socket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await initDatabase();
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready with Handshake Auth & Room Clustering`);
      console.log(`🕉  Vinayaka Chavithi Chandas Collection API\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
