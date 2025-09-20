function registerDashboardWebsockets(io) {
  io.on('connection', (socket) => {
    console.log(`[WS][dashboard] Client connecté ${socket.id}`);

    socket.on('subscribeDashboard', (room = 'dashboard') => {
      console.log(`[WS][dashboard] ${socket.id} subscribe ${room}`);
      socket.join(room);
    });

    socket.on('unsubscribeDashboard', (room = 'dashboard') => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      console.log(`[WS][dashboard] Client déconnecté ${socket.id}`);
    });
  });
}

function emitDashboardUpdate(io, payload, room = 'dashboard') {
  try {
    io.to(room).emit('dashboard:update', payload);
    console.log('[WS][dashboard] emit dashboard:update', payload);
  } catch (err) {
    console.error('[WS][dashboard] emit error', err);
  }
}

module.exports = { registerDashboardWebsockets, emitDashboardUpdate };
