exports.up = function(knex) {
  return knex.schema.alterTable('vacas', (table) => {
    // 1. Añadimos la nueva columna para el registro interno del rancho
    table.string('numero_pierna');

    // 2. Añadimos la regla para que no se repita el número SINIIGA en el mismo rancho
    table.unique(['rancho_id', 'numero']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('vacas', (table) => {
    table.dropColumn('numero_pierna');
    table.dropUnique(['rancho_id', 'numero']);
  });
};