'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Tickets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      code_qr: { type: Sequelize.STRING(255), unique: true },
      date_creation: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      date_expiration: { type: Sequelize.DATE },
      statut_validation: { type: Sequelize.BOOLEAN, defaultValue: false },
      utilisateur_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Utilisateurs', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      trajet_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Trajets', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') }
    });

    await queryInterface.addIndex('Tickets', ['code_qr']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Tickets');
  }
};
