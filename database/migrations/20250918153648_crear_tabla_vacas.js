/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('vacas', (table) => {
    table.increments('id').primary();
    table.integer('numero').notNullable();
    table.string('nombre').notNullable();
    table.string('raza');
    table.string('status');

    // La conexión correcta desde el principio
    table
      .integer('rancho_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('ranchos')
      .onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('vacas');
};