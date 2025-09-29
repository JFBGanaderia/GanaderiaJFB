exports.up = function(knex) {
  return knex.schema.createTable('resultados_procedimiento', (table) => {
    table.increments('id').primary();

    // Conexión con la sesión de trabajo a la que pertenece este resultado
    table.integer('procedimiento_id').unsigned().notNullable().references('id').inTable('procedimientos').onDelete('CASCADE');

    // Conexión con la vaca específica que se revisó
    table.integer('vaca_id').unsigned().notNullable().references('id').inTable('vacas').onDelete('CASCADE');

    table.string('resultado').notNullable(); // Ej: "Preñada 30 días", "Semen ABC-123"
    table.text('comentarios'); // Notas específicas para esta vaca
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('resultados_procedimiento');
};