// cliente/defs-procedimientos.js
export const PROCEDIMIENTOS = {
  palpación: [
    { id:"gestante", label:"Gestante", type:"select", options:["Sí","No","N/A"] },
    { id:"ciclando", label:"Ciclando", type:"select", options:["Sí","No"] },
    { id:"estatica", label:"Estática", type:"select", options:["normal","quiste","atresia","—"] },
    { id:"subRespuesta", label:"Sub-respuesta", type:"select", options:["I1","I2","I3","D1","D2","D3","—"] },
    { id:"sucia", label:"Sucia", type:"checkbox" },
    { id:"comentarios", label:"Observaciones", type:"textarea" },
  ],
  inseminación: [
    { id:"toro", label:"Toro", type:"text" },
    { id:"semenLote", label:"Lote", type:"text" },
    { id:"via", label:"Vía", type:"select", options:["cérvix","intrauterina"] },
    { id:"tecnica", label:"Técnica", type:"select", options:["pistolete","a mano","—"] },
    { id:"comentarios", label:"Observaciones", type:"textarea" },
  ],
  "transferencia de embrión": [
    { id:"donadora", label:"Donadora", type:"text" },
    { id:"receptora", label:"Receptora", type:"text" },
    { id:"grado", label:"Grado", type:"select", options:["I","II","III"] },
    { id:"estado", label:"Estado del embrión", type:"select", options:["fresco","congelado"] },
    { id:"comentarios", label:"Observaciones", type:"textarea" },
  ],
  sincronización: [
    { id:"protocolo", label:"Protocolo", type:"text" },
    { id:"dia", label:"Día del esquema", type:"number" },
    { id:"farmaco", label:"Fármaco aplicado", type:"text" },
    { id:"comentarios", label:"Observaciones", type:"textarea" },
  ],
  "aplicación de medicamento": [
    { id:"medicamento", label:"Medicamento", type:"text" },
    { id:"dosis", label:"Dosis", type:"text" },
    { id:"via", label:"Vía", type:"select", options:["IM","IV","SC","VO"] },
    { id:"motivo", label:"Motivo", type:"text" },
    { id:"comentarios", label:"Observaciones", type:"textarea" },
  ],
  otro: [
    { id:"tipo", label:"Tipo de actividad", type:"text" },
    { id:"detalle", label:"Detalle", type:"textarea" },
  ],
};
