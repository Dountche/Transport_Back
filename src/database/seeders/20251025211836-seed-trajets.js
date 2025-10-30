'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Trajets', [
      {
        ligne_id: 1, // Plateau - Yopougon
        vehicule_id: 1,
        heure_depart: new Date('2025-10-02T08:00:00Z'),
        heure_arrivee: new Date('2025-10-02T09:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ligne_id: 2, // Cocody - Marcory
        vehicule_id: 2,
        heure_depart: new Date('2025-10-02T09:00:00Z'),
        heure_arrivee: new Date('2025-10-02T10:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ligne_id: 3, // Abobo - Aéroport
        vehicule_id: 1,
        heure_depart: new Date('2025-10-02T14:00:00Z'),
        heure_arrivee: new Date('2025-10-02T15:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Trajets', null, {});
  }
};
