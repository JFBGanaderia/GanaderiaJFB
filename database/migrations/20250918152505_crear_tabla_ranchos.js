/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('ranchos', (table) => {
    table.increments('id').primary(); // ID único del rancho
    table.string('nombre').notNullable(); // Ej: "Rancho San José"

    // Conexión con el propietario
    table
      .integer('propietario_id')
      .unsigned()
      .references('id')
      .inTable('usuarios')
      .onDelete('CASCADE'); // Si se borra el propietario, se borra su rancho

    // Columna para el código de acceso del veterinario
    table.string('codigo_acceso').unique(); // El código debe ser único
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('ranchos');
};