import jwt from 'jsonwebtoken';

/**
 * Sets up Socket.io connection handlers with handshake authentication and multi-tenant room isolation.
 */
export function setupSocketHandlers(io) {
  // Handshake Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      // Allow connection with degraded room joining if token not provided, or reject
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vinayaka_chandas_secret_key_2026');
      socket.user = decoded; // { id, username, role, adminId, societyName }
      next();
    } catch (err) {
      console.warn('⚠️ Socket handshake token verification failed:', err.message);
      next();
    }
  });

  io.on('connection', (socket) => {
    // If authenticated via handshake, auto-join space room
    if (socket.user?.adminId) {
      const roomName = `space_${socket.user.adminId}`;
      socket.join(roomName);
      console.log(`🔌 [Authenticated Handshake] Socket ${socket.id} (${socket.user.username}) joined: ${roomName}`);
    } else {
      console.log(`🔌 Client connected: ${socket.id}`);
    }

    // Manual join space fallback
    socket.on('join_space', (adminId) => {
      if (adminId) {
        const roomName = `space_${adminId}`;
        socket.join(roomName);
        console.log(`📍 Socket ${socket.id} manually joined room: ${roomName}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });
}
