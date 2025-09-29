const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'public', 'assets', 'logo.png');

function fmtMX(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  } catch {
    return new Date(iso).toLocaleString('es-MX');
  }
}

function generarProcedimientoPDF(res, data) {
  const {
    ranchoNombre = '',
    propietarioNombre = '',
    mvzNombre = '',
    tipo = 'Procedimiento',
    resultados = [],
  } = data || {};

  // ——— cabecera HTTP
  res.setHeader('Content-Type', 'application/pdf');
  const safeRancho = (ranchoNombre || 'Mi_Rancho').replace(/\s+/g, '_');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="reporte_${tipo.toLowerCase()}_${safeRancho}.pdf"`
  );

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    info: { Title: `Informe de ${tipo}`, Author: 'JFB Ganadería Inteligente' },
  });
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const rightBlockW = 300; // ancho fijo del bloque derecho del header
  let y = margin;

  // ——— LOGO
  try {
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, margin, y - 10, { width: 80, height: 80 });
    }
  } catch {}

  // ——— HEADER (todo con width fijo y sin saltos)
  doc.font('Helvetica-Bold').fontSize(16);
  doc.text('JFB Ganadería Inteligente', pageWidth - margin - rightBlockW, y, {
    width: rightBlockW, align: 'right', lineBreak: false
  });

  doc.font('Helvetica').fontSize(10);
  doc.text(`Rancho: ${ranchoNombre || '(No especificado)'}`,
           pageWidth - margin - rightBlockW, y + 16,
           { width: rightBlockW, align: 'right', lineBreak: false });
  doc.text(`Propietario: ${propietarioNombre || '(No especificado)'}`,
           pageWidth - margin - rightBlockW, y + 32,
           { width: rightBlockW, align: 'right', lineBreak: false });
  doc.text(`Médico Veterinario: ${mvzNombre || '(No especificado)'}`,
           pageWidth - margin - rightBlockW, y + 48,
           { width: rightBlockW, align: 'right', lineBreak: false });

  // ——— BANDA GRIS TÍTULO
  y += 76;
  const bandW = pageWidth - margin * 2;
  doc.save().rect(margin, y, bandW, 25).fill('#E5E7EB').restore();

  doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(14);
  doc.text(`INFORME DE ${String(tipo).toUpperCase()}`, margin, y + 5, {
    width: bandW, align: 'center', lineBreak: false
  });

  doc.fillColor('black').font('Helvetica').fontSize(10);
  y += 45;

  // ——— GRID de columnas (ancho fijo, sin saltos)
  const col1x = margin + 10;     const col1w = 150;
  const col2x = margin + 190;    const col2w = 150;
  const col3x = margin + 360;    const col3w = 180;

  const vacasPorPagina = 10;
  let count = 0;

  function renderFila(item) {
    const r = item.resultado || {};
    const fechaTxt = fmtMX(item.fechaISO);
    const suciaTxt = (r.sucia === true ? 'Sí' : (r.sucia === false ? 'No' : '-'));

    // título
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`Vaca N°: ${item.numeroVaca ?? '-'}`, col1x, y, { width: bandW - 20, lineBreak: false });

    doc.font('Helvetica').fontSize(10);

    // fila 1
    doc.text(`Fecha: ${fechaTxt}`,        col1x, y + 16, { width: col1w, lineBreak: false });
    doc.text(`Estática: ${r.estatica ?? '-'}`, col2x, y + 16, { width: col2w, lineBreak: false });
    doc.text(`Ciclando: ${r.ciclando ?? '-'}`, col3x, y + 16, { width: col3w, lineBreak: false });

    // fila 2
    doc.text(`Gestante: ${r.gestante ?? '-'}`,    col1x, y + 32, { width: col1w, lineBreak: false });
    doc.text(`Sucia: ${suciaTxt}`,                 col2x, y + 32, { width: col2w, lineBreak: false });
    doc.text(`Sub-respuesta: ${r.subRespuesta ?? '-'}`, col3x, y + 32, { width: col3w, lineBreak: false });

    // observaciones (una sola línea, truncada si es larguísima)
    const obs = `Obs.: ${r.comentarios || 'Ninguna.'}`;
    doc.text(obs, col1x, y + 48, { width: bandW - 20, lineBreak: false, ellipsis: true });

    // separador
    doc.moveTo(margin, y + 60).lineTo(pageWidth - margin, y + 60)
       .strokeColor('#AAAAAA').lineWidth(0.5).stroke();

    y += 70;
  }

  for (const item of resultados) {
    // asegura fecha
    if (!item.fechaISO) item.fechaISO = new Date().toISOString();

    // salto de página
    if (count > 0 && count % vacasPorPagina === 0) {
      doc.addPage();
      y = margin;

      // header repetido, con mismo ancho fijo
      try {
        if (fs.existsSync(LOGO_PATH)) {
          doc.image(LOGO_PATH, margin, y - 10, { width: 80, height: 80 });
        }
      } catch {}

      doc.font('Helvetica-Bold').fontSize(16);
      doc.text('JFB Ganadería Inteligente',
               pageWidth - margin - rightBlockW, y,
               { width: rightBlockW, align: 'right', lineBreak: false });

      doc.font('Helvetica').fontSize(10);
      doc.text(`Rancho: ${ranchoNombre || '(No especificado)'}`,
               pageWidth - margin - rightBlockW, y + 16,
               { width: rightBlockW, align: 'right', lineBreak: false });
      doc.text(`Propietario: ${propietarioNombre || '(No especificado)'}`,
               pageWidth - margin - rightBlockW, y + 32,
               { width: rightBlockW, align: 'right', lineBreak: false });
      doc.text(`Médico Veterinario: ${mvzNombre || '(No especificado)'}`,
               pageWidth - margin - rightBlockW, y + 48,
               { width: rightBlockW, align: 'right', lineBreak: false });

      y += 76;
      doc.save().rect(margin, y, bandW, 25).fill('#E5E7EB').restore();

      doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(14);
      doc.text(`INFORME DE ${String(tipo).toUpperCase()}`, margin, y + 5, {
        width: bandW, align: 'center', lineBreak: false
      });

      doc.fillColor('black').font('Helvetica').fontSize(10);
      y += 45;
    }

    renderFila(item);
    count++;
  }

  doc.end();
}

module.exports = { generarProcedimientoPDF };
