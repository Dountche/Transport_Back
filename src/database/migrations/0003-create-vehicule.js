'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Vehicules', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      immatriculation: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      type: { type: Sequelize.STRING(50), allowNull: false },
      statut_gps: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') }
    });

    await queryInterface.addIndex('Vehicules', ['immatriculation']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Vehicules');
  }
};
