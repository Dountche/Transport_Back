const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Vehicule = sequelize.define("Vehicule", {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    immatriculation: { 
        type: DataTypes.STRING(50), 
        unique: true, 
        allowNull: false 
    },
    type: { 
        type: DataTypes.STRING(50), 
        allowNull: false 
    },
    statut_gps: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    },
});

module.exports = Vehicule;
