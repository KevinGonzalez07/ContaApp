import { useState, useEffect, useMemo } from "react";

const COLORS = {
  primary: "#1B3A5C",
  primaryLight: "#2D5F8A",
  accent: "#1D9E75",
  accentLight: "#E1F5EE",
  danger: "#A32D2D",
  dangerLight: "#FCEBEB",
  warning: "#854F0B",
  warningLight: "#FAEEDA",
  gray: "#5F5E5A",
  grayLight: "#F1EFE8",
  border: "rgba(0,0,0,0.1)",
  white: "#FFFFFF",
  bg: "#F7F6F2",
  text: "#1C1C1A",
  textMuted: "#6B6B67",
};

const DEMO_USER = { email: "contadora@despacho.mx", password: "demo123", name: "Lic. María González" };

const INITIAL_CLIENTS = [
  { id: 1, name: "Construcciones Regia SA de CV", rfc: "CRE980412HJ3", email: "admin@construregia.mx", phone: "8112345678", type: "moral", status: "activo" },
  { id: 2, name: "Ramírez Treviño Juan Carlos", rfc: "RATJ850601KL8", email: "jc.ramirez@gmail.com", phone: "8123456789", type: "fisica", status: "activo" },
  { id: 3, name: "Distribuidora El Norte SC", rfc: "DEN010305PQ2", email: "contabilidad@elnorte.mx", phone: "8134567890", type: "moral", status: "activo" },
  { id: 4, name: "López Garza Sofía", rfc: "LOGS920314AB5", email: "sofia.lopez@hotmail.com", phone: "8145678901", type: "fisica", status: "activo" },
  { id: 5, name: "Servicios Industriales MTY SA", rfc: "SIM030820XY9", email: "finanzas@simty.mx", phone: "8156789012", type: "moral", status: "inactivo" },
];

const today = new Date();
const fmt = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return fmt(x); };

const INITIAL_PROCESSES = [
  { id: 1, clientId: 1, type: "declaracion_mensual", title: "Declaración Mensual IVA - Marzo", startDate: fmt(today), dueDate: addDays(today, 3), status: "pendiente", notes: "Verificar facturas del trimestre", reminder: 2 },
  { id: 2, clientId: 2, type: "declaracion_anual", title: "Declaración Anual ISR 2024", startDate: addDays(today, -10), dueDate: addDays(today, 1), status: "en_proceso", notes: "Pendiente comprobante de gastos médicos", reminder: 1 },
  { id: 3, clientId: 3, type: "tramite_fiscal", title: "Alta en RFC - Cambio de Domicilio", startDate: addDays(today, -5), dueDate: addDays(today, -2), status: "pendiente", notes: "Documentos listos en oficina", reminder: 3 },
  { id: 4, clientId: 4, type: "declaracion_mensual", title: "Declaración Mensual Marzo", startDate: addDays(today, -3), dueDate: addDays(today, 12), status: "completado", notes: "Enviada sin observaciones", reminder: 2 },
  { id: 5, clientId: 1, type: "declaracion_anual", title: "Declaración Anual ISR 2024", startDate: addDays(today, -15), dueDate: addDays(today, 8), status: "en_proceso", notes: "En revisión con el cliente", reminder: 3 },
  { id: 6, clientId: 5, type: "tramite_fiscal", title: "Baja en SAT", startDate: addDays(today, -20), dueDate: addDays(today, -5), status: "completado", notes: "Trámite concluido", reminder: 2 },
];

const PROCESS_TYPES = {
  declaracion_mensual: "Declaración Mensual",
  declaracion_anual: "Declaración Anual",
  tramite_fiscal: "Trámite Fiscal",
  otro: "Otro",
};

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", bg: COLORS.warningLight, color: COLORS.warning },
  en_proceso: { label: "En Proceso", bg: "#E6F1FB", color: "#185FA5" },
  completado: { label: "Completado", bg: COLORS.accentLight, color: "#0F6E56" },
};

function Badge({ status }) {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

function Icon({ name, size = 18, color = "currentColor" }) {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    clients: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    processes: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>,
    reminders: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
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
    history: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.51"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  };
  return icons[name] || null;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: COLORS.white, borderRadius: 12, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: COLORS.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: COLORS.gray }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: COLORS.textMuted, marginBottom: 6 }}>{label}{required && <span style={{ color: COLORS.danger }}> *</span>}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 14, color: COLORS.text, background: COLORS.white, outline: "none", boxSizing: "border-box" };
