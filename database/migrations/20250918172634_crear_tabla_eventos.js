exports.up = function(knex) {
  return knex.schema.createTable('eventos', (table) => {
    table.increments('id').primary(); // ID del evento

    // Conexión con la vaca a la que pertenece el evento
    table.integer('vaca_id').unsigned().notNullable().references('id').inTable('vacas').onDelete('CASCADE');

    table.string('descripcion').notNullable(); // El resultado o nuevo status (Ej: "Preñada 30 días")

    // La fecha y hora del evento.
    // Se llenará automáticamente con la fecha y hora actual al crear el registro.
    table.timestamp('fecha_evento').defaultTo(knex.fn.now()); 
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('eventos');
};