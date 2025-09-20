function registerPositionWebsockets(io) {
  io.on('connection', (socket) => {
    console.log(`[WS][positions] Client connecté ${socket.id}`);

    // s'abonner à un véhicule
    socket.on('subscribeVehicle', (vehiculeId) => {
      console.log(`[WS][positions] ${socket.id} subscribeVehicle ${vehiculeId}`);
      socket.join(`vehicule_${vehiculeId}`);
    });

    socket.on('unsubscribeVehicle', (vehiculeId) => {
      console.log(`[WS][positions] ${socket.id} unsubscribeVehicle ${vehiculeId}`);
      socket.leave(`vehicule_${vehiculeId}`);
    });

    // s'abonner à tous les flux GPS
    socket.on('subscribeGpsAll', () => {
      console.log(`[WS][positions] ${socket.id} subscribeGpsAll`);
      socket.join('gps_all');
    });

    socket.on('unsubscribeGpsAll', () => {
      console.log(`[WS][positions] ${socket.id} unsubscribeGpsAll`);
      socket.leave('gps_all');
    });

    socket.on('disconnect', () => {
      console.log(`[WS][positions] Client déconnecté ${socket.id}`);
    });
  });
}

module.exports = { registerPositionWebsockets };
