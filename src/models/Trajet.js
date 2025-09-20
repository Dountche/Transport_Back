const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Trajet = sequelize.define("Trajet", {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    ligne_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
                model: 'Lignes',
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
    heure_depart: { 
        type: DataTypes.TIME,
        allowNull: false 
    },
    heure_arrivee: { 
        type: DataTypes.TIME,
        allowNull: false 
    },
});

module.exports = Trajet;
