// knexfile.js
// Carga las variables de entorno del archivo .env para usarlas localmente
require('dotenv').config(); 

module.exports = {
  
  // Tu configuración para la computadora local
  development: {
    client: 'sqlite3',
    connection: {
      filename: './data/database.db' // Asegúrate que esta ruta sea correcta
    },
    useNullAsDefault: true
  },

  // La nueva configuración para el servidor en internet (Render)
  production: {
    client: 'pg', // 'pg' es el cliente para PostgreSQL
    connection: process.env.DATABASE_URL, // Esta es la URL que te dará Render
    pool: {
      min: 2,
      max: 10
    }
  }

};