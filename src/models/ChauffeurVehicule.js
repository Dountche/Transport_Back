const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChauffeurVehicule = sequelize.define('ChauffeurVehicule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chauffeur_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Utilisateurs',
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
  actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  date_assignation: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  date_desassignation: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
    tableName: 'Chauffeur_Vehicules',
    freezeTableName: true,
});

module.exports = ChauffeurVehicule;
