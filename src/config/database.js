const { Sequelize } = require("sequelize");
require("dotenv").config();

// recupération des données de .env
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "postgres";
const DB_NAME = process.env.DB_NAME || "transport_api";


const DATABASE_URL = process.env.DATABASE_URL;

let sequelize;

if (DATABASE_URL) {
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: "postgres",
    logging: false, 
  });
} else {
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: "postgres",
    logging: false, 
  });
}

// Vérification connexion
async function dbtestConnection() {
  try {
    await sequelize.authenticate();
    console.log("Connexion à PostgreSQL réussie !");
  } catch (error) {
    console.error("Impossible de se connecter à PostgreSQL :", error);
  }
}

dbtestConnection();

module.exports = sequelize;
