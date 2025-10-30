require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const { sequelize } = require('./models');
const redisClient = require('./config/redisClient');

const app = express();
const server = http.createServer(app);

// CORS configuré pour production
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (apps mobiles)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:19006',
      'http://localhost:8081',
      process.env.FRONTEND_URL, // URL du frontend si web
      'exp://', // Expo Go
    ];
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(null, true); // En production, autoriser tout pour mobile
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Socket.IO avec CORS
const io = socketIo(server, {
  cors: {
    origin: '*', // Apps mobiles = pas d'origin fixe
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Middleware pour rawBody (webhook Wave)
app.use('/api/paiements/webhook/wave', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Injecter io dans req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.use('/api/health', require('./routes/health'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/paiements', require('./routes/paiements'));
app.use('/api/trajets', require('./routes/trajets'));
app.use('/api/lignes', require('./routes/lignes'));
app.use('/api/vehicules', require('./routes/vehicules'));
app.use('/api/positions', require('./routes/positions'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chauffeur-vehicules', require('./routes/chauffeur-vehicules'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'Transport API v1.0',
    status: 'running',
    documentation: '/api-docs',
    health: '/api/health'
  });
});

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// WebSocket authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  // Vérifier JWT
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`WebSocket connecté: User ${socket.userId}`);
  
  // Rejoindre la room de l'utilisateur
  socket.join(`user_${socket.userId}`);
  
  // Rejoindre rooms selon le rôle
  if (socket.userRole === 'chauffeur') {
    socket.join('chauffeurs');
  } else if (socket.userRole === 'admin') {
    socket.join('admins');
  } else if (socket.userRole === 'client') {
    socket.join('clients');
  }
  
  socket.on('disconnect', () => {
    console.log(`WebSocket déconnecté: User ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 3000;

// Démarrage du serveur
async function startServer() {
  try {
    // Test connexion DB
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connecté');
    
    // Test connexion Redis
    if (redisClient.status === 'ready') {
      console.log('✅ Redis connecté');
    } else {
      console.warn('⚠️ Redis non connecté (mode dégradé)');
    }
    
    // Synchroniser les modèles (ATTENTION: en production, utiliser migrations)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('✅ Modèles synchronisés');
    }
    
    // Démarrer le serveur
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🔧 Environnement: ${process.env.NODE_ENV}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
    process.exit(1);
  }
}

// Gestion arrêt gracieux
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, arrêt gracieux...');
  server.close(async () => {
    await sequelize.close();
    await redisClient.quit();
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, io };