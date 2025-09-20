'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Tickets', 'code_qr', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Tickets', 'code_qr', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  }
};
