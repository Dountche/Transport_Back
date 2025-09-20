'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Chauffeur_Vehicules', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      chauffeur_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Utilisateurs',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      vehicule_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Vehicules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      actif: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      date_assignation: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      date_desassignation: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('Chauffeur_Vehicules', ['chauffeur_id', 'actif'], {
      unique: true,
      where: { actif: true }
    });

    await queryInterface.addIndex('Chauffeur_Vehicules', ['vehicule_id']);

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Chauffeur_Vehicules');
  }
};
