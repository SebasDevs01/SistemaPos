import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Pencil,
  Save,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Users,
  Monitor,
  Laptop,
  Smartphone,
  Wifi,
  WifiOff,
  LogOut,
  Check,
  AlertCircle
} from "lucide-react";
import {
  subscribeToDevices,
  updateDeviceName,
  disconnectDevice,
  getDeviceId
} from "../services/firestoreService";

const ROLES = ["Administrador", "Asistente"];

function getInitials(nombre) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("");
}

export default function UserManagementView({ users, onSaveUsers, currentUser }) {
  const [activeSubTab, setActiveSubTab] = useState("users"); // "users" | "devices"
  const [devices, setDevices] = useState([]);
  const [editingDevice, setEditingDevice] = useState(null); // deviceId
  const [editingDeviceName, setEditingDeviceName] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(null);

  const currentDeviceId = getDeviceId();

  useEffect(() => {
    const unsub = subscribeToDevices((list) => {
      setDevices(list);
    });
    return () => unsub && unsub();
  }, []);

  const [editing, setEditing] = useState(null); // null | user object (with id or without = new)
  const [showPass, setShowPass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const isNew = editing && !editing.id;

  const openNew = () => {
    setEditing({ nombre: "", correo: "", rol: "Asistente", pass: "" });
    setShowPass(false);
  };

  const openEdit = (user) => {
    setEditing({ ...user });
    setShowPass(false);
  };

  const closeEditor = () => {
    setEditing(null);
    setShowPass(false);
  };

  const handleSave = () => {
    if (!editing.nombre.trim()) return alert("El nombre es obligatorio.");
    if (!editing.pass || editing.pass.length < 4) return alert("El PIN debe tener al menos 4 dígitos.");

    let updated;
    if (isNew) {
      const newId = Math.max(0, ...users.map((u) => u.id || 0)) + 1;
      updated = [...users, { ...editing, id: newId }];
    } else {
      updated = users.map((u) => (u.id === editing.id ? editing : u));
    }
    onSaveUsers(updated);
    closeEditor();
  };

  const handleDelete = (userId) => {
    if (userId === currentUser?.id) {
      return alert("No puedes eliminar tu propio usuario activo.");
    }
    const updated = users.filter((u) => u.id !== userId);
    onSaveUsers(updated, userId);
    setConfirmDelete(null);
  };

  const now = Date.now();
  const onlineDevicesCount = devices.filter(d => {
    if (!d.ultimoLatido) return false;
    const diff = (now - new Date(d.ultimoLatido).getTime()) / 1000;
    return diff < 75 && d.online !== false;
  }).length;

  const handleStartRename = (dev) => {
    setEditingDevice(dev.id);
    setEditingDeviceName(dev.nombreDispositivo || "");
  };

  const handleSaveRename = async (deviceId) => {
    if (!editingDeviceName.trim()) return;
    await updateDeviceName(deviceId, editingDeviceName.trim());
    setEditingDevice(null);
  };

  const handleConfirmDisconnect = async () => {
    if (!confirmDisconnect) return;
    await disconnectDevice(confirmDisconnect.id);
    setConfirmDisconnect(null);
  };

  return (
    <div className="users-view">
      {/* Cabecera Principal */}
      <div className="users-header">
        <div>
          <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={22} color="var(--accent)" />
            Control de Usuarios y Dispositivos
          </h2>
          <p className="section-subtitle">
            Monitorea terminales conectadas en vivo y gestiona los accesos del personal
          </p>
        </div>
        {activeSubTab === "users" && (
          <button className="btn btn-primary" onClick={openNew}>
            <UserPlus size={15} />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Selector de Pestañas Superiores */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "22px", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveSubTab("users")}
          className={`btn ${activeSubTab === "users" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "8px 18px", borderRadius: "12px", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Users size={16} />
          <span>Usuarios y PINs ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("devices")}
          className={`btn ${activeSubTab === "devices" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "8px 18px", borderRadius: "12px", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Monitor size={16} />
          <span>Dispositivos Conectados</span>
          <span style={{
            background: onlineDevicesCount > 0 ? "rgba(16, 185, 129, 0.25)" : "rgba(148, 163, 184, 0.2)",
            color: onlineDevicesCount > 0 ? "#10b981" : "var(--text-muted)",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: 800
          }}>
            {onlineDevicesCount} en línea
          </span>
        </button>
      </div>

      {/* ── PESTAÑA 1: GESTIÓN DE USUARIOS ── */}
      {activeSubTab === "users" && (
        <div className="users-grid">
          {users.map((user) => {
            const isAdmin = user.rol === "Administrador";
            const isSelf = user.id === currentUser?.id;
            return (
              <div
                key={user.id}
                className={`user-card ${isAdmin ? "user-card--admin" : "user-card--staff"} ${isSelf ? "user-card--self" : ""}`}
              >
                {isSelf && (
                  <div className="user-card-self-badge">Tú</div>
                )}
                <div className="user-card-avatar">
                  <span>{getInitials(user.nombre)}</span>
                </div>
                <div className="user-card-body">
                  <div className="user-card-name">{user.nombre}</div>
                  <div className="user-card-correo">{user.correo || "—"}</div>
                  <span className={`badge ${isAdmin ? "badge-indigo" : "badge-green"}`} style={{ fontSize: "0.65rem" }}>
                    {isAdmin ? <ShieldCheck size={10} style={{ marginRight: 3 }} /> : <UserCheck size={10} style={{ marginRight: 3 }} />}
                    {user.rol}
                  </span>
                </div>
                <div className="user-card-actions">
                  <button
                    className="btn btn-outline btn-icon btn-sm"
                    title="Editar usuario"
                    onClick={() => openEdit(user)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    title={isSelf ? "No puedes eliminarte" : "Eliminar usuario"}
                    disabled={isSelf}
                    onClick={() => setConfirmDelete(user)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PESTAÑA 2: DISPOSITIVOS CONECTADOS EN VIVO ── */}
      {activeSubTab === "devices" && (
        <div>
          <div style={{
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            borderRadius: "14px",
            padding: "12px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Wifi size={18} color="var(--neon-blue)" />
              <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                Aquí ves todas las computadoras, portátiles o celulares que tienen el sistema POS abierto en la miscelánea o remotamente.
              </span>
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Actualización en tiempo real cada 25s
            </span>
          </div>

          {devices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <Monitor size={36} style={{ opacity: 0.4, margin: "0 auto 12px" }} />
              <p>No se encontraron terminales registradas aún. Al abrir el sistema se registrarán aquí.</p>
            </div>
          ) : (
            <div className="users-grid">
              {devices.map((dev) => {
                const diffSec = dev.ultimoLatido ? (now - new Date(dev.ultimoLatido).getTime()) / 1000 : 9999;
                const isLive = diffSec < 75 && dev.online !== false;
                const isThisDevice = dev.id === currentDeviceId;
                const isMobile = String(dev.sistemaOperativo || "").toLowerCase().includes("móvil") || String(dev.sistemaOperativo || "").toLowerCase().includes("android") || String(dev.sistemaOperativo || "").toLowerCase().includes("ios");

                return (
                  <div
                    key={dev.id}
                    className="user-card"
                    style={{
                      border: isLive ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-color)",
                      background: isLive ? "rgba(16, 185, 129, 0.03)" : "var(--bg-glass)",
                      position: "relative"
                    }}
                  >
                    {isThisDevice && (
                      <div className="user-card-self-badge" style={{ background: "var(--accent-blue)" }}>
                        ⭐ Este Equipo
                      </div>
                    )}

                    {/* Icono del tipo de dispositivo */}
                    <div className="user-card-avatar" style={{
                      background: isLive ? "rgba(16, 185, 129, 0.18)" : "rgba(148, 163, 184, 0.12)",
                      color: isLive ? "#10b981" : "var(--text-muted)"
                    }}>
                      {isMobile ? <Smartphone size={22} /> : <Laptop size={22} />}
                    </div>

                    <div className="user-card-body" style={{ flex: 1 }}>
                      {/* Estado En Línea / Desconectado */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: isLive ? "#10b981" : "#64748b",
                          display: "inline-block",
                          boxShadow: isLive ? "0 0 8px #10b981" : "none"
                        }} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isLive ? "#10b981" : "#94a3b8" }}>
                          {isLive ? "🟢 Conectado en vivo" : "⚪ Desconectado"}
                        </span>
                      </div>

                      {/* Nombre editable del dispositivo */}
                      {editingDevice === dev.id ? (
                        <div style={{ display: "flex", gap: "6px", marginTop: "4px", marginBottom: "6px" }}>
                          <input
                            type="text"
                            className="input-field"
                            value={editingDeviceName}
                            onChange={(e) => setEditingDeviceName(e.target.value)}
                            style={{ padding: "4px 8px", fontSize: "0.85rem", height: "32px" }}
                            autoFocus
                          />
                          <button
                            className="btn btn-primary"
                            style={{ padding: "0 8px", height: "32px" }}
                            onClick={() => handleSaveRename(dev.id)}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: "0 8px", height: "32px" }}
                            onClick={() => setEditingDevice(null)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div className="user-card-name" style={{ fontSize: "0.95rem" }}>
                            {dev.nombreDispositivo || "Dispositivo POS"}
                          </div>
                          <button
                            onClick={() => handleStartRename(dev)}
                            className="btn btn-outline btn-icon btn-sm"
                            style={{ border: "none", padding: "2px", opacity: 0.6 }}
                            title="Renombrar este dispositivo"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}

                      {/* Datos del usuario activo en esa terminal */}
                      <div style={{ fontSize: "0.8rem", color: "var(--text-main)", marginTop: "4px" }}>
                        👤 Usuario: <strong>{dev.usuarioNombre || "Sin usuario"}</strong> ({dev.usuarioRol || "Asistente"})
                      </div>

                      {/* Sistema y Navegador */}
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        🖥️ {dev.sistemaOperativo || "PC"} · {dev.navegador || "Navegador"}
                      </div>

                      {/* Último latido */}
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        🕒 Última señal: {dev.ultimoLatido ? new Date(dev.ultimoLatido).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "—"}
                      </div>
                    </div>

                    {/* Acciones: Cerrar sesión remota */}
                    <div className="user-card-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: "5px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                        title="Desconectar y cerrar sesión de este dispositivo"
                        onClick={() => setConfirmDisconnect(dev)}
                      >
                        <LogOut size={13} />
                        <span>Desconectar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmación de desconexión remota */}
      {confirmDisconnect && (
        <div className="modal-overlay" onClick={() => setConfirmDisconnect(null)}>
          <div
            className="modal-card modal-box"
            style={{
              maxWidth: 420,
              width: "92%",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              padding: "20px",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px"
            }}>
              <LogOut size={24} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "6px" }}>
              ¿Desconectar terminal?
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "18px" }}>
              Se enviará una orden de cierre de sesión inmediata a <strong>"{confirmDisconnect.nombreDispositivo || confirmDisconnect.id}"</strong>. El usuario en esa máquina tendrá que iniciar sesión nuevamente.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button className="btn btn-outline" onClick={() => setConfirmDisconnect(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDisconnect}>
                Confirmar Desconexión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editing && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div
            className="modal-card modal-box"
            style={{
              maxWidth: 440,
              width: "92%",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              boxShadow: "0 25px 65px -10px rgba(0, 0, 0, 0.8)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: "16px 20px",
                background: "var(--bg-tertiary)",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <h3 className="modal-title" style={{ margin: 0 }}>
                {isNew ? <><UserPlus size={16} /> Nuevo Usuario</> : <><Pencil size={16} /> Editar Usuario</>}
              </h3>
              <button className="modal-close" onClick={closeEditor}><X size={18} /></button>
            </div>

            <div
              className="modal-body"
              style={{
                padding: "20px",
                background: "var(--bg-secondary)",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              {/* Nombre */}
              <label className="form-label">
                <span>Nombre completo *</span>
                <input
                  className="form-input"
                  value={editing.nombre}
                  onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                  placeholder="Ej: María José"
                />
              </label>

              {/* Correo / Usuario */}
              <label className="form-label">
                <span>Correo / Identificador</span>
                <input
                  className="form-input"
                  value={editing.correo}
                  onChange={(e) => setEditing({ ...editing, correo: e.target.value })}
                  placeholder="Ej: diana@correo.com"
                />
              </label>

              {/* Rol */}
              <label className="form-label">
                <span>Rol *</span>
                <select
                  className="form-select"
                  value={editing.rol}
                  onChange={(e) => setEditing({ ...editing, rol: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>

              {/* PIN */}
              <label className="form-label">
                <span>PIN de acceso (numérico, mín. 4 dígitos) *</span>
                <div style={{ position: "relative" }}>
                  <input
                    className="form-input"
                    type={showPass ? "text" : "password"}
                    value={editing.pass}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      setEditing({ ...editing, pass: v });
                    }}
                    placeholder="••••"
                    inputMode="numeric"
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: "absolute", right: "10px", top: "50%",
                      transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer", color: "var(--text-muted)"
                    }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  <KeyRound size={11} style={{ verticalAlign: "middle" }} /> Solo números, entre 4 y 8 dígitos
                </span>
              </label>

              {/* Rol description */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: editing.rol === "Administrador" ? "rgba(129,140,248,0.08)" : "rgba(52,211,153,0.08)",
                  border: `1px solid ${editing.rol === "Administrador" ? "rgba(129,140,248,0.2)" : "rgba(52,211,153,0.2)"}`,
                  fontSize: "0.75rem",
                  color: "var(--text-muted)"
                }}
              >
                {editing.rol === "Administrador"
                  ? "🛡️ Administrador: Acceso total — inventario, BD, gestión de usuarios."
                  : "👤 Asistente: Solo POS, sillas, stickers, ventas y clientes."
                }
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                padding: "14px 20px",
                background: "var(--bg-tertiary)",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}
            >
              <button className="btn btn-outline" onClick={closeEditor}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={14} />
                {isNew ? "Crear usuario" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="modal-card modal-box"
            style={{
              maxWidth: 380,
              width: "92%",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              boxShadow: "0 25px 65px -10px rgba(0, 0, 0, 0.8)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: "16px 20px",
                background: "var(--bg-tertiary)",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <h3 className="modal-title" style={{ color: "var(--danger)", margin: 0 }}>
                <Trash2 size={16} /> Eliminar usuario
              </h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <div
              className="modal-body"
              style={{
                padding: "20px",
                background: "var(--bg-secondary)"
              }}
            >
              <p style={{ color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                ¿Estás seguro de que deseas eliminar a{" "}
                <strong style={{ color: "var(--text-primary)" }}>{confirmDelete.nombre}</strong>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div
              className="modal-footer"
              style={{
                padding: "14px 20px",
                background: "var(--bg-tertiary)",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}
            >
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>
                <Trash2 size={13} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
