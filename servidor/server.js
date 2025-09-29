// ================== Dependencias base ==================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const jwt = require('jsonwebtoken');

const knexConfig = require('../knexfile').development; // ajusta si usas producción
const knex = require('knex')(knexConfig);

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

// ================== App + Configuración ==================
const app = express();
const PORT = process.env.PORT || 3000;

// JWT secret (usa variable en producción; fallback local para pruebas)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-solo-local-cámbialo';

// JSON parser
app.use(express.json());

// CORS: permite llamadas desde tu hosting de Firebase
app.use(
  cors({
    origin: [
      'https://jfb-ganaderia.web.app',        // <-- CAMBIA por tu URL real de Firebase
      'https://jfb-ganaderia.firebaseapp.com' // <-- CAMBIA por tu URL real de Firebase
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
  })
);

// (Opcional) servir /assets del repo
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// (Opcional/local) servir frontend si corres todo junto en local.
// En producción (Firebase + Render) NO es necesario.
if (process.env.SERVE_CLIENT === '1') {
  app.use(
    express.static(path.join(__dirname, '..', 'cliente'), { extensions: ['html'] })
  );
  app.use(
    '/cliente',
    express.static(path.join(__dirname, '..', 'cliente'), { extensions: ['html'] })
  );
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'cliente', 'index.html'));
  });
}

// ================== Middleware de Autenticación ==================
function protegerRuta(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Acceso no autorizado, token no proporcionado.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded; // { id, rol, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// ================== Utils ==================
const quitarAcentos = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const MAP_TIPOS = {
  palpacion: 'palpación',
  'palpación': 'palpación',
  inseminacion: 'inseminación',
  'inseminación': 'inseminación',
  'transferencia de embrion': 'transferencia de embrión',
  'transferencia de embrión': 'transferencia de embrión',
  sincronizacion: 'sincronización',
  'sincronización': 'sincronización',
  'aplicacion de medicamento': 'aplicación de medicamento',
  'aplicación de medicamento': 'aplicación de medicamento'
};

function normalizaTipo(tipo = '') {
  const t = quitarAcentos(tipo);
  return MAP_TIPOS[t] || tipo;
}

// ================== Rutas de AUTH ==================

// LOGIN (añadido)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rolPreferido } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Email y contraseña son requeridos.' });
    }

    const usuario = await knex('usuarios').where({ email }).first();
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Si quieres aceptar rolPreferido solo si coincide con el de DB, usa el de DB.
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
});

// REGISTER (tu ruta, pero en /api/auth/register; dejo alias viejo)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, email, password, rancho_nombre } = req.body;

    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Nombre, email y contraseña son requeridos.' });
    }

    const existente = await knex('usuarios').where({ email }).first();
    if (existente) {
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const rol = 'propietario';

    const [id] = await knex('usuarios').insert({
      nombre,
      email,
      password: hashed,
      rol
    });

    const usuario = await knex('usuarios').where({ id }).first();

    if (usuario.rol === 'propietario') {
      const nombreRancho =
        rancho_nombre && rancho_nombre.trim()
          ? rancho_nombre.trim()
          : `Rancho de ${usuario.nombre}`;

      await knex('ranchos').insert({
        nombre: nombreRancho,
        propietario_id: usuario.id,
        codigo_acceso: crypto.randomBytes(3).toString('hex')
      });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      token
    });
  } catch (error) {
    console.error('Error en /api/auth/register:', error);
    res.status(500).json({ error: 'Error al registrar el usuario.' });
  }
});

// Alias para compatibilidad con tu front previo:
app.post('/api/register', (req, res, next) => {
  req.url = '/api/auth/register';
  next();
});

// ================== Rutas de Propietario y Vacas ==================
app.get('/api/mi-rancho', protegerRuta, async (req, res) => {
  if (req.usuario.rol !== 'propietario')
    return res.status(403).json({ error: 'Acción no permitida.' });
  try {
    const rancho = await knex('ranchos')
      .where({ propietario_id: req.usuario.id })
      .first();
    if (rancho) res.json(rancho);
    else
      res
        .status(404)
        .json({ error: 'No se encontró un rancho para este propietario.' });
  } catch (error) {
    console.error('Error /api/mi-rancho:', error);
    res.status(500).json({ error: 'Error al obtener la información del rancho.' });
  }
});

app.get('/api/vacas', protegerRuta, async (req, res) => {
  try {
    const rancho = await knex('ranchos')
      .where({ propietario_id: req.usuario.id })
      .first();
    if (!rancho) return res.json([]);
    const vacas = await knex('vacas').where({ rancho_id: rancho.id });
    res.json(vacas);
  } catch (error) {
    console.error('Error GET /api/vacas:', error);
    res.status(500).json({ error: 'Error al obtener las vacas.' });
  }
});

