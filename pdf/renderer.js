// server/pdf/renderer.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const LOGO_PATH = path.join(__dirname, "..", "public", "assets", "logo.png");

function fmtMX(iso) {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return new Date().toLocaleString("es-MX");
  }
}

// -------- columnas por tipo (ajusta textos a tu gusto) ----------
const LAYOUTS = {
  palpación: [
    { key: "numeroVaca", label: "Vaca N°", w: 110 },
    { key: "fechaISO", label: "Fecha", w: 130, format: (v) => fmtMX(v) },
    { key: "resultado.estatica", label: "Estática", w: 90 },
    { key: "resultado.ciclando", label: "Ciclando", w: 90 },
    { key: "resultado.gestante", label: "Gestante", w: 90 },
    { key: "resultado.sucia", label: "Sucia", w: 60, format: v => (v ? "Sí" : "No") },
    { key: "resultado.subRespuesta", label: "Sub-resp.", w: 110 },
  ],
  inseminación: [
    { key: "numeroVaca", label: "Vaca N°", w: 110 },
    { key: "fechaISO", label: "Fecha", w: 130, format: (v) => fmtMX(v) },
    { key: "resultado.toro", label: "Toro", w: 120 },
    { key: "resultado.semenLote", label: "Lote", w: 90 },
    { key: "resultado.via", label: "Vía", w: 80 },            // cérvix / intrauterina…
    { key: "resultado.tecnica", label: "Técnica", w: 120 },   // a mano, pistolete, etc.
  ],
  "transferencia de embrión": [
    { key: "numeroVaca", label: "Vaca N°", w: 110 },
    { key: "fechaISO", label: "Fecha", w: 130, format: (v) => fmtMX(v) },
    { key: "resultado.donadora", label: "Donadora", w: 120 },
    { key: "resultado.receptora", label: "Receptora", w: 120 },
    { key: "resultado.grado", label: "Grado", w: 80 },        // I, II, III…
    { key: "resultado.estado", label: "Estado", w: 120 },     // fresco / congelado
  ],
  sincronización: [
    { key: "numeroVaca", label: "Vaca N°", w: 110 },
    { key: "fechaISO", label: "Fecha", w: 130, format: (v) => fmtMX(v) },
    { key: "resultado.protocolo", label: "Protocolo", w: 160 }, // Ovsynch, Presynch…
    { key: "resultado.dia", label: "Día", w: 60 },
    { key: "resultado.farmaco", label: "Fármaco", w: 160 },
  ],
  "aplicación de medicamento": [
    { key: "numeroVaca", label: "Vaca N°", w: 110 },
    { key: "fechaISO", label: "Fecha", w: 130, format: (v) => fmtMX(v) },
    { key: "resultado.medicamento", label: "Medicamento", w: 180 },
    { key: "resultado.dosis", label: "Dosis", w: 80 },
    { key: "resultado.via", label: "Vía", w: 80 },
    { key: "resultado.motivo", label: "Motivo", w: 150 },
  ],
  otro: [
    { key: "numeroVaca", label: "Vaca N°", w: 110 },
    { key: "fechaISO", label: "Fecha", w: 130, format: (v) => fmtMX(v) },
    { key: "resultado.tipo", label: "Tipo", w: 160 },
    { key: "resultado.detalle", label: "Detalle", w: 300 },
  ],
};

// -------- helper para leer rutas tipo "resultado.estatica" ------
function get(obj, path, def = "-") {
  try {
    return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj) ?? def;
  } catch {
    return def;
  }
}

