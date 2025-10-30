'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Vehicules', [
      {
        immatriculation: 'AB-1234-CI',
        type: 'Bus',
        statut_gps: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        immatriculation: 'CD-5678-CI',
        type: 'Minibus',
        statut_gps: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        immatriculation: 'EF-9012-CI',
        type: 'Bus',
        statut_gps: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Vehicules', null, {});
  }
};
