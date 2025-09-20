'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // add column role_id à la table Utilisateurs
    await queryInterface.addColumn('Utilisateurs', 'role_id', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Roles',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      defaultValue: 1 // Par défaut, client
    });

    // Ajouter un index sur role_id
    await queryInterface.addIndex('Utilisateurs', ['role_id']);

    // Mettre à jour tous les utilisateurs existants avec le rôle client par défaut
    await queryInterface.sequelize.query(
      'UPDATE "Utilisateurs" SET role_id = 1 WHERE role_id IS NULL'
    );

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Utilisateurs', ['role_id']);
    await queryInterface.removeColumn('Utilisateurs', 'role_id');
  }
};
