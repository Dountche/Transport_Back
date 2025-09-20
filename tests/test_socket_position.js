const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connecté au serveur positions:", socket.id);

  socket.emit("subscribeGpsAll");

  socket.emit("subscribeVehicle", 1);
});

socket.on("gpsUpdate", (data) => {
  console.log("gpsUpdate reçu:", data);
});

socket.on("positionUpdate", (data) => {
  console.log("positionUpdate reçu (vehicule spécifique):", data);
});

// Déconnexion
socket.on("disconnect", () => {
  console.log("Déconnecté du serveur");
});
