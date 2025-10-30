'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Reservations', 'date_prise_en_charge', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Reservations', 'date_prise_en_charge', {
      type: Sequelize.DATE,
      allowNull: false,
    });
  }
};
