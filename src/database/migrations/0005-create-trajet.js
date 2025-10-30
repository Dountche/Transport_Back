'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Trajets', {
      id: { 
        type: Sequelize.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
      },
      ligne_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Lignes', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      vehicule_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Vehicules', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      heure_depart: { 
        type: Sequelize.TIME, 
        allowNull: false 
      },
      heure_arrivee: { 
        type: Sequelize.TIME, 
        allowNull: false 
      },
      createdAt: { 
        type: Sequelize.DATE, 
        defaultValue: 
        Sequelize.fn('now') 
      },
      updatedAt: { 
        type: Sequelize.DATE, 
        defaultValue: Sequelize.fn('now') 
      }
    });

    await queryInterface.addIndex('Trajets', ['ligne_id']);
    await queryInterface.addIndex('Trajets', ['vehicule_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Trajets');
  }
};
