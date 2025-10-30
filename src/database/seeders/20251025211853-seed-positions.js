'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Positions_gps', [
      {
        vehicule_id: 1,
        latitude: 5.3535,
        longitude: -4.0239,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        vehicule_id: 2,
        latitude: 5.3196,
        longitude: -4.0124,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      // Pas de position pour le véhicule 3
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Positions_gps', null, {});
  }
};