const btnPrimary = { background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" };
const btnSecondary = { background: "none", color: COLORS.gray, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 20px", fontSize: 14, cursor: "pointer" };

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (email === DEMO_USER.email && password === DEMO_USER.password) {
        onLogin(DEMO_USER);
      } else {
        setError("Correo o contraseña incorrectos. Usa: contadora@despacho.mx / demo123");
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", padding: 20 }}>
      <div style={{ display: "flex", width: "100%", maxWidth: 900, background: COLORS.white, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 40px rgba(0,0,0,0.1)" }}>
        <div style={{ flex: 1, background: COLORS.primary, padding: "60px 48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ width: 48, height: 48, background: COLORS.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: "0 0 12px", fontFamily: "'Georgia', serif" }}>ContaDesk</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.6, margin: "0 0 40px" }}>Plataforma profesional para la gestión de clientes y procesos fiscales.</p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 32 }}>
            {["Gestión de clientes y RFC", "Control de declaraciones", "Recordatorios automáticos", "Dashboard en tiempo real"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="check" size={10} color="#fff" />
                </div>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: "60px 48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: COLORS.text, margin: "0 0 8px", fontFamily: "'Georgia', serif" }}>Iniciar sesión</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 36px" }}>Accede a tu panel de control</p>
          <FormField label="Correo electrónico" required>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.mx" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </FormField>
          <FormField label="Contraseña" required>
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </FormField>
          {error && <p style={{ color: COLORS.danger, fontSize: 13, margin: "-8px 0 16px", background: COLORS.dangerLight, padding: "10px 12px", borderRadius: 8 }}>{error}</p>}
          <button onClick={handleLogin} disabled={loading} style={{ ...btnPrimary, width: "100%", padding: "13px 20px", fontSize: 15, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Verificando..." : "Entrar"}
          </button>
          <p style={{ textAlign: "center", color: COLORS.textMuted, fontSize: 12, marginTop: 20 }}>Demo: contadora@despacho.mx · demo123</p>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive, user, onLogout }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "clients", label: "Clientes", icon: "clients" },
    { id: "processes", label: "Procesos", icon: "processes" },
    { id: "reminders", label: "Recordatorios", icon: "reminders" },
    { id: "history", label: "Historial", icon: "history" },
  ];
  return (
    <div style={{ width: 240, background: COLORS.primary, display: "flex", flexDirection: "column", minHeight: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "28px 24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: COLORS.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, fontFamily: "'Georgia', serif" }}>ContaDesk</span>
        </div>
      </div>
      <div style={{ padding: "8px 12px", flex: 1 }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", marginBottom: 2, borderRadius: 8, border: "none", cursor: "pointer", background: active === item.id ? "rgba(255,255,255,0.12)" : "none", color: active === item.id ? "#fff" : "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: active === item.id ? 500 : 400, transition: "all 0.15s", textAlign: "left" }}>
            <Icon name={item.icon} size={17} color={active === item.id ? "#fff" : "rgba(255,255,255,0.6)"} />
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 12px 20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ padding: "10px 12px", marginBottom: 8 }}>
          <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, margin: "0 0 2px" }}>{user.name}</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0 }}>{user.email}</p>
        </div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "none", color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
          <Icon name="logout" size={17} color="rgba(255,255,255,0.5)" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = COLORS.primary, sub }) {
  return (
    <div style={{ background: COLORS.white, borderRadius: 12, padding: "20px 22px", border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={20} color={color} />
      </div>
      <div>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: COLORS.textMuted }}>{label}</p>
        <p style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{sub}</p>}
      </div>
    </div>
  );
}

function DashboardView({ clients, processes }) {
  const now = new Date();
  const active = clients.filter(c => c.status === "activo").length;
  const overdue = processes.filter(p => p.status !== "completado" && new Date(p.dueDate) < now);
  const dueSoon = processes.filter(p => p.status !== "completado" && new Date(p.dueDate) >= now && new Date(p.dueDate) <= new Date(now.getTime() + 7 * 86400000));
  const inProcess = processes.filter(p => p.status === "en_proceso").length;

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const daysLeft = (d) => Math.ceil((new Date(d) - now) / 86400000);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.text, margin: "0 0 24px", fontFamily: "'Georgia', serif" }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
        <StatCard label="Clientes activos" value={active} icon="clients" color={COLORS.primary} />
        <StatCard label="En proceso" value={inProcess} icon="processes" color="#185FA5" />
        <StatCard label="Vencen pronto" value={dueSoon.length} icon="clock" color={COLORS.warning} sub="próximos 7 días" />
        <StatCard label="Atrasados" value={overdue.length} icon="alert" color={COLORS.danger} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alert" size={16} color={COLORS.danger} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.text }}>Procesos atrasados</h3>
          </div>
          <div>
            {overdue.length === 0 ? (
              <p style={{ padding: "20px", color: COLORS.textMuted, fontSize: 14, textAlign: "center" }}>Sin atrasos</p>
            ) : overdue.slice(0, 5).map(p => (
              <div key={p.id} style={{ padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500, color: COLORS.text }}>{p.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{clientMap[p.clientId]?.name}</p>
                </div>
                <span style={{ background: COLORS.dangerLight, color: COLORS.danger, fontSize: 12, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                  {Math.abs(daysLeft(p.dueDate))}d atraso
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="clock" size={16} color={COLORS.warning} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.text }}>Próximos vencimientos</h3>
          </div>
          <div>
            {dueSoon.length === 0 ? (
              <p style={{ padding: "20px", color: COLORS.textMuted, fontSize: 14, textAlign: "center" }}>Sin vencimientos próximos</p>
            ) : dueSoon.slice(0, 5).map(p => (
              <div key={p.id} style={{ padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500, color: COLORS.text }}>{p.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{clientMap[p.clientId]?.name}</p>
                </div>
                <span style={{ background: COLORS.warningLight, color: COLORS.warning, fontSize: 12, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                  {daysLeft(p.dueDate) === 0 ? "Hoy" : `${daysLeft(p.dueDate)}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsView({ clients, setClients, processes }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", rfc: "", email: "", phone: "", type: "fisica", status: "activo" });
  const [viewClient, setViewClient] = useState(null);

  const filtered = useMemo(() => clients.filter(c => {
    const q = search.toLowerCase();
    const matchQ = c.name.toLowerCase().includes(q) || c.rfc?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    const matchType = filterType === "all" || c.type === filterType;
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchQ && matchType && matchStatus;
  }), [clients, search, filterType, filterStatus]);

  const openAdd = () => { setEditing(null); setForm({ name: "", rfc: "", email: "", phone: "", type: "fisica", status: "activo" }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c.id); setForm({ ...c }); setShowModal(true); };
  const save = () => {
    if (!form.name || !form.email) return;
    if (editing) {
      setClients(prev => prev.map(c => c.id === editing ? { ...c, ...form } : c));
    } else {
      setClients(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setShowModal(false);
  };
  const remove = (id) => setClients(prev => prev.filter(c => c.id !== id));
  const clientProcesses = (id) => processes.filter(p => p.clientId === id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.text, margin: 0, fontFamily: "'Georgia', serif" }}>Clientes</h2>
        <button onClick={openAdd} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={15} color="#fff" /> Agregar cliente</button>
      </div>
      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, marginBottom: 20, padding: "14px 16px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200, background: COLORS.bg, borderRadius: 8, padding: "8px 12px" }}>
          <Icon name="search" size={15} color={COLORS.textMuted} />
          <input style={{ border: "none", background: "none", outline: "none", fontSize: 14, color: COLORS.text, width: "100%" }} placeholder="Buscar por nombre, RFC o correo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Todos los tipos</option>
          <option value="fisica">Persona física</option>
          <option value="moral">Persona moral</option>
        </select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: COLORS.bg }}>
              {["Cliente", "RFC", "Contacto", "Tipo", "Estado", "Procesos", "Acciones"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: COLORS.primary + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: COLORS.primary, flexShrink: 0 }}>
                      {c.name.split(" ").slice(0, 2).map(n => n[0]).join("")}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: COLORS.textMuted, fontFamily: "monospace" }}>{c.rfc || "—"}</td>
                <td style={{ padding: "14px 16px" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 13, color: COLORS.text }}>{c.email}</p>
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{c.phone}</p>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: c.type === "moral" ? "#E6F1FB" : COLORS.accentLight, color: c.type === "moral" ? "#185FA5" : "#0F6E56", fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>
                    {c.type === "fisica" ? "Física" : "Moral"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: c.status === "activo" ? COLORS.accentLight : COLORS.grayLight, color: c.status === "activo" ? "#0F6E56" : COLORS.gray, fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>
                    {c.status === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: COLORS.textMuted }}>{clientProcesses(c.id).length}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setViewClient(c)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: COLORS.textMuted }}><Icon name="user" size={14} /></button>
                    <button onClick={() => openEdit(c)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: COLORS.textMuted }}><Icon name="edit" size={14} /></button>
                    <button onClick={() => remove(c.id)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: COLORS.danger }}><Icon name="trash" size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: COLORS.textMuted, fontSize: 14 }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar cliente" : "Nuevo cliente"} onClose={() => setShowModal(false)}>
          <FormField label="Nombre completo" required>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo o razón social" />
          </FormField>
          <FormField label="RFC">
            <input style={{ ...inputStyle, fontFamily: "monospace" }} value={form.rfc} onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))} placeholder="RFC opcional" />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Correo electrónico" required>
              <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </FormField>
            <FormField label="Teléfono">
              <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Tipo de cliente">
              <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="fisica">Persona física</option>
                <option value="moral">Persona moral</option>
              </select>
            </FormField>
            <FormField label="Estado">
              <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </FormField>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setShowModal(false)} style={btnSecondary}>Cancelar</button>
            <button onClick={save} style={btnPrimary}>Guardar</button>
          </div>
        </Modal>
      )}

      {viewClient && (
        <Modal title="Perfil del cliente" onClose={() => setViewClient(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: COLORS.primary + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: COLORS.primary }}>
              {viewClient.name.split(" ").slice(0, 2).map(n => n[0]).join("")}
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.text }}>{viewClient.name}</p>
              <span style={{ background: viewClient.type === "moral" ? "#E6F1FB" : COLORS.accentLight, color: viewClient.type === "moral" ? "#185FA5" : "#0F6E56", fontSize: 12, padding: "2px 10px", borderRadius: 20 }}>
                {viewClient.type === "fisica" ? "Persona Física" : "Persona Moral"}
              </span>
            </div>
          </div>
          {[["RFC", viewClient.rfc || "No registrado"], ["Correo", viewClient.email], ["Teléfono", viewClient.phone], ["Estado", viewClient.status === "activo" ? "Activo" : "Inactivo"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>Procesos ({clientProcesses(viewClient.id).length})</p>
            {clientProcesses(viewClient.id).slice(0, 4).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 13, color: COLORS.text }}>{p.title}</span>
                <Badge status={p.status} />
              </div>
            ))}
            {clientProcesses(viewClient.id).length === 0 && <p style={{ fontSize: 13, color: COLORS.textMuted }}>Sin procesos registrados</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProcessesView({ processes, setProcesses, clients }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { clientId: clients[0]?.id || "", type: "declaracion_mensual", title: "", startDate: fmt(today), dueDate: "", status: "pendiente", notes: "", reminder: 3 };
  const [form, setForm] = useState(emptyForm);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const filtered = useMemo(() => processes.filter(p => {
    const q = search.toLowerCase();
    const client = clientMap[p.clientId];
    const matchQ = p.title.toLowerCase().includes(q) || client?.name.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchType = filterType === "all" || p.type === filterType;
    return matchQ && matchStatus && matchType;
  }), [processes, search, filterStatus, filterType, clientMap]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p) => { setEditing(p.id); setForm({ ...p }); setShowModal(true); };
  const save = () => {
    if (!form.title || !form.clientId || !form.dueDate) return;
    if (editing) {
      setProcesses(prev => prev.map(p => p.id === editing ? { ...p, ...form, clientId: Number(form.clientId) } : p));
    } else {
      setProcesses(prev => [...prev, { ...form, id: Date.now(), clientId: Number(form.clientId) }]);
    }
    setShowModal(false);
  };
  const remove = (id) => setProcesses(prev => prev.filter(p => p.id !== id));
  const updateStatus = (id, status) => setProcesses(prev => prev.map(p => p.id === id ? { ...p, status } : p));

  const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.text, margin: 0, fontFamily: "'Georgia', serif" }}>Procesos</h2>
        <button onClick={openAdd} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={15} color="#fff" /> Nuevo proceso</button>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, marginBottom: 20, padding: "14px 16px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200, background: COLORS.bg, borderRadius: 8, padding: "8px 12px" }}>
          <Icon name="search" size={15} color={COLORS.textMuted} />
          <input style={{ border: "none", background: "none", outline: "none", fontSize: 14, color: COLORS.text, width: "100%" }} placeholder="Buscar procesos o clientes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="completado">Completado</option>
        </select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Todos los tipos</option>
          {Object.entries(PROCESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        {filtered.map((p, i) => {
          const client = clientMap[p.clientId];
          const dl = daysLeft(p.dueDate);
          const isOverdue = dl < 0 && p.status !== "completado";
          return (
            <div key={p.id} style={{ padding: "16px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: COLORS.text }}>{p.title}</p>
                  {isOverdue && <span style={{ background: COLORS.dangerLight, color: COLORS.danger, fontSize: 11, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>ATRASADO</span>}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>{client?.name}</span>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>·</span>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>{PROCESS_TYPES[p.type]}</span>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>·</span>
                  <span style={{ fontSize: 13, color: isOverdue ? COLORS.danger : COLORS.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="calendar" size={12} color={isOverdue ? COLORS.danger : COLORS.textMuted} />
                    Vence: {p.dueDate} {p.status !== "completado" && dl >= 0 && dl <= 7 && <span style={{ color: COLORS.warning }}>({dl}d)</span>}
                  </span>
                </div>
                {p.notes && <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" }}>{p.notes}</p>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <Badge status={p.status} />
                <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)} style={{ ...inputStyle, width: "auto", fontSize: 13, padding: "6px 10px" }}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="completado">Completado</option>
                </select>
                <button onClick={() => openEdit(p)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: COLORS.textMuted }}><Icon name="edit" size={14} /></button>
                <button onClick={() => remove(p.id)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: COLORS.danger }}><Icon name="trash" size={14} /></button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p style={{ padding: "40px", textAlign: "center", color: COLORS.textMuted, fontSize: 14 }}>Sin procesos</p>}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar proceso" : "Nuevo proceso"} onClose={() => setShowModal(false)}>
          <FormField label="Cliente" required>
            <select style={inputStyle} value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Tipo de trámite">
            <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {Object.entries(PROCESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Descripción / Título" required>
            <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Declaración mensual IVA - Abril 2025" />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Fecha de inicio">
              <input style={inputStyle} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </FormField>
            <FormField label="Fecha límite" required>
              <input style={inputStyle} type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Estado">
              <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="completado">Completado</option>
              </select>
            </FormField>
            <FormField label="Recordatorio (días antes)">
              <input style={inputStyle} type="number" min="1" max="30" value={form.reminder} onChange={e => setForm(f => ({ ...f, reminder: Number(e.target.value) }))} />
            </FormField>
          </div>
          <FormField label="Notas adicionales">
            <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones o instrucciones..." />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setShowModal(false)} style={btnSecondary}>Cancelar</button>
            <button onClick={save} style={btnPrimary}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RemindersView({ processes, clients }) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const now = new Date();

  const upcoming = processes
    .filter(p => p.status !== "completado")
    .map(p => {
      const due = new Date(p.dueDate);
      const daysLeft = Math.ceil((due - now) / 86400000);
      const reminderDate = new Date(due);
      reminderDate.setDate(reminderDate.getDate() - (p.reminder || 3));
      return { ...p, daysLeft, reminderDate };
    })
    .filter(p => p.daysLeft >= -7 && p.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const [config, setConfig] = useState({ email: DEMO_USER.email, defaultDays: 3 });
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.text, margin: "0 0 24px", fontFamily: "'Georgia', serif" }}>Recordatorios</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div>
          <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.text }}>Próximos recordatorios</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.textMuted }}>Procesos que vencen en los próximos 30 días</p>
            </div>
            {upcoming.length === 0 ? (
              <p style={{ padding: "40px", textAlign: "center", color: COLORS.textMuted }}>Sin recordatorios próximos</p>
            ) : upcoming.map((p, i) => {
              const isOverdue = p.daysLeft < 0;
              const isUrgent = p.daysLeft >= 0 && p.daysLeft <= 3;
              const bg = isOverdue ? COLORS.dangerLight : isUrgent ? COLORS.warningLight : COLORS.white;
              return (
                <div key={p.id} style={{ padding: "14px 20px", borderBottom: i < upcoming.length - 1 ? `1px solid ${COLORS.border}` : "none", background: bg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: isOverdue ? COLORS.danger + "20" : isUrgent ? COLORS.warning + "20" : COLORS.primary + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name={isOverdue ? "alert" : "clock"} size={17} color={isOverdue ? COLORS.danger : isUrgent ? COLORS.warning : COLORS.primary} />
                    </div>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500, color: COLORS.text }}>{p.title}</p>
                      <p style={{ margin: "0 0 3px", fontSize: 12, color: COLORS.textMuted }}>{clientMap[p.clientId]?.name} · {PROCESS_TYPES[p.type]}</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Icon name="mail" size={12} color={COLORS.textMuted} />
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>Recordatorio: {p.reminderDate.toLocaleDateString("es-MX")} ({p.reminder || 3}d antes)</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: COLORS.textMuted }}>Vence: {p.dueDate}</p>
                    <span style={{ background: isOverdue ? COLORS.danger : isUrgent ? COLORS.warning : COLORS.primary, color: "#fff", fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>
                      {isOverdue ? `${Math.abs(p.daysLeft)}d atrasado` : p.daysLeft === 0 ? "Hoy" : `${p.daysLeft}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 24, height: "fit-content" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: COLORS.text }}>Configuración de correos</h3>
          <FormField label="Correo de notificaciones">
            <input style={inputStyle} type="email" value={config.email} onChange={e => setConfig(c => ({ ...c, email: e.target.value }))} />
          </FormField>
          <FormField label="Días de anticipación por defecto">
            <input style={inputStyle} type="number" min="1" max="30" value={config.defaultDays} onChange={e => setConfig(c => ({ ...c, defaultDays: Number(e.target.value) }))} />
          </FormField>
          <button onClick={save} style={{ ...btnPrimary, width: "100%" }}>{saved ? "✓ Guardado" : "Guardar configuración"}</button>
          <div style={{ marginTop: 16, padding: 12, background: COLORS.accentLight, borderRadius: 8 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: "#0F6E56" }}>Notificaciones activas</p>
            <p style={{ margin: 0, fontSize: 12, color: "#0F6E56" }}>Se enviarán recordatorios a <strong>{config.email}</strong> {config.defaultDays} días antes del vencimiento de cada proceso.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryView({ processes, clients }) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const sorted = [...processes]
    .filter(p => (filterClient === "all" || p.clientId === Number(filterClient)) && (filterStatus === "all" || p.status === filterStatus))
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.text, margin: "0 0 24px", fontFamily: "'Georgia', serif" }}>Historial</h2>
      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, marginBottom: 20, padding: "14px 16px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <select style={{ ...inputStyle, width: "auto" }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="all">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="completado">Completado</option>
        </select>
        <span style={{ fontSize: 13, color: COLORS.textMuted, display: "flex", alignItems: "center" }}>{sorted.length} registros</span>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: COLORS.bg }}>
              {["Proceso", "Cliente", "Tipo", "Inicio", "Vencimiento", "Estado", "Notas"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < sorted.length - 1 ? `1px solid ${COLORS.border}` : "none", background: p.status === "completado" ? "#fafaf8" : COLORS.white }}>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500, color: COLORS.text }}>{p.title}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textMuted }}>{clientMap[p.clientId]?.name || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textMuted }}>{PROCESS_TYPES[p.type]}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textMuted }}>{p.startDate}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textMuted }}>{p.dueDate}</td>
                <td style={{ padding: "12px 16px" }}><Badge status={p.status} /></td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textMuted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.notes || "—"}</td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: COLORS.textMuted }}>Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("dashboard");
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [processes, setProcesses] = useState(INITIAL_PROCESSES);

  if (!user) return <LoginScreen onLogin={setUser} />;

  const views = {
    dashboard: <DashboardView clients={clients} processes={processes} />,
    clients: <ClientsView clients={clients} setClients={setClients} processes={processes} />,
    processes: <ProcessesView processes={processes} setProcesses={setProcesses} clients={clients} />,
    reminders: <RemindersView processes={processes} clients={clients} />,
    history: <HistoryView processes={processes} clients={clients} />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: COLORS.bg }}>
      <Sidebar active={active} setActive={setActive} user={user} onLogout={() => setUser(null)} />
      <div style={{ flex: 1, padding: 36, overflow: "auto", maxWidth: "100%" }}>
        {views[active]}
      </div>
    </div>
  );
}
