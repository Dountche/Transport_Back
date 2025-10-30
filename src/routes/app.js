const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// === Middlewares globaux ===
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// === Import des routes ===
const authRoutes = require("./auth");
const ticketRoutes = require("./tickets");
const vehiculeRoutes = require("./vehicules");
const ligneRoutes = require("./lignes");
const trajetRoutes = require("./trajets");
const positionRoutes = require('./positionGps');
const paiementsRoutes = require("./paiements");
const usersRoutes = require('./users');
const dashboardRoutes = require('./dashboard');
const reservationRoutes = require('./reservations');
const notificationRoutes = require('./notifications');
const ChauffeurVehiculeRoutes = require('./chauffeurvehicule');

// === Déclaration des routes ===
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/vehicules", vehiculeRoutes);
app.use("/api/lignes", ligneRoutes);
app.use("/api/trajets", trajetRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/paiements', paiementsRoutes);
app.use('/api/profil', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chauffeurvehicule', ChauffeurVehiculeRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Bienvenue sur l'API Transport !!!!" });
});

module.exports = app;
