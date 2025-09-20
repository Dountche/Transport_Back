'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Paiements', 'utilisateur_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Utilisateurs', key: 'id' },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Paiements', 'utilisateur_id');
  }
};
