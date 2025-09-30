const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secreto-largo-cambialo';

function protegerRuta(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token faltante' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, rol, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { protegerRuta, JWT_SECRET };
