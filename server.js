require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { ValidatedRedistConnection, closeRedisConnection } = require('./src/config/redis');
const paiementsController = require("./src/controllers/paiements"); 
const { registerPositionWebsockets } = require('./src/websockets/positionWebsocket');
const { registerTicketsWebsockets } = require('./src/websockets/ticketWebsocket');
const { registerPaiementsWebsockets } = require('./src/websockets/paiementWebsocket');
const { registerDashboardWebsockets } = require('./src/websockets/dashboardWebsockets');
const { startTicketsCleanup } = require("./src/jobs/ticketCleanup");

const app = require("./src/routes/app");
const healthRoute = require('./src/routes/health');

const PORT = process.env.PORT || 3000;

// === Middleware global ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === CORS pour React Native + Render ===
const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // mobile apps
    const allowedOrigins = [
      'http://localhost:19006',
      'http://localhost:8081',
      process.env.FRONTEND_URL,
      'exp://'
    ];
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Autoriser mobile
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS']
};
app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// === Health check ===
app.use('/api/health', healthRoute);

// === Webhook Wave ===
app.post("/api/paiements/webhook/wave", express.raw({ type: "application/json" }), (req, res) => {
  req.rawBody = req.body.toString("utf8");
  paiementsController.waveWebhookHandler(req, res);
});

// === Création serveur HTTP + WebSocket ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  },
  transports: ['websocket', 'polling']
});

// Injecter io dans req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// === Websockets ===
registerPositionWebsockets(io);
registerTicketsWebsockets(io);
registerPaiementsWebsockets(io);
registerDashboardWebsockets(io);

io.on('connection', (socket) => {
  console.log('Client connecté :', socket.id);
  socket.on('disconnect', () => console.log('Client déconnecté :', socket.id));
});

// === Jobs ===
startTicketsCleanup(io);

// === Démarrage serveur ===
(async () => {
  try {
    console.log('Connexion Redis...');
    await ValidatedRedistConnection();
    console.log('Redis connecté');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Serveur lancé sur http://localhost:${PORT}`);
      console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
    });

    process.on('SIGINT', async () => {
      console.log('Arrêt du serveur...');
      try {
        await closeRedisConnection();
        process.exit(0);
      } catch (err) {
        console.error('Erreur fermeture Redis :', err);
        process.exit(1);
      }
    });

  } catch (err) {
    console.error('Erreur démarrage serveur :', err);
    process.exit(1);
  }
})();