app.post('/api/vacas', protegerRuta, async (req, res) => {
  if (req.usuario.rol !== 'propietario')
    return res.status(403).json({ error: 'Acción no permitida.' });

  const { numero, nombre, raza, status, numero_pierna } = req.body;
  try {
    const rancho = await knex('ranchos')
      .where({ propietario_id: req.usuario.id })
      .first();
    if (!rancho)
      return res
        .status(403)
        .json({ error: 'Usuario no tiene un rancho asignado.' });

    const [id] = await knex('vacas').insert({
      numero,
      nombre,
      raza,
      status,
      numero_pierna,
      rancho_id: rancho.id
    });
    const nuevaVaca = await knex('vacas').where({ id }).first();
    res.status(201).json(nuevaVaca);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res
        .status(409)
        .json({ error: `Ya existe una vaca con el número SINIIGA ${numero}.` });
    }
    console.error('Error POST /api/vacas:', error);
    res.status(500).json({ error: 'Error al añadir la vaca.' });
  }
});

app.delete('/api/vacas/:id', protegerRuta, async (req, res) => {
  const { id } = req.params;
  const propietario_id = req.usuario.id;
  try {
    const vaca = await knex('vacas').where({ id }).first();
    if (!vaca) return res.status(404).json({ error: 'Vaca no encontrada.' });

    const rancho = await knex('ranchos')
      .where({ id: vaca.rancho_id, propietario_id })
      .first();
    if (!rancho)
      return res
        .status(403)
        .json({ error: 'No tienes permiso para eliminar esta vaca.' });

    await knex('vacas').where({ id }).del();
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar la vaca:', error);
    res.status(500).json({ error: 'Error interno al eliminar la vaca.' });
  }
});

// ================== Rutas de MVZ ==================
app.post('/api/acceder-rancho', protegerRuta, async (req, res) => {
  if (req.usuario.rol !== 'mvz') {
    return res.status(403).json({ error: 'Acción solo para veterinarios.' });
  }

  let { codigo_acceso } = req.body || {};
  codigo_acceso = (codigo_acceso || '').trim();
  if (!codigo_acceso) {
    return res.status(400).json({ error: 'El código de acceso es requerido.' });
  }

  try {
    const rancho = await knex('ranchos').where({ codigo_acceso }).first();
    if (!rancho) return res.status(404).json({ error: 'Rancho no encontrado.' });

    return res.json({
      rancho: { id: rancho.id, nombre: rancho.nombre, codigo_acceso: rancho.codigo_acceso }
    });
  } catch (error) {
    console.error('Error /api/acceder-rancho:', error);
    return res.status(500).json({ error: 'Error al acceder al rancho.' });
  }
});

app.get('/api/rancho/:ranchoId/buscar-vaca', protegerRuta, async (req, res) => {
  if (req.usuario.rol !== 'mvz') {
    return res.status(403).json({ error: 'Acción solo para veterinarios.' });
  }

  const { ranchoId } = req.params;
  const { numero_siniiga = '', numero_pierna = '' } = req.query;

  const qSiniiga = String(numero_siniiga).trim();
  const qPierna = String(numero_pierna).trim();

  if (!qSiniiga && !qPierna) {
    return res
      .status(400)
      .json({ error: 'Se necesita número SINIIGA o número de pierna.' });
  }
  if ((qSiniiga && qSiniiga.length < 3) || (qPierna && qPierna.length < 3)) {
    return res
      .status(400)
      .json({ error: 'Escribe al menos 3 caracteres para buscar.' });
  }

  try {
    let query = knex('vacas').where({ rancho_id: ranchoId });

    if (qSiniiga) query = query.where('numero', 'like', `%${qSiniiga}%`);
    if (qPierna) query = query.where('numero_pierna', 'like', `%${qPierna}%`);

    const vacas = await query.select(
      'id',
      'numero',
      'numero_pierna',
      'nombre',
      'raza',
      'status'
    );
    return res.json(vacas);
  } catch (error) {
    console.error('Error GET /api/rancho/:ranchoId/buscar-vaca:', error);
    return res.status(500).json({ error: 'Error al buscar la vaca.' });
  }
});

