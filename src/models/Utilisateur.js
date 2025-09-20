const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Utilisateur = sequelize.define("Utilisateur", {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true
    },
    nom: { 
        type: DataTypes.STRING(100), 
        allowNull: false 
    },
    email: { 
        type: DataTypes.STRING(100), 
        unique: true, 
        allowNull: false 
    },
    telephone: { 
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false 
    },
    mot_de_passe_hash: { 
        type: DataTypes.STRING(255), 
        allowNull: false 
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // Client par défaut
        references: {
            model: 'Roles',
            key: 'id'
        }
    },
    date_inscription: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW
    },
});

module.exports = Utilisateur;
