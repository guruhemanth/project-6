/**
 * Sets up Socket.io connection handlers with multi-tenant room isolation.
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join space room for isolated real-time updates
    socket.on('join_space', (adminId) => {
      if (adminId) {
        const roomName = `space_${adminId}`;
        socket.join(roomName);
        console.log(`📍 Socket ${socket.id} joined room: ${roomName}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });
}
