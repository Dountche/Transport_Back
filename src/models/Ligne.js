const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Ligne = sequelize.define("Ligne", {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
},
  nom: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
},
  arrets: { 
    type: DataTypes.JSONB 
},
});

module.exports = Ligne;
