'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Lignes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nom: { type: Sequelize.STRING(100), allowNull: false },
      arrets: { type: Sequelize.JSONB },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Lignes');
  }
};
