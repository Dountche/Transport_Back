const { io } = require("socket.io-client");

// Connexion au serveur
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connecté au serveur tickets:", socket.id);

  socket.emit("subscribeTickets", 2);
});

socket.on("ticketCreated", (ticket) => {
  console.log("Nouveau ticket créé:", ticket);
});

socket.on("ticketValidated", (ticket) => {
  console.log("Ticket validé:", ticket);
});

// Déconnexion
socket.on("disconnect", () => {
  console.log("Déconnecté du serveur");
});
