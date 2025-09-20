'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Paiements', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      montant: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      date: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      methode: { type: Sequelize.STRING(50), allowNull: false },
      transaction_id: { type: Sequelize.STRING(100), allowNull: false },
      ticket_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Tickets', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') }
    });

    await queryInterface.addIndex('Paiements', ['transaction_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Paiements');
  }
};
