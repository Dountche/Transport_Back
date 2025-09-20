const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PositionGPS = sequelize.define('PositionGPS', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  latitude: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  vehicule_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Vehicules',
      key: 'id'
    }
  }
}, {
    tableName: 'Positions_gps',
    freezeTableName: true,
});

module.exports = PositionGPS;
