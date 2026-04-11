import { useState, useEffect, useMemo, createContext, useContext, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const supabase = createClient(
  "https://ujuikoviyyyagxekszuz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqdWlrb3ZpeXl5YWd4ZWtzenV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzk3NzYsImV4cCI6MjA5MTI1NTc3Nn0.9ERmePJ7moJOKlb2OMRxv4irKp70zFcI9umfxWle8r4"
);

const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

function getColors(dark) {
  return dark ? {
    primary: "#2D5F8A", accent: "#1D9E75", accentLight: "#0F3D2E",
    danger: "#E57373", dangerLight: "#3D1F1F", warning: "#FFB74D", warningLight: "#3D2A0F",
    gray: "#9E9E9E", grayLight: "#2A2A2A", border: "rgba(255,255,255,0.1)",
    white: "#1E1E1E", bg: "#121212", text: "#F0F0F0", textMuted: "#9E9E9E",
    cardBg: "#1E1E1E", surface: "#252525", tablehead: "#1A1A1A",
  } : {
    primary: "#1B3A5C", accent: "#1D9E75", accentLight: "#E1F5EE",
    danger: "#A32D2D", dangerLight: "#FCEBEB", warning: "#854F0B", warningLight: "#FAEEDA",
    gray: "#5F5E5A", grayLight: "#F1EFE8", border: "rgba(0,0,0,0.1)",
    white: "#FFFFFF", bg: "#F7F6F2", text: "#1C1C1A", textMuted: "#6B6B67",
    cardBg: "#FFFFFF", surface: "#F7F6F2", tablehead: "#F7F6F2",
  };
}

const PROCESS_TYPES = {
  declaracion_mensual: "Declaración Mensual", declaracion_anual: "Declaración Anual",
  tramite_fiscal: "Trámite Fiscal", otro: "Otro",
};
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const HON_STATUS = {
  pendiente: { label: "Pendiente", bg: "#FAEEDA", color: "#854F0B", bgDark: "#3D2A0F", colorDark: "#FFB74D" },
  pagado:    { label: "Pagado",    bg: "#E1F5EE", color: "#0F6E56", bgDark: "#0F3D2E", colorDark: "#81C784" },
  parcial:   { label: "Pago parcial", bg: "#E6F1FB", color: "#185FA5", bgDark: "#0D2A3D", colorDark: "#64B5F6" },
  vencido:   { label: "Vencido",   bg: "#FCEBEB", color: "#A32D2D", bgDark: "#3D1F1F", colorDark: "#E57373" },
};
const fmt = (d) => d instanceof Date ? d.toISOString().split("T")[0] : d;
const today = new Date();
const fmtMoney = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

// Convert number to Spanish words
function numeroALetras(num) {
  const unidades = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE","DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE"];
  const decenas = ["","","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  const centenas = ["","CIEN","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];
  num = Math.abs(Number(num));
  if (isNaN(num)) return "CERO PESOS 00/100 M.N.";
  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  const convertir = (n) => {
    if (n === 0) return "CERO";
    if (n < 20) return unidades[n];
    if (n < 100) return decenas[Math.floor(n / 10)] + (n % 10 ? " Y " + unidades[n % 10] : "");
    if (n < 1000) return (n === 100 ? "CIEN" : centenas[Math.floor(n / 100)] + (n % 100 ? " " + convertir(n % 100) : ""));
    if (n < 1000000) return (Math.floor(n / 1000) === 1 ? "MIL" : convertir(Math.floor(n / 1000)) + " MIL") + (n % 1000 ? " " + convertir(n % 1000) : "");
    return n.toString();
  };
  return convertir(entero) + " PESOS " + String(centavos).padStart(2, "0") + "/100 M.N.";
}

// ─── PROFESSIONAL PDF RECEIPT ─────────────────────────────────────────────────
async function generateReciboPDF(hon, client, profile) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const ML = 15, MR = 15;
  const CW = W - ML - MR; // content width = 180

  // ── Load logo ──
  let logoData = null, logoExt = "PNG";
  if (profile?.logo_url) {
    try {
      const res = await fetch(profile.logo_url);
      const blob = await res.blob();
      logoData = await new Promise(resolve => {
        const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob);
      });
      const ext = profile.logo_url.split(".").pop().split("?")[0].toUpperCase();
      logoExt = ext === "PNG" ? "PNG" : "JPEG";
    } catch {}
  }

  // ════════════════════════════════════════════
  // SECTION 1 — HEADER (logo + despacho + datos)
  // ════════════════════════════════════════════
  const headerH = 32;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, headerH + 10, "F");

  // Logo box
  const logoW = 36, logoH = 28, logoY = 8;
  if (logoData) {
    doc.addImage(logoData, logoExt, ML, logoY, logoW, logoH, undefined, "FAST");
  } else {
    doc.setFillColor(27, 58, 92);
    doc.roundedRect(ML, logoY, logoW, logoH, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    const ini = (profile?.despacho || "CD").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    doc.text(ini, ML + logoW / 2, logoY + logoH / 2 + 2, { align: "center" });
  }

  // Despacho name + tagline
  const nameX = ML + logoW + 6;
  doc.setTextColor(27, 58, 92);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(profile?.despacho || "Despacho Contable", nameX, logoY + 10);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Servicios Contables y Fiscales", nameX, logoY + 16);

  // Right column: contact info
  const contactX = ML + CW * 0.55;
  const contactW = W - MR - contactX;
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const contacts = [
    profile?.email ? ["Correo:", profile.email] : null,
  ].filter(Boolean);
  contacts.forEach(([label, val], idx) => {
    doc.setFont("helvetica", "bold"); doc.text(label, contactX, logoY + 10 + idx * 6);
    doc.setFont("helvetica", "normal"); doc.text(val, contactX + 18, logoY + 10 + idx * 6);
  });

  // Right column: client billing info
  const billingX = W - MR - 65;
  doc.setFillColor(245, 247, 250);
  doc.rect(billingX, logoY, 65, logoH, "F");
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.3);
  doc.rect(billingX, logoY, 65, logoH, "S");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(27, 58, 92);
  doc.text(client?.name || "—", billingX + 3, logoY + 7, { maxWidth: 59 });
  doc.setFont("helvetica", "normal"); doc.setTextColor(70, 70, 70);
  if (client?.rfc) doc.text("RFC: " + client.rfc, billingX + 3, logoY + 13);
  if (client?.email) { const emailLines = doc.splitTextToSize(client.email, 59); doc.text(emailLines, billingX + 3, logoY + 18); }
  if (client?.phone) doc.text(client.phone, billingX + 3, logoY + 24);

  // Separator line under header
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.5);
  doc.line(ML, headerH + 10, W - MR, headerH + 10);

  // ════════════════════════════════════════════
  // SECTION 2 — TITLE
  // ════════════════════════════════════════════
  const titleY = headerH + 20;
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 58, 92);
  doc.text("RECIBO DE PAGO", W / 2, titleY, { align: "center" });

  // ════════════════════════════════════════════
  // SECTION 3 — RECIBO # / FECHA table (right aligned)
  // ════════════════════════════════════════════
  const metaY = titleY + 6;
  const metaW = 80, metaX = W - MR - metaW;
  // Header row
  doc.setFillColor(27, 58, 92);
  doc.rect(metaX, metaY, metaW / 2, 8, "F");
  doc.rect(metaX + metaW / 2, metaY, metaW / 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("RECIBO #", metaX + metaW / 4, metaY + 5.5, { align: "center" });
  doc.text("FECHA", metaX + metaW * 3 / 4, metaY + 5.5, { align: "center" });
  // Data row
  doc.setFillColor(240, 244, 250);
  doc.rect(metaX, metaY + 8, metaW / 2, 8, "F");
  doc.rect(metaX + metaW / 2, metaY + 8, metaW / 2, 8, "F");
  doc.setDrawColor(200, 210, 225); doc.setLineWidth(0.3);
  doc.rect(metaX, metaY + 8, metaW, 8, "S");
  doc.setTextColor(30, 30, 30); doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(String(hon.id).padStart(4, "0"), metaX + metaW / 4, metaY + 14, { align: "center" });
  doc.text(hon.fecha_emision || fmt(today), metaX + metaW * 3 / 4, metaY + 14, { align: "center" });

  // ════════════════════════════════════════════
  // SECTION 4 — FIELDS
  // ════════════════════════════════════════════
  const fieldsY = metaY + 26;
  const labelW = 30;
  const fieldH = 10;

  const drawField = (label, value, y, fullWidth = false, valueStyle = "normal") => {
    doc.setDrawColor(180, 190, 205);
    doc.setLineWidth(0.3);
    // Label
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
    doc.text(label + ":", ML, y + 6.5);
    // Underline for value
    const valX = ML + labelW;
    const valW = fullWidth ? CW - labelW : CW - labelW - 50;
    doc.line(valX, y + fieldH, valX + valW, y + fieldH);
    // Value
    doc.setFont("helvetica", valueStyle); doc.setTextColor(30, 30, 30);
    if (valueStyle === "bold") doc.setFontSize(9.5);
    else doc.setFontSize(9);
    const lines = doc.splitTextToSize(String(value || ""), valW - 2);
    doc.text(lines[0] || "", valX + 1, y + 6.5);
    return y + fieldH + 4;
  };

  // Row 1: Recibí de + Cantidad (side by side)
  const row1Y = fieldsY;
  // "Recibí de" — left 2/3
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text("Recibí de:", ML, row1Y + 6.5);
  const recibiValX = ML + labelW;
  const recibiValW = CW * 0.55 - labelW;
  doc.setDrawColor(180, 190, 205); doc.setLineWidth(0.3);
  doc.line(recibiValX, row1Y + fieldH, recibiValX + recibiValW, row1Y + fieldH);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  doc.text(client?.name || "—", recibiValX + 1, row1Y + 6.5, { maxWidth: recibiValW - 2 });

  // "Cantidad" — right 1/3
  const cantLabelX = ML + CW * 0.6;
  const cantBoxX = cantLabelX + 22;
  const cantBoxW = W - MR - cantBoxX;
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text("Cantidad:", cantLabelX, row1Y + 6.5);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 190, 205); doc.setLineWidth(0.4);
  doc.rect(cantBoxX, row1Y, cantBoxW, fieldH, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(27, 58, 92);
  doc.text(fmtMoney(hon.monto), cantBoxX + cantBoxW / 2, row1Y + 6.5, { align: "center" });

  // Row 2: Cantidad en letras
  let curY = row1Y + fieldH + 6;
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text("Cantidad:", ML, curY + 6.5);
  doc.setDrawColor(180, 190, 205); doc.setLineWidth(0.3);
  doc.line(ML + labelW, curY + fieldH, ML + CW, curY + fieldH);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30);
  doc.text(numeroALetras(hon.monto), ML + labelW + 1, curY + 6.5, { maxWidth: CW - labelW - 2 });
  curY += fieldH + 6;

  // Row 3: Concepto
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text("Concepto:", ML, curY + 6.5);
  doc.setDrawColor(180, 190, 205); doc.setLineWidth(0.3);
  doc.line(ML + labelW, curY + fieldH, ML + CW, curY + fieldH);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  const conceptLines = doc.splitTextToSize(hon.concepto || "—", CW - labelW - 2);
  doc.text(conceptLines[0], ML + labelW + 1, curY + 6.5);
  curY += fieldH + 6;

  // Row 4: Período
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text("Período:", ML, curY + 6.5);
  doc.setDrawColor(180, 190, 205); doc.setLineWidth(0.3);
  const perValW = CW * 0.4 - labelW;
  doc.line(ML + labelW, curY + fieldH, ML + labelW + perValW, curY + fieldH);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  doc.text(hon.periodo || "—", ML + labelW + 1, curY + 6.5);

  // Vencimiento on same row
  const vencX = ML + CW * 0.5;
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text("Vencimiento:", vencX, curY + 6.5);
  const vencValX = vencX + 28;
  doc.setDrawColor(180, 190, 205); doc.setLineWidth(0.3);
  doc.line(vencValX, curY + fieldH, W - MR, curY + fieldH);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  doc.text(hon.fecha_vencimiento || "—", vencValX + 1, curY + 6.5);
  curY += fieldH + 8;

  // Row 5: Forma de pago
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text("Forma de pago:", ML, curY + 5);
  const formaX = ML + labelW + 6;
  const formas = ["Efectivo", "Transferencia", "Cheque", "Tarjeta"];
  let fx = formaX;
  formas.forEach(f => {
    doc.setDrawColor(150, 160, 175); doc.setLineWidth(0.3);
    doc.rect(fx, curY, 4, 4, "S");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(40, 40, 40);
    doc.text(f, fx + 6, curY + 3.5);
    fx += f.length * 2.2 + 12;
  });
  curY += 14;

  // ════════════════════════════════════════════
  // SECTION 5 — NOTES (if any)
  // ════════════════════════════════════════════
  if (hon.notas) {
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
    doc.text("Notas:", ML, curY + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60);
    const notaLines = doc.splitTextToSize(hon.notas, CW - labelW - 2);
    doc.text(notaLines, ML + labelW, curY + 5);
    curY += notaLines.length * 5 + 8;
  }

  // ════════════════════════════════════════════
  // SECTION 6 — SIGNATURE + TOTALS
  // ════════════════════════════════════════════
  const sigY = curY + 10;

  // Signature block (left)
  doc.setDrawColor(130, 140, 155); doc.setLineWidth(0.5);
  doc.line(ML, sigY, ML + 70, sigY);
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text("Recibido por", ML, sigY + 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  doc.text(profile?.name || "", ML, sigY + 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text(profile?.despacho || "", ML, sigY + 16);

  // Summary box (right)
  const sumX = W - MR - 75;
  const sumY = sigY - 8;
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(200, 210, 225); doc.setLineWidth(0.3);
  doc.rect(sumX, sumY, 75, 36, "FD");

  const sumRows = [
    ["Total:", fmtMoney(hon.monto), [50, 50, 50]],
    ["Pagado:", fmtMoney(hon.monto_pagado || 0), [29, 158, 117]],
  ];
  const saldo = Number(hon.monto) - Number(hon.monto_pagado || 0);
  sumRows.forEach(([label, val, color], idx) => {
    const ry = sumY + 8 + idx * 9;
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text(label, sumX + 5, ry);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...color);
    doc.text(val, sumX + 70, ry, { align: "right" });
  });
  // Divider
  doc.setDrawColor(200, 210, 225); doc.setLineWidth(0.3);
  doc.line(sumX + 5, sumY + 26, sumX + 70, sumY + 26);
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.setTextColor(saldo <= 0 ? 29 : 163, saldo <= 0 ? 158 : 45, saldo <= 0 ? 117 : 45);
  doc.text("Saldo:", sumX + 5, sumY + 33);
  doc.text(fmtMoney(saldo), sumX + 70, sumY + 33, { align: "right" });

  // ════════════════════════════════════════════
  // SECTION 7 — DASHED SEPARATOR
  // ════════════════════════════════════════════
  const dashY = sigY + 28;
  doc.setDrawColor(150, 160, 175); doc.setLineWidth(0.4);
  doc.setLineDash([2, 2], 0);
  doc.line(ML, dashY, W - MR, dashY);
  doc.setLineDash([], 0);

  // ════════════════════════════════════════════
  // SECTION 8 — STATUS BADGE + FOOTER
  // ════════════════════════════════════════════
  const statusColors = { pagado: [29, 158, 117], pendiente: [133, 79, 11], parcial: [24, 95, 165], vencido: [163, 45, 45] };
  const sc = statusColors[hon.status] || statusColors.pendiente;
  const badgeY = dashY + 6;
  doc.setFillColor(...sc);
  doc.roundedRect(ML, badgeY, 36, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.text((HON_STATUS[hon.status]?.label || "PENDIENTE").toUpperCase(), ML + 18, badgeY + 4.8, { align: "center" });

  doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(130, 130, 130);
  doc.text(`${profile?.despacho || "Despacho Contable"} · Generado con ContaDesk · ${new Date().toLocaleDateString("es-MX")}`, W / 2, badgeY + 4.8, { align: "center" });

  doc.save(`recibo_${String(hon.id).padStart(4, "0")}_${(client?.name || "cliente").replace(/\s+/g, "_")}.pdf`);
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────
function exportClientsPDF(clients, despacho) {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.setTextColor(27, 58, 92); doc.text("Lista de Clientes", 14, 20);
  doc.setFontSize(10); doc.setTextColor(107, 107, 103); doc.text(`${despacho || "Despacho Contable"} · ${new Date().toLocaleDateString("es-MX")}`, 14, 28);
  autoTable(doc, { startY: 35, head: [["Nombre","RFC","Correo","Teléfono","Tipo","Estado"]], body: clients.map(c => [c.name, c.rfc||"—", c.email, c.phone||"—", c.type==="fisica"?"Persona Física":"Persona Moral", c.status==="activo"?"Activo":"Inactivo"]), headStyles:{fillColor:[27,58,92],textColor:255,fontSize:10}, bodyStyles:{fontSize:9}, alternateRowStyles:{fillColor:[247,246,242]} });
  doc.save(`clientes_${fmt(today)}.pdf`);
}
function exportClientsExcel(clients) {
  const ws = XLSX.utils.json_to_sheet(clients.map(c => ({Nombre:c.name,RFC:c.rfc||"",Correo:c.email,Teléfono:c.phone||"",Tipo:c.type==="fisica"?"Persona Física":"Persona Moral",Estado:c.status==="activo"?"Activo":"Inactivo"})));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Clientes"); XLSX.writeFile(wb, `clientes_${fmt(today)}.xlsx`);
}
function exportProcessesPDF(processes, clients, despacho, month, year) {
  const cm = Object.fromEntries(clients.map(c=>[c.id,c]));
  const filtered = processes.filter(p=>{ const d=new Date(p.due_date); return d.getMonth()===month && d.getFullYear()===year; });
  const doc = new jsPDF();
  doc.setFontSize(18); doc.setTextColor(27,58,92); doc.text(`Procesos — ${MONTHS[month]} ${year}`, 14, 20);
  doc.setFontSize(10); doc.setTextColor(107,107,103); doc.text(`${despacho||"Despacho Contable"} · ${new Date().toLocaleDateString("es-MX")}`, 14, 28);
  autoTable(doc, { startY:35, head:[["Proceso","Cliente","Tipo","Vencimiento","Estado"]], body:filtered.map(p=>[p.title,cm[p.client_id]?.name||"—",PROCESS_TYPES[p.type],p.due_date,p.status]), headStyles:{fillColor:[27,58,92],textColor:255,fontSize:10}, bodyStyles:{fontSize:9}, alternateRowStyles:{fillColor:[247,246,242]} });
  doc.save(`procesos_${MONTHS[month]}_${year}.pdf`);
}
function exportProcessesExcel(processes, clients, month, year) {
  const cm = Object.fromEntries(clients.map(c=>[c.id,c]));
  const filtered = processes.filter(p=>{ const d=new Date(p.due_date); return d.getMonth()===month && d.getFullYear()===year; });
  const ws = XLSX.utils.json_to_sheet(filtered.map(p=>({Proceso:p.title,Cliente:cm[p.client_id]?.name||"—",Tipo:PROCESS_TYPES[p.type],Inicio:p.start_date,Vencimiento:p.due_date,Estado:p.status,Notas:p.notes||""})));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Procesos"); XLSX.writeFile(wb, `procesos_${MONTHS[month]}_${year}.xlsx`);
}

// ─── ICON ─────────────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color = "currentColor" }) {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    clients: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    processes: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    reminders: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    history: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.51"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    chevronLeft: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>,
    fileText: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    table: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
    spinner: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    money: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    receipt: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>,
    upload: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  };
  return icons[name] || null;
}

