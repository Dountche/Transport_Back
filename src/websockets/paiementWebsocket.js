function registerPaiementsWebsockets(io) {
  io.on("connection", (socket) => {
    console.log(`[WS Paiement] Client connecté: ${socket.id}`);

    socket.on("subscribePaiements", (userId) => {
      console.log(`[WS Paiement] ${socket.id} s'abonne aux paiements de user ${userId}`);
      socket.join(`paiements_user_${userId}`);
    });

    socket.on("unsubscribePaiements", (userId) => {
      console.log(`[WS Paiement] ${socket.id} se désabonne des paiements de user ${userId}`);
      socket.leave(`paiements_user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WS Paiement] Client déconnecté: ${socket.id}`);
    });
  });
}

function emitPaiementCreated(io, paiement) {
  io.emit("paiementCreated", paiement);
  io.to(`paiements_user_${paiement.utilisateur_id}`).emit("paiementCreated", paiement);
}

function emitPaiementUpdated(io, paiement) {
  io.emit("paiementUpdated", paiement);
  io.to(`paiements_user_${paiement.utilisateur_id}`).emit("paiementUpdated", paiement);
}

module.exports = { registerPaiementsWebsockets, emitPaiementCreated, emitPaiementUpdated };
