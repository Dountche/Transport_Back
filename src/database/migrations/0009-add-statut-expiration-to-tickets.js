'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tickets', 'statut_expiration', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tickets', 'statut_expiration');
  }
};