function renderHeader(doc, { pageWidth, margin, ranchoNombre, propietarioNombre, mvzNombre, tipo }) {
  const rightW = 300;
  let y = margin;

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, margin, y - 10, { width: 80, height: 80 });
  }

  doc.font("Helvetica-Bold").fontSize(16)
     .text("JFB Ganadería Inteligente", pageWidth - margin - rightW, y, {
       width: rightW, align: "right", lineBreak: false,
     });

  doc.font("Helvetica").fontSize(10);
  doc.text(`Rancho: ${ranchoNombre || "(No especificado)"}`, pageWidth - margin - rightW, y + 16, { width: rightW, align: "right", lineBreak: false });
  doc.text(`Propietario: ${propietarioNombre || "(No especificado)"}`, pageWidth - margin - rightW, y + 32, { width: rightW, align: "right", lineBreak: false });
  doc.text(`Médico Veterinario: ${mvzNombre || "(No especificado)"}`, pageWidth - margin - rightW, y + 48, { width: rightW, align: "right", lineBreak: false });

  // banda gris del título
  y += 76;
  const bandW = pageWidth - margin * 2;
  doc.save().rect(margin, y, bandW, 25).fill("#E5E7EB").restore();
  doc.fillColor("#1F2937").font("Helvetica-Bold").fontSize(14)
     .text(`INFORME DE ${String(tipo).toUpperCase()}`, margin, y + 5, { width: bandW, align: "center", lineBreak: false });
  doc.fillColor("black").font("Helvetica").fontSize(10);

  return y + 45; // posición Y inicio de lista
}

function renderer(res, payload) {
  const { tipo = "palpación", ranchoNombre, propietarioNombre, mvzNombre, resultados = [] } = payload;

  // cabeceras
  res.setHeader("Content-Type", "application/pdf");
  const safeRancho = (ranchoNombre || "Mi_Rancho").replace(/\s+/g, "_");
  res.setHeader("Content-Disposition", `attachment; filename="reporte_${tipo.replace(/\s+/g,'_').toLowerCase()}_${safeRancho}.pdf"`);

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    info: { Title: `Informe de ${tipo}`, Author: "JFB Ganadería Inteligente" },
  });
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;

  const columns = LAYOUTS[tipo.toLowerCase()] || LAYOUTS["otro"];
  const rowHeight = 54;
  const gap = 6;
  const bandW = pageWidth - margin * 2;

  let y = renderHeader(doc, { pageWidth, margin, ranchoNombre, propietarioNombre, mvzNombre, tipo });

  // encabezado de columnas
  let x = margin;
  doc.font("Helvetica-Bold");
  columns.forEach(c => {
    doc.text(c.label, x + 8, y, { width: c.w - 16, lineBreak: false });
    x += c.w;
  });
  doc.moveTo(margin, y + 16).lineTo(pageWidth - margin, y + 16).strokeColor("#BDBDBD").lineWidth(0.8).stroke();
  y += 18;
  doc.font("Helvetica");

  // filas
  resultados.forEach((item, idx) => {
    if (!item.fechaISO) item.fechaISO = new Date().toISOString();

    // salto de página
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = renderHeader(doc, { pageWidth, margin, ranchoNombre, propietarioNombre, mvzNombre, tipo });

      // re imprimir encabezado columnas
      let xh = margin;
      doc.font("Helvetica-Bold");
      columns.forEach(c => {
        doc.text(c.label, xh + 8, y, { width: c.w - 16, lineBreak: false });
        xh += c.w;
      });
      doc.moveTo(margin, y + 16).lineTo(pageWidth - margin, y + 16).strokeColor("#BDBDBD").lineWidth(0.8).stroke();
      y += 18;
      doc.font("Helvetica");
    }

    // cajita fila
    doc.roundedRect(margin, y, bandW, rowHeight, 6).strokeColor("#E0E0E0").lineWidth(0.8).stroke();

    // columnas
    let cx = margin;
    columns.forEach(c => {
      const raw = get(item, c.key);
      const val = (c.format ? c.format(raw) : raw) ?? "-";
      doc.text(String(val), cx + 8, y + 20, {
        width: c.w - 16,
        lineBreak: false,
        ellipsis: true,
      });
      cx += c.w;
    });

    y += rowHeight + gap;

    // Observaciones (si existen) ocupa una línea completa bajo la fila
    const obs = item.resultado?.comentarios;
    if (obs) {
      if (y + 22 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = renderHeader(doc, { pageWidth, margin, ranchoNombre, propietarioNombre, mvzNombre, tipo });
      }
      doc.text(`Obs.: ${obs}`, margin + 8, y, { width: bandW - 16, ellipsis: true });
      y += 22;
    }
  });

  doc.end();
}

module.exports = { renderer };
