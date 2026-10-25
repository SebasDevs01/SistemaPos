import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  Package, 
  Armchair, 
  Barcode, 
  BarChart3, 
  Users, 
  Sun, 
  Moon, 
  ShieldCheck, 
  UserCheck, 
  Keyboard, 
  Lock,
  ChevronDown,
  AlertTriangle,
  Bell,
  Zap,
  LogOut,
  UserCog,
  Settings,
  DollarSign,
  Clock,
  Wifi,
  WifiOff
} from "lucide-react";
import { getColombiaTimeInfo, isShiftOwner } from "../services/firestoreService";

export default function Header({ 
  currentTab, 
  setCurrentTab, 
  overdueRentalsCount, 
  pendingInsurancesCount = 0,
  outOfStockCount,
  onOpenStockAlerts,
  storeConfig, 
  onOpenStoreConfig,
  onOpenKeyboardModal,
  productsCount,
  theme,
  onToggleTheme,
  currentUser,
  onLogout,
  activeShift,
  onOpenCashRegister,
  isOnline = true,
  pendingOpsCount = 0,
  onCheckConnection
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [colombiaTime, setColombiaTime] = useState(() => getColombiaTimeInfo());

  useEffect(() => {
    const timer = setInterval(() => {
      setColombiaTime(getColombiaTimeInfo());
    }, 15000); // Actualiza cada 15 segundos
    return () => clearInterval(timer);
  }, []);

  const isAdmin = currentUser?.rol === "Administrador";


  const tabs = [
    { id: "pos",        label: "Caja POS",      icon: <ShoppingCart size={15} />, everyone: true },
    { id: "inventory",  label: "Inventario",     icon: <Package size={15} />,      adminOnly: true },
    { id: "rentals",    label: "Alquiler",       icon: <Armchair size={15} />,     everyone: true,  alert: overdueRentalsCount },
    { id: "insurances", label: "Seguros",        icon: <ShieldCheck size={15} />,  everyone: true,  badge: pendingInsurancesCount },
    { id: "barcodes",   label: "Stickers",       icon: <Barcode size={15} />,      everyone: true },
    { id: "sales",      label: "Ventas",         icon: <BarChart3 size={15} />,    everyone: true },
    { id: "clients",    label: "Clientes",       icon: <Users size={15} />,        everyone: true },
    { id: "users",      label: "Usuarios",       icon: <UserCog size={15} />,      adminOnly: true },
  ];

  return (
    <header className="app-header">
      {/* Barra de alerta de stock (aparece solo si hay productos agotados) */}
      {outOfStockCount > 0 && (
        <div className="alert-topbar" onClick={onOpenStockAlerts} role="button" tabIndex={0}>
          <AlertTriangle size={14} />
          <span>⚠️ {outOfStockCount} producto{outOfStockCount > 1 ? "s" : ""} sin stock — Haz clic para ver y reponer</span>
          <span style={{ opacity: 0.7, fontSize: "0.75rem" }}>Ver detalles →</span>
        </div>
      )}

      <div className="header-inner">
        {/* ── LOGO ── */}
        <div className="header-logo">
          <div className="logo-icon">🏪</div>
          <div className="logo-text">
            <h1>{storeConfig.nombre || "Miscelánea María José"}</h1>
            <div className="logo-meta">
              <span>NIT: {storeConfig.nit}</span>
              <span className="dot-sep">•</span>
              <span className="count-chip">{productsCount} productos</span>
              <span className="badge badge-indigo" style={{ fontSize: "0.6rem" }}>POS 2.0</span>
            </div>
          </div>
        </div>

        {/* ── NAVEGACIÓN ── */}
        <nav className="header-nav">
          {tabs.map(tab => {
            const locked = tab.adminOnly && !isAdmin;
            const isActive = currentTab === tab.id;
            const hasAlert = tab.alert > 0 || tab.badge > 0;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (locked) {
                    alert("🔒 Acceso Restringido: El inventario completo requiere permiso de Administrador.");
                    return;
                  }
                  setCurrentTab(tab.id);
                }}
                className={[
                  "nav-tab",
                  isActive ? "nav-tab--active" : "",
                  locked ? "nav-tab--locked" : "",
                  hasAlert && !isActive ? "nav-tab--alert pulse-alert" : ""
                ].filter(Boolean).join(" ")}
                title={locked ? "Solo Administrador" : tab.label}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {locked && <Lock size={11} className="nav-lock-icon" />}
                {tab.alert > 0 && (
                  <span className="nav-badge">{tab.alert}</span>
                )}
                {tab.badge > 0 && (
                  <span className="nav-badge" style={{ background: "var(--accent-teal, #0d9488)" }}>{tab.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── ACCIONES HEADER ── */}
        <div className="header-actions">
          {/* Alertas de stock (icono de campana si no está visible la barra) */}
          {outOfStockCount > 0 && (
            <button
              onClick={onOpenStockAlerts}
              className="btn btn-danger btn-sm pulse-alert"
              title={`${outOfStockCount} productos sin stock`}
              style={{ gap: "5px" }}
            >
              <Bell size={14} />
              <span>{outOfStockCount}</span>
            </button>
          )}

          {/* Botón Cuadre y Cierre de Caja con Horario Colombia (5:00 AM - 10:00 PM) */}
          {(() => {
            const isShiftOpen = Boolean(activeShift);
            const isPast10PM = colombiaTime.isPastClosing;
            const isNear10PM = colombiaTime.isNearClosing;
            const isPendingNightClose = isShiftOpen && isPast10PM;

            const isOwnedByOther = isShiftOpen && !isShiftOwner(activeShift, currentUser);

            let btnBorder = "rgba(245, 158, 11, 0.45)";
            let btnBg = "rgba(245, 158, 11, 0.08)";
            let btnColor = "#fbbf24";
            let dotColor = "#f59e0b";
            let btnText = "Abrir Caja";
            let btnTitle = "Caja Cerrada. Horario habitual: 5:00 AM a 10:00 PM (Hora Colombia). Clic para abrir turno.";

            if (isOwnedByOther) {
              btnBorder = "rgba(245, 158, 11, 0.65)";
              btnBg = "rgba(245, 158, 11, 0.14)";
              btnColor = "#fcd34d";
              dotColor = "#f59e0b";
              const shiftOwnerName = (!activeShift.cajero || activeShift.cajero === "Cajero") ? "Otra Sesión" : activeShift.cajero;
              btnText = `Caja en Uso (${shiftOwnerName})`;
              btnTitle = `Caja abierta en la sesión de ${shiftOwnerName}. Clic para ver información.`;
            } else if (isPendingNightClose) {
              btnBorder = "rgba(239, 68, 68, 0.75)";
              btnBg = "rgba(239, 68, 68, 0.18)";
              btnColor = "#fca5a5";
              dotColor = "#ef4444";
              btnText = "⚠️ Cierre 10:00 PM Pendiente";
              btnTitle = `¡Atención! Son las ${colombiaTime.timeFormatted} en Colombia. El horario de caja finaliza a las 10:00 PM. Por favor realiza el arqueo y cierre diario.`;
            } else if (isShiftOpen && isNear10PM) {
              btnBorder = "rgba(245, 158, 11, 0.75)";
              btnBg = "rgba(245, 158, 11, 0.18)";
              btnColor = "#fcd34d";
              dotColor = "#f59e0b";
              btnText = `Caja Abierta (${colombiaTime.minutesUntilClose}m para 10 PM)`;
              btnTitle = `Atención: Faltan ${colombiaTime.minutesUntilClose} minutos para las 10:00 PM (hora de cierre de caja).`;
            } else if (isShiftOpen) {
              btnBorder = "rgba(16, 185, 129, 0.45)";
              btnBg = "rgba(16, 185, 129, 0.08)";
              btnColor = "#34d399";
              dotColor = "#10b981";
              btnText = "Caja Abierta";
              btnTitle = `Caja abierta por ${activeShift.cajero}. Horario de atención: 5:00 AM a 10:00 PM (Hora Colombia). Clic para ver arqueo o registrar gastos.`;
            } else if (!colombiaTime.isOperatingHours) {
              btnBorder = "rgba(148, 163, 184, 0.3)";
              btnBg = "rgba(148, 163, 184, 0.06)";
              btnColor = "#94a3b8";
              dotColor = "#64748b";
              btnText = "Caja Cerrada (Abre 5 AM)";
              btnTitle = "Caja Cerrada. Horario oficial de caja: 5:00 AM a 10:00 PM (Hora Colombia).";
            }

            return (
              <button
                onClick={onOpenCashRegister}
                className={`btn btn-outline ${isPendingNightClose ? "pulse-alert" : ""}`}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.82rem",
                  borderRadius: "10px",
                  borderColor: btnBorder,
                  background: btnBg,
                  color: btnColor,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                title={btnTitle}
              >
                <DollarSign size={14} />
                <span style={{ fontWeight: 700 }}>
                  {btnText}
                </span>
                <span style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: dotColor,
                  display: "inline-block",
                  boxShadow: isShiftOpen ? `0 0 8px ${dotColor}` : "none"
                }} />
              </button>
            );
          })()}

          {/* Reloj Oficial Colombia con Indicador de Horario */}
          <div
            className="colombia-time-chip"
            title="Horario Oficial de Caja: 5:00 AM a 10:00 PM (Hora Colombia, UTC-5)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-color)",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 600,
              userSelect: "none"
            }}
          >
            <Clock size={12} color={colombiaTime.isOperatingHours ? "var(--neon-emerald, #34d399)" : "#94a3b8"} />
            <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{colombiaTime.timeShort}</span>
            <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>COL</span>
          </div>

          {/* ── BADGE DE CONEXIÓN A INTERNET (ONLINE / OFFLINE) ── */}
          <div
            className={`network-badge ${
              !isOnline 
                ? "network-badge--offline" 
                : (pendingOpsCount > 0 ? "network-badge--syncing" : "network-badge--online")
            }`}
            onClick={async () => {
              const currentStatus = onCheckConnection ? await onCheckConnection() : isOnline;
              if (!currentStatus) {
                alert(`📡 MODO SIN CONEXIÓN A INTERNET\n\nEl sistema POS está trabajando de manera autónoma en segundo plano.\nTodos los cobros y operaciones se guardan de forma segura en este equipo.\n${pendingOpsCount > 0 ? `Hay ${pendingOpsCount} cambio(s) pendiente(s) por subir a Firebase.` : "Tus datos locales están protegidos."}\n\nEn cuanto regrese el internet, los cambios se sincronizarán automáticamente con la nube.`);
              } else if (pendingOpsCount > 0) {
                alert(`🔄 SINCRONIZANDO CON LA NUBE\n\nHay ${pendingOpsCount} operación(es) sincronizándose en segundo plano con Firebase Firestore.`);
              } else {
                alert("🟢 CONEXIÓN A INTERNET ACTIVA\n\nEl sistema POS está conectado a Internet y sincronizado con Firebase Firestore en tiempo real.");
              }
            }}
            title={
              !isOnline 
                ? `Sin conexión a internet — Modo offline activo${pendingOpsCount > 0 ? ` (${pendingOpsCount} pendientes)` : ""}. Clic para más información.`
                : (pendingOpsCount > 0 
                    ? `Sincronizando ${pendingOpsCount} operaciones pendientes con Firebase...` 
                    : "Conexión a internet activa — Firebase sincronizado en tiempo real.")
            }
          >
            {isOnline ? (
              <Wifi size={13} />
            ) : (
              <WifiOff size={13} />
            )}
            <span>
              {!isOnline 
                ? (pendingOpsCount > 0 ? `Sin Red (${pendingOpsCount})` : "Sin Conexión")
                : (pendingOpsCount > 0 ? `Sincronizando (${pendingOpsCount})` : "En Línea")
              }
            </span>
            <span 
              className={`network-dot ${
                !isOnline 
                  ? "network-dot--offline" 
                  : (pendingOpsCount > 0 ? "network-dot--syncing" : "network-dot--online")
              }`} 
            />
          </div>

          {/* ── MENÚ DE USUARIO (SESIÓN SEGURA) ── */}
          <div className="user-dropdown" style={{ position: "relative" }}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`user-btn ${isAdmin ? "user-btn--admin" : "user-btn--staff"}`}
              title="Ver datos de la sesión activa"
            >
              {isAdmin
                ? <ShieldCheck size={15} color="var(--neon-indigo)" />
                : <UserCheck size={15} color="var(--neon-emerald)" />
              }
              <div>
                <div className="user-btn-name">{currentUser?.nombre || "Usuario"}</div>
                <div className="user-btn-role" style={{ color: isAdmin ? "var(--neon-indigo)" : "var(--neon-emerald)" }}>
                  {currentUser?.rol || "Asistente"}
                </div>
              </div>
              <ChevronDown 
                size={13} 
                color="var(--text-muted)" 
                style={{ 
                  transform: isUserMenuOpen ? "rotate(180deg)" : "none", 
                  transition: "transform 0.2s ease" 
                }} 
              />
            </button>

            {isUserMenuOpen && (
              <div className="user-menu" style={{ minWidth: "240px", padding: "12px" }}>
                {/* Cabecera de la Sesión Actual */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "10px", borderBottom: "1px solid var(--border-color)", marginBottom: "10px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: isAdmin ? "rgba(99, 102, 241, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    color: isAdmin ? "var(--neon-indigo, #818cf8)" : "var(--neon-emerald, #34d399)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {isAdmin ? <ShieldCheck size={20} /> : <UserCheck size={20} />}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-main)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                      {currentUser?.nombre}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <span className={isAdmin ? "badge badge-indigo" : "badge badge-green"} style={{ fontSize: "0.62rem" }}>
                        {currentUser?.rol || "Asistente"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "10px", padding: "0 4px", lineHeight: 1.4 }}>
                  {isAdmin 
                    ? "Permisos completos de administrador (Inventario, Usuarios, Finanzas y Cierres)."
                    : "Permisos de asistente (Facturación POS, Ventas y Alquileres)."
                  }
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {isAdmin && (
                    <button
                      type="button"
                      className="user-menu-item"
                      style={{ justifyContent: "flex-start", gap: "8px", color: "var(--text-main)" }}
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenStoreConfig && onOpenStoreConfig();
                      }}
                      title="Editar nombre, NIT, dirección, teléfono y encabezados del comercio"
                    >
                      <Settings size={15} color="var(--neon-indigo, #818cf8)" />
                      <span>Configuración del Comercio</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="user-menu-item"
                    style={{ justifyContent: "flex-start", gap: "8px", color: "var(--text-main)" }}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout && onLogout();
                    }}
                    title="Cierra esta sesión para que otro usuario ingrese con su PIN de seguridad"
                  >
                    <UserCog size={15} color="var(--accent-blue, #60a5fa)" />
                    <span>Cambiar de Usuario (PIN)</span>
                  </button>

                  <button
                    type="button"
                    className="user-menu-item"
                    style={{ justifyContent: "flex-start", gap: "8px", color: "var(--neon-rose, #f87171)" }}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout && onLogout();
                    }}
                  >
                    <LogOut size={15} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── TOGGLE TEMA ── */}
          <button
            onClick={onToggleTheme}
            className="btn btn-outline btn-icon"
            title={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          >
            {theme === "dark"
              ? <Sun size={16} color="#fbbf24" />
              : <Moon size={16} color="#818cf8" />
            }
          </button>

          {/* ── ATAJOS DE TECLADO ── */}
          <button
            onClick={onOpenKeyboardModal}
            className="btn btn-outline btn-icon"
            title="Atajos de Teclado"
            type="button"
          >
            <Keyboard size={16} />
          </button>

          {/* ── CONFIGURACIÓN DE LA TIENDA (TUERCA) ── */}
          <button
            onClick={onOpenStoreConfig}
            className="btn btn-outline btn-icon"
            title="Configuración de la Miscelánea (Nombre, Dirección, Teléfono, Facturación)"
            type="button"
          >
            <Settings size={16} color="var(--neon-indigo, #818cf8)" />
          </button>


        </div>
      </div>
    </header>
  );
}
