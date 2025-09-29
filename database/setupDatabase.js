// =================================================================
//       CÓDIGO COMPLETO para database/setupDatabase.js
// =================================================================

// Importamos la configuración de nuestro knexfile
const knexConfig = require('../knexfile').development;

// Creamos una instancia de Knex con esa configuración
const knex = require('knex')(knexConfig);

async function crearTablaVacas() {
  try {
    // Verificamos si la tabla ya existe para no crearla dos veces
    const existe = await knex.schema.hasTable('vacas');
    if (!existe) {
      // Si no existe, creamos la tabla
      await knex.schema.createTable('vacas', (table) => {
        // Definimos las columnas
        table.increments('id').primary(); // ID numérico que se auto-incrementa y es la clave primaria
        table.integer('numero').notNullable(); // El número de la vaca, no puede ser nulo
        table.string('nombre').notNullable(); // El nombre de la vaca
        table.string('raza'); // La raza
        table.string('status'); // El status
      });
      console.log('¡Tabla "vacas" creada con éxito!');
    } else {
      console.log('La tabla "vacas" ya existe. No se realizaron cambios.');
    }
  } catch (error) {
    console.error('Error al crear la tabla:', error);
  } finally {
    // Cerramos la conexión a la base de datos
    await knex.destroy();
  }
}

// Ejecutamos la función
crearTablaVacas();