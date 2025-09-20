function registerTicketsWebsockets(io) {
  io.on('connection', (socket) => {
    console.log(`[WS][tickets] Client connecté: ${socket.id}`);

    socket.on('subscribeTickets', (userId) => {
      console.log(`[WS][tickets] ${socket.id} subscribeTickets user_${userId}`);
      socket.join(`user_${userId}`);
    });

    socket.on('unsubscribeTickets', (userId) => {
      console.log(`[WS][tickets] ${socket.id} unsubscribeTickets user_${userId}`);
      socket.leave(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WS][tickets] Client déconnecté: ${socket.id}`);
    });
  });
}

// Emit global
function emitTicketCreated(io, ticket) {
  try {
    io.emit('ticketCreated', ticket);
    if (ticket.utilisateur_id) {
      io.to(`user_${ticket.utilisateur_id}`).emit('ticketCreated', ticket);
    }
    console.log(`[WS][tickets] emit ticketCreated id=${ticket.id}`);
  } catch (err) {
    console.error('[WS][tickets] emitTicketCreated error', err);
  }
}

function emitTicketValidated(io, ticket) {
  try {
    io.emit('ticketValidated', ticket);
    if (ticket.utilisateur_id) {
      io.to(`user_${ticket.utilisateur_id}`).emit('ticketValidated', ticket);
    }
    console.log(`[WS][tickets] emit ticketValidated id=${ticket.id}`);
  } catch (err) {
    console.error('[WS][tickets] emitTicketValidated error', err);
  }
}

module.exports = { registerTicketsWebsockets, emitTicketCreated, emitTicketValidated };
