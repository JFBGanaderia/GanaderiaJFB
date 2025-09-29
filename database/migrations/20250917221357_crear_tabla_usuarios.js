// =================================================================
//     CÓDIGO COMPLETO para el archivo de migración de usuarios
// =================================================================

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // La función 'up' describe los cambios que queremos hacer
  return knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary(); // ID numérico auto-incremental
    table.string('nombre').notNullable(); // Nombre del usuario
    table.string('email').notNullable().unique(); // Email, debe ser único para cada usuario
    table.string('password').notNullable(); // Aquí guardaremos la contraseña encriptada (hashed)
    table.string('rol').notNullable(); // Aquí definiremos si es 'propietario' o 'mvz'
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // La función 'down' describe cómo deshacer los cambios (por si nos equivocamos)
  return knex.schema.dropTable('usuarios');
};