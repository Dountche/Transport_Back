'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ajouter validateur_id (chauffeur qui valide le ticket)
    await queryInterface.addColumn('Tickets', 'validateur_id', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Utilisateurs',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      allowNull: true
    });

    // Ajouter statut_payer (si le ticket est payé)
    await queryInterface.addColumn('Tickets', 'statut_payer', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Ajouter des index pour les nouvelles colonnes
    await queryInterface.addIndex('Tickets', ['validateur_id']);
    await queryInterface.addIndex('Tickets', ['statut_payer']);

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Tickets', ['validateur_id']);
    await queryInterface.removeIndex('Tickets', ['statut_payer']);
    await queryInterface.removeColumn('Tickets', 'validateur_id');
    await queryInterface.removeColumn('Tickets', 'statut_payer');
  }
};
