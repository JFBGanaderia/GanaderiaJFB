exports.up = function(knex) {
  return knex.schema.createTable('procedimientos', (table) => {
    table.increments('id').primary();

    // Conexión con el rancho donde se hizo el trabajo
    table.integer('rancho_id').unsigned().notNullable().references('id').inTable('ranchos').onDelete('CASCADE');

    // Conexión con el veterinario que hizo el trabajo
    table.integer('mvz_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE');

    table.string('tipo').notNullable(); // Ej: 'Palpación', 'Inseminación'
    table.text('comentarios'); // Comentarios generales de la sesión
    table.timestamp('fecha').defaultTo(knex.fn.now()); // Fecha y hora de la sesión
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('procedimientos');
};