// ================== Config PDF por tipo ==================
const PDF_CONFIG = {
  'palpación': {
    campos: ['estatica', 'gestante', 'ciclando', 'sucia', 'gestante_detalle', 'ciclando_detalle', 'observaciones'],
    etiquetas: {
      estatica: 'Estática',
      gestante: 'Gestante',
      ciclando: 'Ciclando',
      sucia: 'Sucia',
      gestante_detalle: 'Edad Gestacional',
      ciclando_detalle: 'Detalle Ciclo',
      observaciones: 'Observaciones'
    }
  },
  'inseminación': {
    campos: ['tecnica', 'fecha_celo', 'pajilla_toro', 'dosis', 'observaciones'],
    etiquetas: {
      tecnica: 'Técnica',
      fecha_celo: 'Fecha de Celo',
      pajilla_toro: 'Pajilla / Toro',
      dosis: 'Dosis',
      observaciones: 'Observaciones'
    }
  },
  'transferencia de embrión': {
    campos: ['donadora', 'toro_embrion', 'produccion', 'lado', 'lado_detalle', 'observaciones'],
    etiquetas: {
      donadora: 'Vaca Donadora',
      toro_embrion: 'Toro del Embrión',
      produccion: 'Producción',
      lado: 'Lado',
      lado_detalle: 'Detalle Lado',
      observaciones: 'Observaciones'
    }
  },
  'sincronización': {
    campos: ['protocolo', 'protocolo_otro', 'fecha_inicio', 'fecha_fin', 'hormonas', 'observaciones'],
    etiquetas: {
      protocolo: 'Protocolo',
      protocolo_otro: 'Otro Protocolo',
      fecha_inicio: 'Fecha Inicio',
      fecha_fin: 'Fecha Fin',
      hormonas: 'Hormonas',
      observaciones: 'Observaciones'
    }
  },
  'aplicación de medicamento': {
    campos: ['farmaco', 'dosis', 'via', 'lote', 'caducidad', 'observaciones'],
    etiquetas: {
      farmaco: 'Fármaco',
      dosis: 'Dosis',
      via: 'Vía',
      lote: 'Lote',
      caducidad: 'Caducidad',
      observaciones: 'Observaciones'
    }
  }
};

// ================== HISTORIAL ==================
app.get('/api/vacas/:id/historial', protegerRuta, async (req, res) => {
  const { id } = req.params;
  try {
    const historial = await knex('eventos')
      .where({ vaca_id: id })
      .orderBy('fecha_evento', 'desc');
    res.json(historial);
  } catch (error) {
    console.error(`Error al obtener el historial de la vaca ${id}:`, error);
    res.status(500).json({ error: 'Error al obtener el historial.' });
  }
});

