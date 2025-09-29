// =================================================================
//      CÓDIGO COMPLETO para middleware/auth.js
// =================================================================
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'este-es-un-secreto-muy-largo-y-dificil-de-adivinar-pero-funciona-para-el-ejemplo';

function protegerRuta(req, res, next) {
    // 1. Obtenemos el token del encabezado de la petición
    const authHeader = req.headers.authorization;

    // 2. Verificamos si el token existe y tiene el formato correcto ("Bearer token...")
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    const token = authHeader.split(' ')[1]; // Nos quedamos solo con la parte del token

    try {
        // 3. Verificamos la validez del token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 4. Si es válido, guardamos los datos del usuario en la petición y continuamos
        req.usuario = decoded;
        next(); // ¡Luz verde! Pasa a la siguiente función (la lógica de la ruta)
    } catch (error) {
        // 5. Si no es válido, rechazamos la petición
        res.status(403).json({ error: 'Token inválido o expirado.' });
    }
}

module.exports = { protegerRuta };