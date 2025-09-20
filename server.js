const http = require("http");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const { registerPositionWebsockets } = require('./src/websockets/positionWebsocket');
const { registerTicketsWebsockets } = require('./src/websockets/ticketWebsocket');
const { registerPaiementsWebsockets } = require('./src/websockets/paiementWebsocket');
const { registerDashboardWebsockets } = require('./src/websockets/dashboardWebsockets');
const { startTicketsCleanup } = require("./src/jobs/ticketCleanup");
const { ValidatedRedistConnection, closeRedisConnection } = require('./src/config/redis');
const express = require("express");
const paiementsController = require("./src/controllers/paiements"); 

dotenv.config();

const app = require("./src/routes/app");
const port = process.env.PORT || 3000;

// === Création serveur HTTP + WebSocket ===
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware global
app.use((req, res, next) => {
  req.io = io;
  next();
});

// === Webhook Wave ===
app.post("/api/paiements/webhook/wave", express.raw({ type: "application/json" }), (req, res) => {
  req.rawBody = req.body.toString("utf8");
  paiementsController.waveWebhookHandler(req, res);
});

// === Jobs ===
startTicketsCleanup(io);

// === Websockets ===
registerPositionWebsockets(io);
registerTicketsWebsockets(io);
registerPaiementsWebsockets(io);
registerDashboardWebsockets(io);

io.on("connection", (socket) => {
  console.log("Client connecté :", socket.id);

  socket.on("disconnect", () => {
    console.log("Client déconnecté :", socket.id);
  });
});

// Connexion Redis + lancement serveur
(async () => {
  try {
    console.log("📡 Initialisation Redis...");
    await ValidatedRedistConnection();

    server.listen(port, () => {
      console.log(`Serveur lancé sur http://localhost:${port}`);
    });

    process.on("SIGINT", async () => {
      console.log("Arrêt du serveur...");
      try {
        await closeRedisConnection();
        process.exit(0);
      } catch (err) {
        console.error("Erreur lors de la fermeture de Redis:", err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error("Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
})();
