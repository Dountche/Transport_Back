const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: { 
    type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true 
    },
    code_qr: { 
        type: DataTypes.STRING,
        unique: true 
    },
    date_creation: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW
    },
    date_expiration: { 
        type: DataTypes.DATE 
    },
    statut_validation: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    statut_expiration: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    utilisateur_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    validateur_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Utilisateurs',
            key: 'id'
        }
    },
    statut_payer: { 
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    trajet_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    }

});

module.exports = Ticket;
