const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    utilisateur_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
        model: 'Utilisateurs',
        key: 'id'
        }
    },
    trajet_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
        model: 'Trajets',
        key: 'id'
        }
    },
    vehicule_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
        model: 'Vehicules',
        key: 'id'
        }
    },
    arret_depart: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    arret_arrivee: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    statut: {
        type: DataTypes.ENUM('en_attente', 'confirmee', 'en_cours', 'terminee', 'annulee'),
        defaultValue: 'en_attente'
    },
    ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
        model: 'Tickets',
        key: 'id'
        }
    },
    date_reservation: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    date_prise_en_charge: {
        type: DataTypes.DATE,
        allowNull: true
    }
})

module.exports = Reservation;