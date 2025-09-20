const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Paiement = sequelize.define("Paiement", {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    montant: { 
        type: DataTypes.DECIMAL(10,2), 
        allowNull: false 
    },
    date: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    },
    methode: { 
        type: DataTypes.STRING(50), 
        allowNull: false 
    },
    transaction_id: { 
        type: DataTypes.STRING(100), 
        allowNull: false 
    },
    ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Tickets',
            key: 'id'
        }
    },
    utilisateur_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Utilisateur",
            key: "id"
        }
    },
});

module.exports = Paiement;
