'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Reservations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      utilisateur_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Utilisateurs',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      trajet_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Trajets',
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
      arret_depart: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      arret_arrivee: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      statut: {
        type: Sequelize.ENUM('en_attente', 'confirmee', 'en_cours', 'terminee', 'annulee'),
        defaultValue: 'en_attente'
      },
      ticket_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Tickets',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        allowNull: true
      },
      date_reservation: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      date_prise_en_charge: {
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

    // Index sur les champs
    await queryInterface.addIndex('Reservations', ['utilisateur_id']);
    await queryInterface.addIndex('Reservations', ['trajet_id']);
    await queryInterface.addIndex('Reservations', ['vehicule_id']);
    await queryInterface.addIndex('Reservations', ['statut']);
    await queryInterface.addIndex('Reservations', ['date_reservation']);

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Reservations');
  }
};