// ================== Procedimientos + PDF ==================
app.post('/api/procedimientos/finalizar', protegerRuta, async (req, res) => {
  const { ranchoId, tipo, resultados, ranchoNombreManual } = req.body;
  const mvz_id = req.usuario.id;
  const tipoNormalizado = normalizaTipo(tipo);

  try {
    // Persistencia
    if (ranchoId && (resultados || []).length > 0) {
      await knex.transaction(async (trx) => {
        const [idProcedimiento] = await trx('procedimientos').insert({
          rancho_id: ranchoId,
          mvz_id,
          tipo: tipoNormalizado
        });

        const resultadosParaInsertar = (resultados || []).map((item) => ({
          procedimiento_id: idProcedimiento,
          vaca_id: item.vacaId,
          resultado: JSON.stringify(item.resultado || {}),
          comentarios: item.resultado?.observaciones || null
        }));

        if (resultadosParaInsertar.length > 0) {
          await trx('resultados_procedimiento').insert(resultadosParaInsertar);
        }

        for (const item of resultados || []) {
          if (!item.vacaId) continue;
          const nuevoStatus = `${tipoNormalizado}: ${item.resumen || ''}`.trim();
          await trx('vacas').where('id', item.vacaId).update({ status: nuevoStatus });
          await trx('eventos').insert({ vaca_id: item.vacaId, descripcion: nuevoStatus });
        }
      });
    }

    // Encabezado PDF
    let rancho, propietario;
    const mvz = await knex('usuarios').where({ id: mvz_id }).first();

    let ranchoNombreHeader = '(Manual)';
    let propietarioNombreHeader = 'N/A';

    if (ranchoId) {
      rancho = await knex('ranchos').where({ id: ranchoId }).first();
      if (rancho) {
        ranchoNombreHeader = rancho.nombre || '(Sin nombre)';
        propietario = await knex('usuarios').where({ id: rancho.propietario_id }).first();
        propietarioNombreHeader = propietario?.nombre || 'N/A';
      }
    } else if (ranchoNombreManual && ranchoNombreManual.trim()) {
      ranchoNombreHeader = `${ranchoNombreManual.trim()} (Manual)`;
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const nombreArchivo = `reporte_final.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    doc.pipe(res);

    // Logo (opcional)
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) doc.image(logoPath, 40, 30, { width: 80 });

    // Encabezado
    doc.fontSize(16).font('Helvetica-Bold')
      .text('JFB Ganadería Inteligente', 0, 32, { align: 'right' });
    doc.fontSize(10).font('Helvetica')
      .text(`Rancho: ${ranchoNombreHeader}`, { align: 'right' });
    doc.text(`Propietario: ${propietarioNombreHeader}`, { align: 'right' });
    doc.text(`Médico Veterinario: ${mvz?.nombre || '-'}`, { align: 'right' });
    doc.moveDown(2);

    // Barra superior azul
    const yBarra = doc.y;
    doc.rect(40, yBarra, doc.page.width - 80, 25).fill('#001F3D');
    doc.fill('#E1E1E1').font('Helvetica-Bold').fontSize(14)
      .text(`INFORME DE ${tipoNormalizado.toUpperCase()}`, 0, yBarra + 7, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor('black');

    const drawHighlightedText = (label, value, x, y, highlight = false) => {
      const texto = `${label}${value ?? '-'}`;
      if (highlight) {
        const w = doc.widthOfString(texto);
        doc.rect(x - 2, y - 2, w + 4, 12).fill('#FEF9C3');
      }
      doc.fillColor('black').font('Helvetica-Bold').text(label, x, y, { continued: true });
      doc.font('Helvetica').text(value ?? '-');
    };

    const conf = PDF_CONFIG[tipoNormalizado] || PDF_CONFIG['palpación'];

    (resultados || []).forEach((item, idx) => {
      const r = item.resultado || {};
      doc.fillColor('black').font('Helvetica-Bold').fontSize(11)
        .text(`Vaca N°: ${item.numeroVaca || '-'}`, 40);
      doc.moveDown(0.4);
      doc.fontSize(9);

      const lh = 14;
      let y = doc.y;

      if (tipoNormalizado.toLowerCase() === 'palpación' || tipoNormalizado.toLowerCase() === 'palpacion') {
        const col1 = 40, col2 = 220, col3 = 400;
        drawHighlightedText('Estática: ', r.estatica || '-', col1, y);
        drawHighlightedText('Gestante: ', r.gestante || '-', col2, y, String(r.gestante).toLowerCase() === 'sí');
        drawHighlightedText('Ciclando: ', r.ciclando || '-', col3, y, String(r.ciclando).toLowerCase() === 'sí');
        y += lh;

        drawHighlightedText('Sucia: ', r.sucia || '-', col1, y);
        if (String(r.gestante).toLowerCase() === 'sí') {
          drawHighlightedText('Edad Gestacional: ', r.gestante_detalle || '-', col2, y);
        }
        if (String(r.ciclando).toLowerCase() === 'sí') {
          drawHighlightedText('Detalle Ciclo: ', r.ciclando_detalle || '-', col3, y);
        }

        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Observaciones: ', 40, doc.y, { continued: true });
        doc.font('Helvetica').text(r.observaciones || 'Ninguna.', { width: doc.page.width - 80 });
      } else {
        const col1 = 40, col2 = 300;
        const camposFiltrados = (conf.campos || []).filter((campo) => {
          if (campo === 'gestante_detalle' && (r.gestante !== 'Sí' && r.gestante !== 'sí')) return false;
          if (campo === 'ciclando_detalle' && (r.ciclando !== 'Sí' && r.ciclando !== 'sí')) return false;
          return true;
        });

        camposFiltrados.forEach((campo, i) => {
          const etiqueta = conf.etiquetas?.[campo] || (campo.charAt(0).toUpperCase() + campo.slice(1));
          let valor = r[campo];
          if (valor === '' || valor == null) valor = '-';

          const x = i % 2 === 0 ? col1 : col2;
          const yActual = y + Math.floor(i / 2) * lh;

          const highlight = ['sí', 'si'].includes(String(valor).toLowerCase());
          drawHighlightedText(`${etiqueta}: `, valor, x, yActual, highlight);
        });

        if (!conf.campos?.includes('observaciones')) {
          doc.moveDown(0.8);
          doc.font('Helvetica-Bold').text('Observaciones: ', 40, doc.y, { continued: true });
          doc.font('Helvetica').text(r.observaciones || 'Ninguna.', { width: doc.page.width - 80 });
        } else {
          doc.moveDown(1);
        }
      }

      doc.strokeColor('#001F3D').lineWidth(0.5)
        .moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(1.2);

      if (doc.y > doc.page.height - 100 && idx < (resultados.length - 1)) {
        doc.addPage();
      }
    });

    doc.end();
  } catch (error) {
    console.error('Error al finalizar el procedimiento:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno al procesar la sesión.' });
    }
  }
});

// ================== Healthcheck ==================
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mensaje: 'Servidor funcionando en Render 🚀',
    time: new Date().toISOString()
  });
});


// ================== Iniciar Servidor ==================
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
