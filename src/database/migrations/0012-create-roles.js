'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    await queryInterface.createTable('Roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      }
    });

    // Insert des rôles par défaut
    await queryInterface.bulkInsert('Roles', [
      {
        nom: 'client',
        description: 'Utilisateur client - peut réserver et payer des tickets',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'chauffeur',
        description: 'Chauffeur - peut valider les tickets et gérer son véhicule',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'admin',
        description: 'Administrateur - gestion complète du système',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Roles');
  }
};