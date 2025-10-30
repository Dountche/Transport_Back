'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Lignes', [
      {
        nom: 'Plateau - Yopougon Express',
        arrets: JSON.stringify([
          { nom: 'Plateau Gare', latitude: 5.3214, longitude: -4.0170 },
          { nom: 'Carrefour Saint-Paul', latitude: 5.3156, longitude: -4.0301 },
          { nom: 'Adjamé 220 Logements', latitude: 5.3535, longitude: -4.0239 },
          { nom: 'Abobo Anador', latitude: 5.4164, longitude: -4.0205 },
          { nom: 'Yopougon Siporex', latitude: 5.3364, longitude: -4.0890 },
          { nom: 'Yopougon Terminus', latitude: 5.3449, longitude: -4.1012 }
        ]),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Cocody - Marcory via Pont',
        arrets: JSON.stringify([
          { nom: 'Cocody Angré', latitude: 5.3698, longitude: -3.9830 },
          { nom: 'Cocody Danga', latitude: 5.3534, longitude: -3.9962 },
          { nom: 'Carrefour Solibra', latitude: 5.3328, longitude: -4.0089 },
          { nom: 'Pont Houphouët-Boigny', latitude: 5.3196, longitude: -4.0124 },
          { nom: 'Marcory Zone 4', latitude: 5.2876, longitude: -3.9865 },
          { nom: 'Marcory Remblais', latitude: 5.2741, longitude: -3.9734 }
        ]),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Abobo - Aéroport Express',
        arrets: JSON.stringify([
          { nom: 'Abobo Gare', latitude: 5.4350, longitude: -4.0198 },
          { nom: 'Adjamé Gare Routière', latitude: 5.3591, longitude: -4.0278 },
          { nom: 'Treichville Gare', latitude: 5.2989, longitude: -4.0023 },
          { nom: 'Koumassi Remblais', latitude: 5.2901, longitude: -3.9567 },
          { nom: 'Port-Bouët Vridi', latitude: 5.2567, longitude: -3.9234 },
          { nom: 'Aéroport FHB', latitude: 5.2539, longitude: -3.9263 }
        ]),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Lignes', null, {});
  }
};
