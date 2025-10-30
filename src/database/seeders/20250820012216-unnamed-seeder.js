'use strict';

/** @type {import('sequelize-cli').Migration} */
const bcrypt = require('bcrypt');

module.exports = {
  async up (queryInterface, Sequelize) {
    // Hash des mots de passe
    const adminPassword = await bcrypt.hash('admin123', 10);
    const driverPassword = await bcrypt.hash('driver123', 10);
    const clientPassword = await bcrypt.hash('client123', 10);

    await queryInterface.bulkInsert('Utilisateurs', [
      {
        nom: 'Admin Test',
        email: 'admin@test.com',
        telephone: '+22501010101',
        mot_de_passe_hash: adminPassword,
        role_id: 3, // admin
        date_inscription: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Chauffeur Test',
        email: 'driver@test.com',
        telephone: '+22507070707',
        mot_de_passe_hash: driverPassword,
        role_id: 2, // chauffeur
        date_inscription: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Client Test',
        email: 'client@test.com',
        telephone: '+22505050505',
        mot_de_passe_hash: clientPassword,
        role_id: 1, // client
        date_inscription: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Utilisateurs', {
      email: {
        [Sequelize.Op.in]: ['admin@test.com', 'driver@test.com', 'client@test.com']
      }
    }, {});
  }
};
