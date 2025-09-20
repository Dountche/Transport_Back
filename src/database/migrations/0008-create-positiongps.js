'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Positions_gps', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      latitude: { type: Sequelize.DECIMAL(9, 6), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(9, 6), allowNull: false },
      timestamp: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      vehicule_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Vehicules', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') }
    });

    await queryInterface.addIndex('Positions_gps', ['vehicule_id']);
    await queryInterface.addIndex('Positions_gps', ['latitude', 'longitude']);
    await queryInterface.addIndex('Positions_gps', ['timestamp']);

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Positions_gps');
  }
};
