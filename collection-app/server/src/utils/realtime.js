/**
 * Emits lightweight delta events rather than heavy full-state rebroadcasts.
 */
export function broadcastDelta(io, adminId, eventType, payload) {
  if (!io || !adminId) return;
  const room = `space_${adminId}`;
  io.to(room).emit(eventType, payload);
}