function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:200 }}>
      <div style={{ animation:"spin 1s linear infinite" }}><Icon name="spinner" size={32} color="#1B3A5C" /></div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Modal({ title, onClose, children, maxWidth = 540 }) {
  const { C } = useTheme();
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div style={{ background:C.cardBg, borderRadius:12, width:"100%", maxWidth, maxHeight:"90vh", overflow:"auto", boxShadow:"0 8px 40px rgba(0,0,0,0.3)", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 16px", borderBottom:`1px solid ${C.border}` }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:600, color:C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.gray }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ padding:"20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children, required }) {
  const { C } = useTheme();
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:500, color:C.textMuted, marginBottom:6 }}>{label}{required && <span style={{ color:C.danger }}> *</span>}</label>
      {children}
    </div>
  );
}

function useInputStyle() { const { C } = useTheme(); return { width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, color:C.text, background:C.cardBg, outline:"none", boxSizing:"border-box" }; }
function useBtnPrimary() { const { C } = useTheme(); return { background:C.primary, color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:14, fontWeight:500, cursor:"pointer" }; }
function useBtnSecondary() { const { C } = useTheme(); return { background:"none", color:C.gray, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 20px", fontSize:14, cursor:"pointer" }; }

function Badge({ status }) {
  const { dark } = useTheme();
  const c = dark ? { pendiente:{label:"Pendiente",bg:"#3D2A0F",color:"#FFB74D"}, en_proceso:{label:"En Proceso",bg:"#0D2A3D",color:"#64B5F6"}, completado:{label:"Completado",bg:"#0F3D2E",color:"#81C784"} } : { pendiente:{label:"Pendiente",bg:"#FAEEDA",color:"#854F0B"}, en_proceso:{label:"En Proceso",bg:"#E6F1FB",color:"#185FA5"}, completado:{label:"Completado",bg:"#E1F5EE",color:"#0F6E56"} };
  const cfg = c[status] || c.pendiente;
  return <span style={{ background:cfg.bg, color:cfg.color, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:500, whiteSpace:"nowrap" }}>{cfg.label}</span>;
}

function HonBadge({ status }) {
  const { dark } = useTheme();
  const s = HON_STATUS[status] || HON_STATUS.pendiente;
  return <span style={{ background:dark?s.bgDark:s.bg, color:dark?s.colorDark:s.color, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:500, whiteSpace:"nowrap" }}>{s.label}</span>;
}

function ProfileModal({ user, profile, onClose, onUpdate }) {
  const { C } = useTheme();
  const inputStyle = useInputStyle();
  const btnPrimary = useBtnPrimary();
  const btnSecondary = useBtnSecondary();
  const [form, setForm] = useState({ name:profile?.name||"", despacho:profile?.despacho||"", email:user?.email||"", newPassword:"", confirmPassword:"" });
  const [saving, setSaving] = useState(false), [msg, setMsg] = useState(""), [error, setError] = useState(""), [showPass, setShowPass] = useState(false);
  const [logoPreview, setLogoPreview] = useState(profile?.logo_url||null), [logoFile, setLogoFile] = useState(null), [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef();
  const handleLogoChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2*1024*1024) { setError("El logo no debe pesar más de 2MB."); return; }
    setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); setError("");
  };
  const uploadLogo = async () => {
    if (!logoFile) return profile?.logo_url||null;
    setUploadingLogo(true);
    const ext = logoFile.name.split(".").pop();
    const path = `logos/${user.id}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, logoFile, { upsert:true, contentType:logoFile.type });
    if (upErr) { setError("Error al subir logo: "+upErr.message); setUploadingLogo(false); return profile?.logo_url||null; }
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    setUploadingLogo(false);
    return data.publicUrl + `?t=${Date.now()}`;
  };
  const save = async () => {
    setError(""); setMsg("");
    if (!form.name || !form.despacho) { setError("Nombre y despacho son obligatorios."); return; }
    if (form.newPassword && form.newPassword !== form.confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    if (form.newPassword && form.newPassword.length < 6) { setError("Mínimo 6 caracteres."); return; }
    setSaving(true);
    try {
      const logo_url = await uploadLogo();
      await supabase.from("profiles").update({ name:form.name, despacho:form.despacho, logo_url }).eq("id", user.id);
      if (form.email !== user.email) await supabase.auth.updateUser({ email:form.email });
      if (form.newPassword) await supabase.auth.updateUser({ password:form.newPassword });
      onUpdate({ ...profile, name:form.name, despacho:form.despacho, logo_url });
      setMsg("Perfil actualizado correctamente.");
      setForm(f => ({ ...f, newPassword:"", confirmPassword:"" }));
    } catch (e) { setError(e.message); }
    setSaving(false);
  };
  return (
    <Modal title="Mi perfil" onClose={onClose} maxWidth={560}>
      <div style={{ background:C.surface, borderRadius:12, padding:20, marginBottom:20, display:"flex", alignItems:"center", gap:20 }}>
        <div style={{ flexShrink:0 }}>
          {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width:72, height:72, borderRadius:10, objectFit:"contain", border:`1px solid ${C.border}`, background:"#fff", padding:4 }} />
            : <div style={{ width:72, height:72, borderRadius:10, background:C.primary+"25", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, color:C.primary }}>{(profile?.despacho||"D").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}</div>}
        </div>
        <div style={{ flex:1 }}>
          <p style={{ margin:"0 0 4px", fontSize:15, fontWeight:600, color:C.text }}>Logo del despacho</p>
          <p style={{ margin:"0 0 10px", fontSize:12, color:C.textMuted }}>PNG o JPG · Máx. 2MB · Aparece en los recibos PDF</p>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => fileRef.current?.click()} style={{ ...btnSecondary, padding:"7px 14px", fontSize:13, display:"flex", alignItems:"center", gap:6 }}><Icon name="upload" size={14} color={C.gray} />{logoPreview?"Cambiar logo":"Subir logo"}</button>
            {logoPreview && <button onClick={() => { setLogoPreview(null); setLogoFile(null); }} style={{ ...btnSecondary, padding:"7px 14px", fontSize:13, color:C.danger, borderColor:C.danger }}>Quitar</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display:"none" }} onChange={handleLogoChange} />
        </div>
      </div>
      <FormField label="Nombre completo" required><input style={inputStyle} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></FormField>
      <FormField label="Nombre del despacho" required><input style={inputStyle} value={form.despacho} onChange={e=>setForm(f=>({...f,despacho:e.target.value}))} /></FormField>
      <FormField label="Correo electrónico"><input style={inputStyle} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></FormField>
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16, marginTop:4 }}>
        <p style={{ fontSize:13, fontWeight:600, color:C.textMuted, margin:"0 0 12px" }}>Cambiar contraseña (opcional)</p>
        <FormField label="Nueva contraseña">
          <div style={{ position:"relative" }}>
            <input style={{ ...inputStyle, paddingRight:40 }} type={showPass?"text":"password"} value={form.newPassword} onChange={e=>setForm(f=>({...f,newPassword:e.target.value}))} placeholder="Mínimo 6 caracteres" />
            <button onClick={() => setShowPass(s=>!s)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.textMuted }}><Icon name={showPass?"eyeOff":"eye"} size={16} /></button>
          </div>
        </FormField>
        <FormField label="Confirmar contraseña"><input style={inputStyle} type={showPass?"text":"password"} value={form.confirmPassword} onChange={e=>setForm(f=>({...f,confirmPassword:e.target.value}))} /></FormField>
      </div>
      {error && <p style={{ color:C.danger, fontSize:13, padding:"10px 12px", background:C.dangerLight, borderRadius:8, margin:"0 0 12px" }}>{error}</p>}
      {msg && <p style={{ color:C.accent, fontSize:13, padding:"10px 12px", background:C.accentLight, borderRadius:8, margin:"0 0 12px" }}>{msg}</p>}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={save} disabled={saving||uploadingLogo} style={{ ...btnPrimary, opacity:(saving||uploadingLogo)?0.7:1 }}>{saving?"Guardando...":uploadingLogo?"Subiendo...":"Guardar cambios"}</button>
      </div>
    </Modal>
  );
}

function GlobalSearch({ clients, processes, setActive, onClose }) {
  const { C } = useTheme();
  const inputStyle = useInputStyle();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const t = q.toLowerCase();
    const mc = clients.filter(c=>c.name.toLowerCase().includes(t)||c.rfc?.toLowerCase().includes(t)||c.email?.toLowerCase().includes(t)).map(c=>({type:"client",label:c.name,sub:c.rfc||c.email}));
    const mp = processes.filter(p=>p.title.toLowerCase().includes(t)||p.notes?.toLowerCase().includes(t)).map(p=>({type:"process",label:p.title,sub:PROCESS_TYPES[p.type]+" · "+p.due_date}));
    return [...mc.slice(0,4),...mp.slice(0,4)];
  }, [q,clients,processes]);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:2000, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"80px 20px 20px" }}>
      <div style={{ background:C.cardBg, borderRadius:14, width:"100%", maxWidth:560, boxShadow:"0 12px 48px rgba(0,0,0,0.35)", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
          <Icon name="search" size={18} color={C.textMuted} />
          <input autoFocus style={{ ...inputStyle, border:"none", padding:0, fontSize:16, flex:1 }} placeholder="Buscar clientes, procesos, RFC..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Escape"&&onClose()} />
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray }}><Icon name="x" size={18} /></button>
        </div>
        {q ? (
          <div style={{ maxHeight:360, overflow:"auto" }}>
            {results.length===0 ? <p style={{ padding:"24px", textAlign:"center", color:C.textMuted, fontSize:14 }}>Sin resultados para "{q}"</p>
              : results.map((r,i) => (
                <button key={i} onClick={()=>{ setActive(r.type==="client"?"clients":"processes"); onClose(); }} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 20px", background:"none", border:"none", cursor:"pointer", borderBottom:i<results.length-1?`1px solid ${C.border}`:"none", textAlign:"left" }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:C.primary+"20", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={r.type==="client"?"user":"processes"} size={16} color={C.primary} /></div>
                  <div style={{ flex:1, minWidth:0 }}><p style={{ margin:"0 0 2px", fontSize:14, fontWeight:500, color:C.text }}>{r.label}</p><p style={{ margin:0, fontSize:12, color:C.textMuted }}>{r.sub}</p></div>
                  <span style={{ fontSize:11, background:C.surface, color:C.textMuted, padding:"2px 8px", borderRadius:6, border:`1px solid ${C.border}` }}>{r.type==="client"?"Cliente":"Proceso"}</span>
                </button>
              ))}
          </div>
        ) : <p style={{ padding:"20px 24px", fontSize:13, color:C.textMuted }}>Escribe para buscar · Esc para cerrar</p>}
      </div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const C = getColors(false);
  const inp = { width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, color:C.text, background:C.white, outline:"none", boxSizing:"border-box" };
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email:"", password:"", name:"", despacho:"" });
  const [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    setError("");
    if (!form.email||!form.password) { setError("Correo y contraseña son obligatorios."); return; }
    if (mode==="register"&&(!form.name||!form.despacho)) { setError("Todos los campos son obligatorios."); return; }
    setLoading(true);
    try {
      if (mode==="login") {
        const { data, error:e } = await supabase.auth.signInWithPassword({ email:form.email, password:form.password });
        if (e) throw e;
        const { data:profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
        onAuth(data.user, profile);
      } else {
        const { data, error:e } = await supabase.auth.signUp({ email:form.email, password:form.password });
        if (e) throw e;
        await supabase.from("profiles").insert({ id:data.user.id, name:form.name, despacho:form.despacho, email:form.email });
        onAuth(data.user, { name:form.name, despacho:form.despacho, email:form.email });
      }
    } catch (e) { setError(e.message||"Ocurrió un error."); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI', system-ui, sans-serif", padding:20 }}>
      <div style={{ display:"flex", width:"100%", maxWidth:900, background:C.white, borderRadius:16, overflow:"hidden", boxShadow:"0 4px 40px rgba(0,0,0,0.1)" }}>
        <div style={{ flex:1, background:C.primary, padding:"60px 48px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <div style={{ width:48, height:48, background:C.accent, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:32 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <h1 style={{ color:"#fff", fontSize:28, fontWeight:700, margin:"0 0 12px", fontFamily:"'Georgia', serif" }}>ContaDesk</h1>
          <p style={{ color:"rgba(255,255,255,0.65)", fontSize:15, lineHeight:1.6, margin:"0 0 40px" }}>Plataforma profesional para gestión contable.</p>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:32 }}>
            {["Gestión de clientes y RFC","Control de declaraciones","Módulo de honorarios","Recibos PDF profesionales","Calendario y exportación"].map(f => (
              <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:18, height:18, borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="check" size={10} color="#fff" /></div>
                <span style={{ color:"rgba(255,255,255,0.8)", fontSize:14 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex:1, padding:"60px 48px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <h2 style={{ fontSize:24, fontWeight:600, color:C.text, margin:"0 0 8px", fontFamily:"'Georgia', serif" }}>{mode==="login"?"Iniciar sesión":"Crear cuenta"}</h2>
          <p style={{ color:C.textMuted, fontSize:14, margin:"0 0 32px" }}>{mode==="login"?"Accede a tu panel de control":"Registra tu despacho contable"}</p>
          {mode==="register" && <>
            <div style={{ marginBottom:16 }}><label style={{ display:"block", fontSize:13, fontWeight:500, color:C.textMuted, marginBottom:6 }}>Nombre completo *</label><input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Lic. María González" /></div>
            <div style={{ marginBottom:16 }}><label style={{ display:"block", fontSize:13, fontWeight:500, color:C.textMuted, marginBottom:6 }}>Nombre del despacho *</label><input style={inp} value={form.despacho} onChange={e=>setForm(f=>({...f,despacho:e.target.value}))} placeholder="Despacho Contable González" /></div>
          </>}
          <div style={{ marginBottom:16 }}><label style={{ display:"block", fontSize:13, fontWeight:500, color:C.textMuted, marginBottom:6 }}>Correo electrónico *</label><input style={inp} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="correo@ejemplo.mx" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></div>
          <div style={{ marginBottom:16 }}><label style={{ display:"block", fontSize:13, fontWeight:500, color:C.textMuted, marginBottom:6 }}>Contraseña *</label><input style={inp} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Mínimo 6 caracteres" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></div>
          {error && <p style={{ color:C.danger, fontSize:13, margin:"-8px 0 16px", background:C.dangerLight, padding:"10px 12px", borderRadius:8 }}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading} style={{ background:C.primary, color:"#fff", border:"none", borderRadius:8, padding:"13px 20px", fontSize:15, fontWeight:500, cursor:"pointer", width:"100%", opacity:loading?0.7:1 }}>{loading?"Procesando...":mode==="login"?"Entrar":"Crear cuenta"}</button>
          <p style={{ textAlign:"center", fontSize:14, color:C.textMuted, marginTop:20 }}>
            {mode==="login"?"¿No tienes cuenta?":"¿Ya tienes cuenta?"}{" "}
            <button onClick={()=>{ setMode(mode==="login"?"register":"login"); setError(""); }} style={{ background:"none", border:"none", color:C.primary, cursor:"pointer", fontWeight:600, fontSize:14 }}>{mode==="login"?"Regístrate":"Inicia sesión"}</button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive, profile, onLogout, dark, setDark, onOpenProfile, onOpenSearch }) {
  const nav = [
    { id:"dashboard", label:"Dashboard", icon:"dashboard" },
    { id:"clients", label:"Clientes", icon:"clients" },
    { id:"processes", label:"Procesos", icon:"processes" },
    { id:"honorarios", label:"Honorarios", icon:"money" },
    { id:"calendar", label:"Calendario", icon:"calendar" },
    { id:"reminders", label:"Recordatorios", icon:"reminders" },
    { id:"reports", label:"Reportes", icon:"download" },
    { id:"history", label:"Historial", icon:"history" },
  ];
  const bg = dark ? "#0F1923" : "#1B3A5C";
  return (
    <div style={{ width:240, background:bg, display:"flex", flexDirection:"column", minHeight:"100vh", flexShrink:0 }}>
      <div style={{ padding:"28px 24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          {profile?.logo_url
            ? <img src={profile.logo_url} alt="Logo" style={{ width:36, height:36, borderRadius:8, objectFit:"contain", background:"#fff", padding:3 }} />
            : <div style={{ width:36, height:36, background:"#1D9E75", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>}
          <span style={{ color:"#fff", fontWeight:700, fontSize:18, fontFamily:"'Georgia', serif" }}>ContaDesk</span>
        </div>
        <button onClick={onOpenSearch} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.6)", fontSize:13, cursor:"pointer", marginBottom:4 }}>
          <Icon name="search" size={14} color="rgba(255,255,255,0.5)" /> Buscar...
          <span style={{ marginLeft:"auto", fontSize:11, background:"rgba(255,255,255,0.1)", padding:"1px 6px", borderRadius:4 }}>⌘K</span>
        </button>
      </div>
      <div style={{ padding:"0 12px", flex:1 }}>
        {nav.map(item => (
          <button key={item.id} onClick={()=>setActive(item.id)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 12px", marginBottom:2, borderRadius:8, border:"none", cursor:"pointer", background:active===item.id?"rgba(255,255,255,0.12)":"none", color:active===item.id?"#fff":"rgba(255,255,255,0.6)", fontSize:14, fontWeight:active===item.id?500:400, textAlign:"left" }}>
            <Icon name={item.icon} size={17} color={active===item.id?"#fff":"rgba(255,255,255,0.6)"} />{item.label}
          </button>
        ))}
      </div>
      <div style={{ padding:"12px 12px 20px", borderTop:"1px solid rgba(255,255,255,0.1)" }}>
        <button onClick={onOpenProfile} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer", background:"none", marginBottom:4 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:"#fff", flexShrink:0 }}>{(profile?.name||"U").split(" ").slice(0,2).map(n=>n[0]).join("")}</div>
          <div style={{ textAlign:"left", flex:1, minWidth:0 }}>
            <p style={{ color:"#fff", fontSize:13, fontWeight:500, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{profile?.name}</p>
            <p style={{ color:"rgba(255,255,255,0.5)", fontSize:11, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{profile?.despacho}</p>
          </div>
          <Icon name="settings" size={14} color="rgba(255,255,255,0.4)" />
        </button>
        <button onClick={()=>setDark(d=>!d)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"8px 12px", borderRadius:8, border:"none", cursor:"pointer", background:"none", color:"rgba(255,255,255,0.5)", fontSize:13, marginBottom:2 }}>
          <Icon name={dark?"sun":"moon"} size={16} color="rgba(255,255,255,0.5)" />{dark?"Modo claro":"Modo oscuro"}
        </button>
        <button onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"8px 12px", borderRadius:8, border:"none", cursor:"pointer", background:"none", color:"rgba(255,255,255,0.5)", fontSize:13 }}>
          <Icon name="logout" size={16} color="rgba(255,255,255,0.5)" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  const { C } = useTheme();
  const col = color||C.primary;
  return (
    <div style={{ background:C.cardBg, borderRadius:12, padding:"20px 22px", border:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:10, background:col+"25", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={icon} size={20} color={col} /></div>
      <div><p style={{ margin:"0 0 4px", fontSize:13, color:C.textMuted }}>{label}</p><p style={{ margin:"0 0 2px", fontSize:26, fontWeight:700, color:C.text, lineHeight:1 }}>{value}</p>{sub&&<p style={{ margin:0, fontSize:12, color:C.textMuted }}>{sub}</p>}</div>
    </div>
  );
}

function DashboardView({ clients, processes, honorarios, setActive }) {
  const { C } = useTheme();
  const now = new Date();
  const activeClients = clients.filter(c=>c.status==="activo").length;
  const overdue = processes.filter(p=>p.status!=="completado"&&new Date(p.due_date)<now);
  const dueSoon = processes.filter(p=>p.status!=="completado"&&new Date(p.due_date)>=now&&new Date(p.due_date)<=new Date(now.getTime()+7*86400000));
  const inProcess = processes.filter(p=>p.status==="en_proceso").length;
  const pendingPayments = honorarios.filter(h=>h.status!=="pagado").reduce((s,h)=>s+Number(h.monto)-Number(h.monto_pagado||0),0);
  const clientMap = Object.fromEntries(clients.map(c=>[c.id,c]));
  const daysLeft = d => Math.ceil((new Date(d)-now)/86400000);
  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:600, color:C.text, margin:"0 0 24px", fontFamily:"'Georgia', serif" }}>Dashboard</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))", gap:14, marginBottom:28 }}>
        <StatCard label="Clientes activos" value={activeClients} icon="clients" color={C.primary} />
        <StatCard label="En proceso" value={inProcess} icon="processes" color="#2D5F8A" />
        <StatCard label="Vencen pronto" value={dueSoon.length} icon="clock" color={C.warning} sub="próximos 7 días" />
        <StatCard label="Atrasados" value={overdue.length} icon="alert" color={C.danger} />
        <StatCard label="Por cobrar" value={fmtMoney(pendingPayments)} icon="money" color={C.accent} />
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:28, flexWrap:"wrap" }}>
        <button onClick={()=>setActive("processes")} style={{ background:C.primary, color:"#fff", border:"none", borderRadius:8, padding:"9px 16px", fontSize:13, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}><Icon name="plus" size={14} color="#fff" /> Nueva declaración</button>
        <button onClick={()=>setActive("honorarios")} style={{ background:C.accent+"20", color:C.accent, border:`1px solid ${C.accent}`, borderRadius:8, padding:"9px 16px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}><Icon name="money" size={14} color={C.accent} /> Nuevo cobro</button>
        <button onClick={()=>setActive("calendar")} style={{ background:"none", color:C.gray, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 16px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}><Icon name="calendar" size={14} color={C.gray} /> Ver calendario</button>
        <button onClick={()=>setActive("reports")} style={{ background:"none", color:C.gray, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 16px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}><Icon name="download" size={14} color={C.gray} /> Exportar reporte</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}><Icon name="alert" size={16} color={C.danger} /><h3 style={{ margin:0, fontSize:15, fontWeight:600, color:C.text }}>Procesos atrasados</h3></div>
          {overdue.length===0 ? <p style={{ padding:"20px", color:C.textMuted, fontSize:14, textAlign:"center" }}>Sin atrasos</p>
            : overdue.slice(0,4).map(p=>(
              <div key={p.id} style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><p style={{ margin:"0 0 2px", fontSize:14, fontWeight:500, color:C.text }}>{p.title}</p><p style={{ margin:0, fontSize:12, color:C.textMuted }}>{clientMap[p.client_id]?.name}</p></div>
                <span style={{ background:C.dangerLight, color:C.danger, fontSize:12, padding:"3px 8px", borderRadius:6 }}>{Math.abs(daysLeft(p.due_date))}d atraso</span>
              </div>
            ))}
        </div>
        <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}><Icon name="money" size={16} color={C.accent} /><h3 style={{ margin:0, fontSize:15, fontWeight:600, color:C.text }}>Cobros pendientes</h3></div>
          {honorarios.filter(h=>h.status!=="pagado").length===0 ? <p style={{ padding:"20px", color:C.textMuted, fontSize:14, textAlign:"center" }}>Sin cobros pendientes</p>
            : honorarios.filter(h=>h.status!=="pagado").slice(0,4).map(h=>(
              <div key={h.id} style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><p style={{ margin:"0 0 2px", fontSize:14, fontWeight:500, color:C.text }}>{h.concepto}</p><p style={{ margin:0, fontSize:12, color:C.textMuted }}>{clientMap[h.client_id]?.name}</p></div>
                <span style={{ fontSize:14, fontWeight:600, color:C.text }}>{fmtMoney(Number(h.monto)-Number(h.monto_pagado||0))}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function CalendarView({ processes, clients }) {
  const { C } = useTheme();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(null);
  const clientMap = Object.fromEntries(clients.map(c=>[c.id,c]));
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year,month,1).getDay(), daysInMonth = new Date(year,month+1,0).getDate();
  const byDay = {};
  processes.filter(p=>{ const d=new Date(p.due_date); return d.getFullYear()===year&&d.getMonth()===month; }).forEach(p=>{ const day=new Date(p.due_date).getDate(); if(!byDay[day])byDay[day]=[]; byDay[day].push(p); });
  const getDotColor = procs => procs.some(p=>p.status!=="completado"&&new Date(p.due_date)<today)?C.danger:procs.some(p=>p.status==="completado")?C.accent:C.warning;
  const allThisMonth = processes.filter(p=>{ const d=new Date(p.due_date); return d.getFullYear()===year&&d.getMonth()===month; });
  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:600, color:C.text, margin:"0 0 24px", fontFamily:"'Georgia', serif" }}>Calendario de vencimientos</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>
        <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
            <button onClick={()=>setViewDate(new Date(year,month-1,1))} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", color:C.gray }}><Icon name="chevronLeft" size={16} /></button>
            <h3 style={{ margin:0, fontSize:16, fontWeight:600, color:C.text }}>{MONTHS[month]} {year}</h3>
            <button onClick={()=>setViewDate(new Date(year,month+1,1))} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", color:C.gray }}><Icon name="chevronRight" size={16} /></button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderBottom:`1px solid ${C.border}` }}>
            {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d=><div key={d} style={{ padding:"10px 0", textAlign:"center", fontSize:12, fontWeight:600, color:C.textMuted }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)" }}>
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} style={{ minHeight:68, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }} />)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day=i+1, dayProcs=byDay[day]||[];
              const isToday=day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
              return (
                <div key={day} onClick={()=>setSelected(dayProcs.length>0?day:null)} style={{ padding:"6px", minHeight:68, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, cursor:dayProcs.length>0?"pointer":"default", background:selected===day?C.primary+"15":"none" }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:isToday?C.primary:"none", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:3 }}>
                    <span style={{ fontSize:12, fontWeight:isToday?600:400, color:isToday?"#fff":C.text }}>{day}</span>
                  </div>
                  {dayProcs.slice(0,2).map(p=><div key={p.id} style={{ fontSize:10, padding:"1px 4px", borderRadius:3, marginBottom:1, background:getDotColor([p])+"25", color:getDotColor([p]), overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div>)}
                  {dayProcs.length>2&&<div style={{ fontSize:10, color:C.textMuted }}>+{dayProcs.length-2}</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden", height:"fit-content" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}><h3 style={{ margin:0, fontSize:15, fontWeight:600, color:C.text }}>{selected?`${selected} de ${MONTHS[month]}`:"Resumen del mes"}</h3></div>
          <div style={{ padding:"16px 20px" }}>
            {!selected
              ? [["Total",allThisMonth.length,C.primary],["Pendientes",allThisMonth.filter(p=>p.status==="pendiente").length,C.warning],["En proceso",allThisMonth.filter(p=>p.status==="en_proceso").length,"#2D5F8A"],["Completados",allThisMonth.filter(p=>p.status==="completado").length,C.accent]].map(([k,v,c])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}><span style={{ fontSize:13, color:C.textMuted }}>{k}</span><span style={{ fontSize:13, fontWeight:600, color:c }}>{v}</span></div>
              ))
              : (byDay[selected]||[]).map(p=>(
                <div key={p.id} style={{ marginBottom:10, padding:10, background:C.surface, borderRadius:8, borderLeft:`3px solid ${getDotColor([p])}` }}>
                  <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:500, color:C.text }}>{p.title}</p>
                  <p style={{ margin:"0 0 6px", fontSize:12, color:C.textMuted }}>{clientMap[p.client_id]?.name}</p>
                  <Badge status={p.status} />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsView({ clients, processes, profile }) {
  const { C } = useTheme();
  const inputStyle = useInputStyle();
  const btnPrimary = useBtnPrimary();
  const btnSecondary = useBtnSecondary();
  const [reportMonth, setReportMonth] = useState(today.getMonth());
  const [reportYear, setReportYear] = useState(today.getFullYear());
  const processesInMonth = processes.filter(p=>{ const d=new Date(p.due_date); return d.getMonth()===reportMonth&&d.getFullYear()===reportYear; });
  const years = [today.getFullYear()-1, today.getFullYear(), today.getFullYear()+1];
  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:600, color:C.text, margin:"0 0 24px", fontFamily:"'Georgia', serif" }}>Reportes</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:C.primary+"25", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="clients" size={20} color={C.primary} /></div>
            <div><h3 style={{ margin:0, fontSize:16, fontWeight:600, color:C.text }}>Lista de clientes</h3><p style={{ margin:0, fontSize:13, color:C.textMuted }}>{clients.length} clientes registrados</p></div>
          </div>
          <div style={{ background:C.surface, borderRadius:8, padding:12, marginBottom:16 }}>
            {[["Activos",clients.filter(c=>c.status==="activo").length],["Inactivos",clients.filter(c=>c.status==="inactivo").length],["Persona física",clients.filter(c=>c.type==="fisica").length],["Persona moral",clients.filter(c=>c.type==="moral").length]].map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}` }}><span style={{ fontSize:13, color:C.textMuted }}>{k}</span><span style={{ fontSize:13, fontWeight:600, color:C.text }}>{v}</span></div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>exportClientsPDF(clients,profile?.despacho)} style={{ ...btnPrimary, flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:13 }}><Icon name="fileText" size={14} color="#fff" /> PDF</button>
            <button onClick={()=>exportClientsExcel(clients)} style={{ ...btnSecondary, flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:13 }}><Icon name="table" size={14} color={C.gray} /> Excel</button>
          </div>
        </div>
        <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:"#2D5F8A25", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="processes" size={20} color="#2D5F8A" /></div>
            <div><h3 style={{ margin:0, fontSize:16, fontWeight:600, color:C.text }}>Procesos por mes</h3><p style={{ margin:0, fontSize:13, color:C.textMuted }}>{processesInMonth.length} en el período</p></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <div><label style={{ display:"block", fontSize:13, fontWeight:500, color:C.textMuted, marginBottom:6 }}>Mes</label><select style={inputStyle} value={reportMonth} onChange={e=>setReportMonth(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}</select></div>
            <div><label style={{ display:"block", fontSize:13, fontWeight:500, color:C.textMuted, marginBottom:6 }}>Año</label><select style={inputStyle} value={reportYear} onChange={e=>setReportYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
          </div>
          <div style={{ background:C.surface, borderRadius:8, padding:12, marginBottom:16 }}>
            {[["Pendientes",processesInMonth.filter(p=>p.status==="pendiente").length,C.warning],["En proceso",processesInMonth.filter(p=>p.status==="en_proceso").length,"#2D5F8A"],["Completados",processesInMonth.filter(p=>p.status==="completado").length,C.accent]].map(([k,v,c])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}` }}><span style={{ fontSize:13, color:C.textMuted }}>{k}</span><span style={{ fontSize:13, fontWeight:600, color:c }}>{v}</span></div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>exportProcessesPDF(processes,clients,profile?.despacho,reportMonth,reportYear)} style={{ ...btnPrimary, flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:13 }}><Icon name="fileText" size={14} color="#fff" /> PDF</button>
            <button onClick={()=>exportProcessesExcel(processes,clients,reportMonth,reportYear)} style={{ ...btnSecondary, flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:13 }}><Icon name="table" size={14} color={C.gray} /> Excel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsView({ clients, setClients, processes, userId }) {
  const { C } = useTheme();
  const inputStyle = useInputStyle();
  const btnPrimary = useBtnPrimary();
  const btnSecondary = useBtnSecondary();
  const [search,setSearch]=useState(""), [filterType,setFilterType]=useState("all"), [filterStatus,setFilterStatus]=useState("all");
  const [showModal,setShowModal]=useState(false), [editing,setEditing]=useState(null), [saving,setSaving]=useState(false);
  const [viewClient,setViewClient]=useState(null);
  const [form,setForm]=useState({name:"",rfc:"",email:"",phone:"",type:"fisica",status:"activo"});
  const filtered=useMemo(()=>clients.filter(c=>{const q=search.toLowerCase();return(c.name.toLowerCase().includes(q)||c.rfc?.toLowerCase().includes(q)||c.email?.toLowerCase().includes(q))&&(filterType==="all"||c.type===filterType)&&(filterStatus==="all"||c.status===filterStatus);}),[clients,search,filterType,filterStatus]);
  const openAdd=()=>{setEditing(null);setForm({name:"",rfc:"",email:"",phone:"",type:"fisica",status:"activo"});setShowModal(true);};
  const openEdit=c=>{setEditing(c);setForm({name:c.name,rfc:c.rfc||"",email:c.email,phone:c.phone||"",type:c.type,status:c.status});setShowModal(true);};
  const save=async()=>{if(!form.name||!form.email)return;setSaving(true);if(editing){const{data}=await supabase.from("clients").update({...form}).eq("id",editing.id).select().single();setClients(p=>p.map(c=>c.id===editing.id?data:c));}else{const{data}=await supabase.from("clients").insert({...form,user_id:userId}).select().single();setClients(p=>[...p,data]);}setSaving(false);setShowModal(false);};
  const remove=async id=>{await supabase.from("clients").delete().eq("id",id);setClients(p=>p.filter(c=>c.id!==id));};
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:600, color:C.text, margin:0, fontFamily:"'Georgia', serif" }}>Clientes</h2>
        <button onClick={openAdd} style={{ ...btnPrimary, display:"flex", alignItems:"center", gap:6 }}><Icon name="plus" size={15} color="#fff" /> Agregar cliente</button>
      </div>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, marginBottom:20, padding:"14px 16px", display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:200, background:C.surface, borderRadius:8, padding:"8px 12px" }}>
          <Icon name="search" size={15} color={C.textMuted} />
          <input style={{ border:"none", background:"none", outline:"none", fontSize:14, color:C.text, width:"100%" }} placeholder="Buscar por nombre, RFC o correo..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select style={{ ...inputStyle, width:"auto" }} value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="all">Todos los tipos</option><option value="fisica">Persona física</option><option value="moral">Persona moral</option></select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">Todos los estados</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select>
      </div>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:C.tablehead }}>{["Cliente","RFC","Contacto","Tipo","Estado","Procesos","Acciones"].map(h=><th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((c,i)=>(
              <tr key={c.id} style={{ borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none" }}>
                <td style={{ padding:"14px 16px" }}><div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:34, height:34, borderRadius:"50%", background:C.primary+"25", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:C.primary, flexShrink:0 }}>{c.name.split(" ").slice(0,2).map(n=>n[0]).join("")}</div><span style={{ fontSize:14, fontWeight:500, color:C.text }}>{c.name}</span></div></td>
                <td style={{ padding:"14px 16px", fontSize:13, color:C.textMuted, fontFamily:"monospace" }}>{c.rfc||"—"}</td>
                <td style={{ padding:"14px 16px" }}><p style={{ margin:"0 0 2px", fontSize:13, color:C.text }}>{c.email}</p><p style={{ margin:0, fontSize:12, color:C.textMuted }}>{c.phone}</p></td>
                <td style={{ padding:"14px 16px" }}><span style={{ background:C.accentLight, color:C.accent, fontSize:12, padding:"3px 10px", borderRadius:20, fontWeight:500 }}>{c.type==="fisica"?"Física":"Moral"}</span></td>
                <td style={{ padding:"14px 16px" }}><span style={{ background:c.status==="activo"?C.accentLight:C.grayLight, color:c.status==="activo"?C.accent:C.gray, fontSize:12, padding:"3px 10px", borderRadius:20, fontWeight:500 }}>{c.status==="activo"?"Activo":"Inactivo"}</span></td>
                <td style={{ padding:"14px 16px", fontSize:13, color:C.textMuted }}>{processes.filter(p=>p.client_id===c.id).length}</td>
                <td style={{ padding:"14px 16px" }}><div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>setViewClient(c)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", cursor:"pointer", color:C.textMuted }}><Icon name="user" size={14} /></button>
                  <button onClick={()=>openEdit(c)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", cursor:"pointer", color:C.textMuted }}><Icon name="edit" size={14} /></button>
                  <button onClick={()=>remove(c.id)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", cursor:"pointer", color:C.danger }}><Icon name="trash" size={14} /></button>
                </div></td>
              </tr>
            ))}
            {filtered.length===0&&<tr><td colSpan={7} style={{ padding:"40px", textAlign:"center", color:C.textMuted, fontSize:14 }}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
      {showModal&&(
        <Modal title={editing?"Editar cliente":"Nuevo cliente"} onClose={()=>setShowModal(false)}>
          <FormField label="Nombre completo" required><input style={inputStyle} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nombre completo o razón social" /></FormField>
          <FormField label="RFC"><input style={{ ...inputStyle, fontFamily:"monospace" }} value={form.rfc} onChange={e=>setForm(f=>({...f,rfc:e.target.value.toUpperCase()}))} placeholder="RFC opcional" /></FormField>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Correo electrónico" required><input style={inputStyle} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></FormField>
            <FormField label="Teléfono"><input style={inputStyle} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></FormField>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Tipo"><select style={inputStyle} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option value="fisica">Persona física</option><option value="moral">Persona moral</option></select></FormField>
            <FormField label="Estado"><select style={inputStyle} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></FormField>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <button onClick={()=>setShowModal(false)} style={btnSecondary}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.7:1 }}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}
      {viewClient&&(
        <Modal title="Perfil del cliente" onClose={()=>setViewClient(null)}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:C.primary+"25", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:C.primary }}>{viewClient.name.split(" ").slice(0,2).map(n=>n[0]).join("")}</div>
            <p style={{ margin:0, fontSize:17, fontWeight:600, color:C.text }}>{viewClient.name}</p>
          </div>
          {[["RFC",viewClient.rfc||"No registrado"],["Correo",viewClient.email],["Teléfono",viewClient.phone||"—"],["Estado",viewClient.status==="activo"?"Activo":"Inactivo"],["Procesos",processes.filter(p=>p.client_id===viewClient.id).length]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}><span style={{ fontSize:13, color:C.textMuted }}>{k}</span><span style={{ fontSize:13, fontWeight:500, color:C.text }}>{v}</span></div>
          ))}
        </Modal>
      )}
    </div>
  );
}

function ProcessesView({ processes, setProcesses, clients, userId }) {
  const { C } = useTheme();
  const inputStyle = useInputStyle();
  const btnPrimary = useBtnPrimary();
  const btnSecondary = useBtnSecondary();
  const [search,setSearch]=useState(""), [filterStatus,setFilterStatus]=useState("all"), [filterType,setFilterType]=useState("all");
  const [showModal,setShowModal]=useState(false), [editing,setEditing]=useState(null), [saving,setSaving]=useState(false);
  const emptyForm={client_id:clients[0]?.id||"",type:"declaracion_mensual",title:"",start_date:fmt(today),due_date:"",status:"pendiente",notes:"",reminder:3};
  const [form,setForm]=useState(emptyForm);
  const clientMap=Object.fromEntries(clients.map(c=>[c.id,c]));
  const filtered=useMemo(()=>processes.filter(p=>{const q=search.toLowerCase();return(p.title.toLowerCase().includes(q)||clientMap[p.client_id]?.name.toLowerCase().includes(q))&&(filterStatus==="all"||p.status===filterStatus)&&(filterType==="all"||p.type===filterType);}),[processes,search,filterStatus,filterType]);
  const openAdd=()=>{setEditing(null);setForm({...emptyForm,client_id:clients[0]?.id||""});setShowModal(true);};
  const openEdit=p=>{setEditing(p);setForm({client_id:p.client_id,type:p.type,title:p.title,start_date:p.start_date,due_date:p.due_date,status:p.status,notes:p.notes||"",reminder:p.reminder||3});setShowModal(true);};
  const save=async()=>{if(!form.title||!form.client_id||!form.due_date)return;setSaving(true);const payload={...form,client_id:Number(form.client_id),user_id:userId};if(editing){const{data}=await supabase.from("processes").update(payload).eq("id",editing.id).select().single();setProcesses(p=>p.map(x=>x.id===editing.id?data:x));}else{const{data}=await supabase.from("processes").insert(payload).select().single();setProcesses(p=>[...p,data]);}setSaving(false);setShowModal(false);};
  const remove=async id=>{await supabase.from("processes").delete().eq("id",id);setProcesses(p=>p.filter(x=>x.id!==id));};
  const updateStatus=async(id,status)=>{await supabase.from("processes").update({status}).eq("id",id);setProcesses(p=>p.map(x=>x.id===id?{...x,status}:x));};
  const daysLeft=d=>Math.ceil((new Date(d)-new Date())/86400000);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:600, color:C.text, margin:0, fontFamily:"'Georgia', serif" }}>Procesos</h2>
        <button onClick={openAdd} style={{ ...btnPrimary, display:"flex", alignItems:"center", gap:6 }}><Icon name="plus" size={15} color="#fff" /> Nuevo proceso</button>
      </div>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, marginBottom:20, padding:"14px 16px", display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:200, background:C.surface, borderRadius:8, padding:"8px 12px" }}>
          <Icon name="search" size={15} color={C.textMuted} />
          <input style={{ border:"none", background:"none", outline:"none", fontSize:14, color:C.text, width:"100%" }} placeholder="Buscar procesos o clientes..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">Todos los estados</option><option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="completado">Completado</option></select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="all">Todos los tipos</option>{Object.entries(PROCESS_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
      </div>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        {filtered.map((p,i)=>{
          const dl=daysLeft(p.due_date), isOverdue=dl<0&&p.status!=="completado";
          return (
            <div key={p.id} style={{ padding:"16px 20px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <p style={{ margin:0, fontSize:15, fontWeight:500, color:C.text }}>{p.title}</p>
                  {isOverdue&&<span style={{ background:C.dangerLight, color:C.danger, fontSize:11, padding:"2px 7px", borderRadius:4 }}>ATRASADO</span>}
                </div>
                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  <span style={{ fontSize:13, color:C.textMuted }}>{clientMap[p.client_id]?.name}</span>
                  <span style={{ fontSize:13, color:C.textMuted }}>· {PROCESS_TYPES[p.type]}</span>
                  <span style={{ fontSize:13, color:isOverdue?C.danger:C.textMuted }}>· Vence: {p.due_date}</span>
                </div>
                {p.notes&&<p style={{ margin:"4px 0 0", fontSize:12, color:C.textMuted, fontStyle:"italic" }}>{p.notes}</p>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                <Badge status={p.status} />
                <select value={p.status} onChange={e=>updateStatus(p.id,e.target.value)} style={{ ...inputStyle, width:"auto", fontSize:13, padding:"6px 10px" }}><option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="completado">Completado</option></select>
                <button onClick={()=>openEdit(p)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", cursor:"pointer", color:C.textMuted }}><Icon name="edit" size={14} /></button>
                <button onClick={()=>remove(p.id)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", cursor:"pointer", color:C.danger }}><Icon name="trash" size={14} /></button>
              </div>
            </div>
          );
        })}
        {filtered.length===0&&<p style={{ padding:"40px", textAlign:"center", color:C.textMuted, fontSize:14 }}>Sin procesos registrados</p>}
      </div>
      {showModal&&(
        <Modal title={editing?"Editar proceso":"Nuevo proceso"} onClose={()=>setShowModal(false)}>
          <FormField label="Cliente" required><select style={inputStyle} value={form.client_id} onChange={e=>setForm(f=>({...f,client_id:e.target.value}))}>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
          <FormField label="Tipo"><select style={inputStyle} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{Object.entries(PROCESS_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></FormField>
          <FormField label="Título" required><input style={inputStyle} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ej: Declaración mensual IVA - Abril" /></FormField>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Fecha de inicio"><input style={inputStyle} type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} /></FormField>
            <FormField label="Fecha límite" required><input style={inputStyle} type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} /></FormField>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Estado"><select style={inputStyle} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="completado">Completado</option></select></FormField>
            <FormField label="Recordatorio (días antes)"><input style={inputStyle} type="number" min="1" max="30" value={form.reminder} onChange={e=>setForm(f=>({...f,reminder:Number(e.target.value)}))} /></FormField>
          </div>
          <FormField label="Notas"><textarea style={{ ...inputStyle, height:80, resize:"vertical" }} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></FormField>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <button onClick={()=>setShowModal(false)} style={btnSecondary}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.7:1 }}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function HonorariosView({ honorarios, setHonorarios, clients, userId, profile }) {
  const { C } = useTheme();
  const inputStyle = useInputStyle();
  const btnPrimary = useBtnPrimary();
  const btnSecondary = useBtnSecondary();
  const [filterStatus,setFilterStatus]=useState("all"), [filterClient,setFilterClient]=useState("all");
  const [showModal,setShowModal]=useState(false), [editing,setEditing]=useState(null), [saving,setSaving]=useState(false);
  const [showPagoModal,setShowPagoModal]=useState(null), [montoPago,setMontoPago]=useState("");
  const [generatingPDF,setGeneratingPDF]=useState(null);
  const emptyForm={client_id:clients[0]?.id||"",concepto:"",tipo:"fijo",monto:"",periodo:`${MONTHS[today.getMonth()]} ${today.getFullYear()}`,status:"pendiente",monto_pagado:0,fecha_emision:fmt(today),fecha_vencimiento:"",notas:""};
  const [form,setForm]=useState(emptyForm);
  const clientMap=Object.fromEntries(clients.map(c=>[c.id,c]));
  const filtered=useMemo(()=>honorarios.filter(h=>(filterStatus==="all"||h.status===filterStatus)&&(filterClient==="all"||h.client_id===Number(filterClient))).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[honorarios,filterStatus,filterClient]);
  const totalPendiente=honorarios.filter(h=>h.status!=="pagado").reduce((s,h)=>s+Number(h.monto)-Number(h.monto_pagado||0),0);
  const totalCobrado=honorarios.filter(h=>h.status==="pagado").reduce((s,h)=>s+Number(h.monto),0);
  const totalParcial=honorarios.filter(h=>h.status==="parcial").reduce((s,h)=>s+Number(h.monto_pagado||0),0);
  const openAdd=()=>{setEditing(null);setForm({...emptyForm,client_id:clients[0]?.id||""});setShowModal(true);};
  const openEdit=h=>{setEditing(h);setForm({client_id:h.client_id,concepto:h.concepto,tipo:h.tipo,monto:h.monto,periodo:h.periodo||"",status:h.status,monto_pagado:h.monto_pagado||0,fecha_emision:h.fecha_emision||fmt(today),fecha_vencimiento:h.fecha_vencimiento||"",notas:h.notas||""});setShowModal(true);};
  const save=async()=>{if(!form.concepto||!form.monto||!form.client_id)return;setSaving(true);const payload={...form,client_id:Number(form.client_id),monto:Number(form.monto),monto_pagado:Number(form.monto_pagado||0),user_id:userId};if(editing){const{data}=await supabase.from("honorarios").update(payload).eq("id",editing.id).select().single();setHonorarios(p=>p.map(h=>h.id===editing.id?data:h));}else{const{data}=await supabase.from("honorarios").insert(payload).select().single();setHonorarios(p=>[...p,data]);}setSaving(false);setShowModal(false);};
  const remove=async id=>{await supabase.from("honorarios").delete().eq("id",id);setHonorarios(p=>p.filter(h=>h.id!==id));};
  const registrarPago=async()=>{if(!montoPago||!showPagoModal)return;const h=showPagoModal;const nuevoPagado=Number(h.monto_pagado||0)+Number(montoPago);const nuevoStatus=nuevoPagado>=Number(h.monto)?"pagado":"parcial";const{data}=await supabase.from("honorarios").update({monto_pagado:nuevoPagado,status:nuevoStatus}).eq("id",h.id).select().single();setHonorarios(p=>p.map(x=>x.id===h.id?data:x));setShowPagoModal(null);setMontoPago("");};
  const handleGeneratePDF=async(h)=>{setGeneratingPDF(h.id);await generateReciboPDF(h,clientMap[h.client_id],profile);setGeneratingPDF(null);};
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:600, color:C.text, margin:0, fontFamily:"'Georgia', serif" }}>Honorarios</h2>
        <button onClick={openAdd} style={{ ...btnPrimary, display:"flex", alignItems:"center", gap:6 }}><Icon name="plus" size={15} color="#fff" /> Nuevo cobro</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:14, marginBottom:28 }}>
        {[["Por cobrar",fmtMoney(totalPendiente),C.danger,"alert"],["Cobrado",fmtMoney(totalCobrado),C.accent,"check"],["Pago parcial",fmtMoney(totalParcial),"#185FA5","clock"],["Total registros",honorarios.length,C.primary,"receipt"]].map(([label,value,color,icon])=>(
          <div key={label} style={{ background:C.cardBg, borderRadius:12, padding:"18px 20px", border:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:color+"25", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={icon} size={18} color={color} /></div>
            <div><p style={{ margin:"0 0 3px", fontSize:12, color:C.textMuted }}>{label}</p><p style={{ margin:0, fontSize:18, fontWeight:700, color:C.text }}>{value}</p></div>
          </div>
        ))}
      </div>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, marginBottom:20, padding:"14px 16px", display:"flex", gap:12, flexWrap:"wrap" }}>
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(HON_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterClient} onChange={e=>setFilterClient(e.target.value)}><option value="all">Todos los clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <span style={{ fontSize:13, color:C.textMuted, display:"flex", alignItems:"center" }}>{filtered.length} registros</span>
      </div>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        {filtered.length===0?<p style={{ padding:"40px", textAlign:"center", color:C.textMuted }}>Sin registros de honorarios</p>
          :filtered.map((h,i)=>{
            const client=clientMap[h.client_id], saldo=Number(h.monto)-Number(h.monto_pagado||0);
            return (
              <div key={h.id} style={{ padding:"16px 20px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:C.primary+"20", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="money" size={18} color={C.primary} /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <p style={{ margin:0, fontSize:15, fontWeight:500, color:C.text }}>{h.concepto}</p>
                    <HonBadge status={h.status} />
                  </div>
                  <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, color:C.textMuted }}>{client?.name}</span>
                    <span style={{ fontSize:13, color:C.textMuted }}>· {h.periodo||"—"}</span>
                    <span style={{ fontSize:13, color:C.textMuted }}>· {h.tipo==="fijo"?"Fijo mensual":"Por trámite"}</span>
                  </div>
                  {h.notas&&<p style={{ margin:"3px 0 0", fontSize:12, color:C.textMuted, fontStyle:"italic" }}>{h.notas}</p>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginRight:12 }}>
                  <p style={{ margin:"0 0 2px", fontSize:16, fontWeight:700, color:C.text }}>{fmtMoney(h.monto)}</p>
                  {h.monto_pagado>0&&<p style={{ margin:"0 0 2px", fontSize:12, color:C.accent }}>Pagado: {fmtMoney(h.monto_pagado)}</p>}
                  {saldo>0&&<p style={{ margin:0, fontSize:12, color:C.danger }}>Saldo: {fmtMoney(saldo)}</p>}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  {h.status!=="pagado"&&<button onClick={()=>{setShowPagoModal(h);setMontoPago("");}} style={{ background:C.accent+"20", border:`1px solid ${C.accent}`, borderRadius:6, padding:"5px 10px", cursor:"pointer", color:C.accent, fontSize:12, fontWeight:500 }}>Registrar pago</button>}
                  <button onClick={()=>handleGeneratePDF(h)} disabled={generatingPDF===h.id} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 10px", cursor:"pointer", color:generatingPDF===h.id?C.textMuted:C.primary, fontSize:12, fontWeight:500, display:"flex", alignItems:"center", gap:5, opacity:generatingPDF===h.id?0.6:1 }}>
                    <Icon name="receipt" size={13} color={generatingPDF===h.id?C.textMuted:C.primary} />
                    {generatingPDF===h.id?"...":"Recibo PDF"}
                  </button>
                  <button onClick={()=>openEdit(h)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", cursor:"pointer", color:C.textMuted }}><Icon name="edit" size={14} /></button>
                  <button onClick={()=>remove(h.id)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", cursor:"pointer", color:C.danger }}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            );
          })}
      </div>
      {showModal&&(
        <Modal title={editing?"Editar honorario":"Nuevo cobro"} onClose={()=>setShowModal(false)}>
          <FormField label="Cliente" required><select style={inputStyle} value={form.client_id} onChange={e=>setForm(f=>({...f,client_id:e.target.value}))}>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
          <FormField label="Concepto" required><input style={inputStyle} value={form.concepto} onChange={e=>setForm(f=>({...f,concepto:e.target.value}))} placeholder="Ej: Honorarios contables Abril 2025" /></FormField>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Tipo"><select style={inputStyle} value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}><option value="fijo">Fijo mensual</option><option value="tramite">Por trámite</option></select></FormField>
            <FormField label="Período"><input style={inputStyle} value={form.periodo} onChange={e=>setForm(f=>({...f,periodo:e.target.value}))} placeholder="Ej: Abril 2025" /></FormField>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Monto total" required><input style={inputStyle} type="number" min="0" step="0.01" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))} placeholder="0.00" /></FormField>
            <FormField label="Monto pagado"><input style={inputStyle} type="number" min="0" step="0.01" value={form.monto_pagado} onChange={e=>setForm(f=>({...f,monto_pagado:e.target.value}))} placeholder="0.00" /></FormField>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Fecha de emisión"><input style={inputStyle} type="date" value={form.fecha_emision} onChange={e=>setForm(f=>({...f,fecha_emision:e.target.value}))} /></FormField>
            <FormField label="Fecha de vencimiento"><input style={inputStyle} type="date" value={form.fecha_vencimiento} onChange={e=>setForm(f=>({...f,fecha_vencimiento:e.target.value}))} /></FormField>
          </div>
          <FormField label="Estado"><select style={inputStyle} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{Object.entries(HON_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></FormField>
          <FormField label="Notas"><textarea style={{ ...inputStyle, height:70, resize:"vertical" }} value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} /></FormField>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <button onClick={()=>setShowModal(false)} style={btnSecondary}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.7:1 }}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}
      {showPagoModal&&(
        <Modal title="Registrar pago" onClose={()=>setShowPagoModal(null)} maxWidth={400}>
          <div style={{ background:C.surface, borderRadius:10, padding:16, marginBottom:20 }}>
            <p style={{ margin:"0 0 4px", fontSize:15, fontWeight:600, color:C.text }}>{showPagoModal.concepto}</p>
            <p style={{ margin:"0 0 8px", fontSize:13, color:C.textMuted }}>{clientMap[showPagoModal.client_id]?.name}</p>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:13, color:C.textMuted }}>Total: {fmtMoney(showPagoModal.monto)}</span>
              <span style={{ fontSize:13, color:C.accent }}>Pagado: {fmtMoney(showPagoModal.monto_pagado||0)}</span>
              <span style={{ fontSize:13, color:C.danger }}>Saldo: {fmtMoney(Number(showPagoModal.monto)-Number(showPagoModal.monto_pagado||0))}</span>
            </div>
          </div>
          <FormField label="Monto a registrar" required><input style={inputStyle} type="number" min="0" step="0.01" value={montoPago} onChange={e=>setMontoPago(e.target.value)} placeholder="0.00" autoFocus /></FormField>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={()=>setShowPagoModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={registrarPago} style={btnPrimary}>Registrar pago</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RemindersView({ processes, clients }) {
  const { C } = useTheme();
  const clientMap=Object.fromEntries(clients.map(c=>[c.id,c]));
  const now=new Date();
  const upcoming=processes.filter(p=>p.status!=="completado").map(p=>({...p,daysLeft:Math.ceil((new Date(p.due_date)-now)/86400000)})).filter(p=>p.daysLeft>=-7&&p.daysLeft<=30).sort((a,b)=>a.daysLeft-b.daysLeft);
  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:600, color:C.text, margin:"0 0 24px", fontFamily:"'Georgia', serif" }}>Recordatorios</h2>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}><h3 style={{ margin:0, fontSize:15, fontWeight:600, color:C.text }}>Próximos 30 días</h3></div>
        {upcoming.length===0?<p style={{ padding:"40px", textAlign:"center", color:C.textMuted }}>Sin recordatorios próximos</p>
          :upcoming.map((p,i)=>{
            const isOverdue=p.daysLeft<0, isUrgent=p.daysLeft>=0&&p.daysLeft<=3;
            return (
              <div key={p.id} style={{ padding:"14px 20px", borderBottom:i<upcoming.length-1?`1px solid ${C.border}`:"none", background:isOverdue?C.dangerLight:isUrgent?C.warningLight:"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:(isOverdue?C.danger:isUrgent?C.warning:C.primary)+"25", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={isOverdue?"alert":"clock"} size={17} color={isOverdue?C.danger:isUrgent?C.warning:C.primary} /></div>
                  <div><p style={{ margin:"0 0 2px", fontSize:14, fontWeight:500, color:C.text }}>{p.title}</p><p style={{ margin:0, fontSize:12, color:C.textMuted }}>{clientMap[p.client_id]?.name} · {p.reminder||3}d antes</p></div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <p style={{ margin:"0 0 4px", fontSize:13, color:C.textMuted }}>Vence: {p.due_date}</p>
                  <span style={{ background:isOverdue?C.danger:isUrgent?C.warning:C.primary, color:"#fff", fontSize:12, padding:"3px 10px", borderRadius:20, fontWeight:500 }}>{isOverdue?`${Math.abs(p.daysLeft)}d atraso`:p.daysLeft===0?"Hoy":`${p.daysLeft}d`}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function HistoryView({ processes, clients }) {
  const { C } = useTheme();
  const inputStyle=useInputStyle();
  const clientMap=Object.fromEntries(clients.map(c=>[c.id,c]));
  const [filterClient,setFilterClient]=useState("all"), [filterStatus,setFilterStatus]=useState("all");
  const sorted=[...processes].filter(p=>(filterClient==="all"||p.client_id===Number(filterClient))&&(filterStatus==="all"||p.status===filterStatus)).sort((a,b)=>new Date(b.start_date)-new Date(a.start_date));
  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:600, color:C.text, margin:"0 0 24px", fontFamily:"'Georgia', serif" }}>Historial</h2>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, marginBottom:20, padding:"14px 16px", display:"flex", gap:12, flexWrap:"wrap" }}>
        <select style={{ ...inputStyle, width:"auto" }} value={filterClient} onChange={e=>setFilterClient(e.target.value)}><option value="all">Todos los clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">Todos los estados</option><option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="completado">Completado</option></select>
        <span style={{ fontSize:13, color:C.textMuted, display:"flex", alignItems:"center" }}>{sorted.length} registros</span>
      </div>
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:C.tablehead }}>{["Proceso","Cliente","Tipo","Inicio","Vencimiento","Estado","Notas"].map(h=><th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {sorted.map((p,i)=>(
              <tr key={p.id} style={{ borderBottom:i<sorted.length-1?`1px solid ${C.border}`:"none" }}>
                <td style={{ padding:"12px 16px", fontSize:14, fontWeight:500, color:C.text }}>{p.title}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:C.textMuted }}>{clientMap[p.client_id]?.name||"—"}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:C.textMuted }}>{PROCESS_TYPES[p.type]}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:C.textMuted }}>{p.start_date}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:C.textMuted }}>{p.due_date}</td>
                <td style={{ padding:"12px 16px" }}><Badge status={p.status} /></td>
                <td style={{ padding:"12px 16px", fontSize:13, color:C.textMuted, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.notes||"—"}</td>
              </tr>
            ))}
            {sorted.length===0&&<tr><td colSpan={7} style={{ padding:"40px", textAlign:"center", color:C.textMuted }}>Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [user,setUser]=useState(null), [profile,setProfile]=useState(null);
  const [active,setActive]=useState("dashboard");
  const [clients,setClients]=useState([]), [processes,setProcesses]=useState([]), [honorarios,setHonorarios]=useState([]);
  const [loading,setLoading]=useState(true);
  const [dark,setDark]=useState(()=>{ try{return localStorage.getItem("conta_dark")==="true";}catch{return false;} });
  const [showSearch,setShowSearch]=useState(false), [showProfile,setShowProfile]=useState(false);
  const C=getColors(dark);

  useEffect(()=>{ try{localStorage.setItem("conta_dark",dark);}catch{} },[dark]);
  useEffect(()=>{
    const handler=(e)=>{ if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowSearch(true);} };
    window.addEventListener("keydown",handler); return()=>window.removeEventListener("keydown",handler);
  },[]);
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session){ const{data:prof}=await supabase.from("profiles").select("*").eq("id",session.user.id).single(); setUser(session.user); setProfile(prof); }
      setLoading(false);
    });
    const{data:listener}=supabase.auth.onAuthStateChange(async(event,session)=>{ if(!session){setUser(null);setProfile(null);setClients([]);setProcesses([]);setHonorarios([]);} });
    return()=>listener.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if(!user)return;
    const load=async()=>{
      const[{data:c},{data:p},{data:h}]=await Promise.all([
        supabase.from("clients").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
        supabase.from("processes").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
        supabase.from("honorarios").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
      ]);
      setClients(c||[]); setProcesses(p||[]); setHonorarios(h||[]);
    };
    load();
  },[user]);

  const handleLogout=async()=>{ await supabase.auth.signOut(); setUser(null); setProfile(null); };

  if(loading) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg }}><Spinner /></div>;
  if(!user) return <AuthScreen onAuth={(u,p)=>{ setUser(u); setProfile(p); }} />;

  const views={
    dashboard:<DashboardView clients={clients} processes={processes} honorarios={honorarios} setActive={setActive} />,
    clients:<ClientsView clients={clients} setClients={setClients} processes={processes} userId={user.id} />,
    processes:<ProcessesView processes={processes} setProcesses={setProcesses} clients={clients} userId={user.id} />,
    honorarios:<HonorariosView honorarios={honorarios} setHonorarios={setHonorarios} clients={clients} userId={user.id} profile={profile} />,
    calendar:<CalendarView processes={processes} clients={clients} />,
    reminders:<RemindersView processes={processes} clients={clients} />,
    reports:<ReportsView clients={clients} processes={processes} profile={profile} />,
    history:<HistoryView processes={processes} clients={clients} />,
  };

  return (
    <ThemeContext.Provider value={{ dark, C }}>
      <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Segoe UI', system-ui, sans-serif", background:C.bg, color:C.text }}>
        <Sidebar active={active} setActive={setActive} profile={profile} onLogout={handleLogout} dark={dark} setDark={setDark} onOpenProfile={()=>setShowProfile(true)} onOpenSearch={()=>setShowSearch(true)} />
        <div style={{ flex:1, padding:36, overflow:"auto" }}>{views[active]}</div>
        {showSearch&&<GlobalSearch clients={clients} processes={processes} setActive={setActive} onClose={()=>setShowSearch(false)} />}
        {showProfile&&<ProfileModal user={user} profile={profile} onClose={()=>setShowProfile(false)} onUpdate={setProfile} />}
      </div>
    </ThemeContext.Provider>
  );
}
