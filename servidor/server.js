require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const knexConfig = require('../knexfile')[env];

// >>>>>> Asegurar la carpeta database ANTES de crear knex <<<<<<
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const knex = require('knex')(knexConfig);     // <-- ya existe la carpeta
const { protegerRuta } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secreto-largo-cambialo';

app.use(cors());
app.use(express.json());

// Servir /assets desde cliente (logo, etc.)
app.use('/assets', express.static(path.join(__dirname, '..', 'cliente', 'assets')));

// ====== Crear tablas si no existen (modo demo) ======
async function ensureTables() {
  const hasUsuarios = await knex.schema.hasTable('usuarios');
  if (!hasUsuarios) {
    await knex.schema.createTable('usuarios', (t) => {
      t.increments('id').primary();
      t.text('nombre');
      t.text('email').notNullable().unique();
      t.text('password_hash').notNullable();
      t.text('rol').notNullable().defaultTo('PROPIETARIO'); // MVZ | PROPIETARIO
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  const hasRanchos = await knex.schema.hasTable('ranchos');
  if (!hasRanchos) {
    await knex.schema.createTable('ranchos', (t) => {
      t.increments('id').primary();
      t.integer('propietario_id').references('usuarios.id').onDelete('CASCADE');
      t.text('nombre').notNullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  const hasProc = await knex.schema.hasTable('procedimientos');
  if (!hasProc) {
    await knex.schema.createTable('procedimientos', (t) => {
      t.increments('id').primary();
      t.integer('usuario_id').references('usuarios.id').onDelete('SET NULL');
      t.text('tipo').notNullable();
      t.json('datos').notNullable(); // jsonb en Postgres; aquí JSON
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

// ====== Helpers ======
function signToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol, email: usuario.email }, JWT_SECRET, { expiresIn: '7d' });
}

// ====== Rutas ======
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.post('/api/auth/registrar', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
    const ex = await knex('usuarios').where({ email }).first();
    if (ex) return res.status(409).json({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    const [id] = await knex('usuarios').insert({ nombre, email, password_hash: hash, rol: rol || 'PROPIETARIO' });
    const usuario = { id, nombre, email, rol: rol || 'PROPIETARIO' };
    const token = signToken(usuario);
    res.json({ usuario, token });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Error al registrar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await knex('usuarios').where({ email }).first();
    if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    const usuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
    const token = signToken(usuario);
    res.json({ usuario, token });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Error en login' });
  }
});

app.get('/api/ranchos', protegerRuta, async (req, res) => {
  try {
    const rows = await knex('ranchos').where({ propietario_id: req.user.id }).orderBy('id', 'desc');
    res.json(rows);
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Error al listar ranchos' });
  }
});

app.post('/api/procedimientos/finalizar', protegerRuta, async (req, res) => {
  try {
    const payload = req.body;
    const [id] = await knex('procedimientos').insert({
      usuario_id: req.user.id,
      tipo: payload.tipo || 'Procedimiento',
      datos: JSON.stringify(payload)
    });

    const doc = new PDFDocument({ margin: 40 });
    const logoPath = path.join(__dirname, '..', 'cliente', 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) doc.image(logoPath, 40, 40, { width: 60 });
    doc.fontSize(18).text('Ganadería JFB - Procedimiento', 110, 45);
    doc.moveDown();
    doc.fontSize(12).text(`Tipo: ${payload.tipo || '-'}`);
    doc.text(`Rancho: ${payload.ranchoNombre || '-'}`);
    doc.text(`Vaca: ${payload.vacaNumero || '-'}`);
    doc.moveDown();
    doc.text('Detalle:', { underline: true });

    const safe = { ...payload }; delete safe.token;
    for (const [k, v0] of Object.entries(safe)) {
      let v = v0;
      if (typeof v === 'object') v = JSON.stringify(v);
      doc.text(`- ${k}: ${v}`);
    }
    doc.moveDown();
    doc.text(`Generado por: ${req.user.email}  |  ${new Date().toLocaleString()}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="procedimiento_${id}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Error al finalizar procedimiento' });
  }
});

// Arranque
ensureTables().then(() => {
  app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}`));
});
