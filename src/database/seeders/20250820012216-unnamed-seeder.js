'use strict';

/** @type {import('sequelize-cli').Migration} */
const bcrypt = require('bcrypt');

module.exports = {
  async up (queryInterface, Sequelize) {
    const motDePasseEnClair = 'admin123';
    const motDePasseHash = await bcrypt.hash(motDePasseEnClair, 10);

    await queryInterface.bulkInsert('Utilisateurs', [{
      nom: 'Admin Test',
      email: 'admin@test.com',
      telephone: '+22501010101',
      mot_de_passe_hash: motDePasseHash,
      date_inscription: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Utilisateurs', {
      email: 'admin@test.com'
    }, {});
  }
};
