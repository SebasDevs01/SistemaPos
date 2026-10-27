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
  AlertCircle,
  Globe,
  MapPin,
  RotateCw,
  Lock,
  Unlock,
  Crown
} from "lucide-react";
import {
  subscribeToDevices,
  updateDeviceName,
  disconnectDevice,
  cleanupOldDisconnectedDevices,
  getDeviceId
} from "../services/firestoreService";
import { isUserSebastian } from "../utils/userUtils";

const ROLES = ["Administrador", "Asistente"];

function getInitials(nombre) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("");
}

export default function UserManagementView({ users, onSaveUsers, currentUser, onBlockUser }) {
  const [activeSubTab, setActiveSubTab] = useState("users"); // "users" | "devices"
  const [devices, setDevices] = useState([]);
  const [editingDevice, setEditingDevice] = useState(null); // deviceId
  const [editingDeviceName, setEditingDeviceName] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(null);
  const [isCleaningDevices, setIsCleaningDevices] = useState(false);

  const currentDeviceId = getDeviceId();

  useEffect(() => {
    cleanupOldDisconnectedDevices();
    const unsub = subscribeToDevices((list) => {
      setDevices(list);
    });
    return () => unsub && unsub();
  }, []);

  const handleManualCleanup = async () => {
    try {
      setIsCleaningDevices(true);
      await cleanupOldDisconnectedDevices();
    } catch (_) {
    } finally {
      setIsCleaningDevices(false);
    }
  };

  const [editing, setEditing] = useState(null); // null | user object (with id or without = new)
  const [showPass, setShowPass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBlock, setConfirmBlock] = useState(null); // null | user object
  const [isBlocking, setIsBlocking] = useState(false);

  // Solo el administrador con nombre "Sebastian" (o con tilde "Sebastián") puede bloquear usuarios
  const isSebastian = isUserSebastian(currentUser);

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

    // Proteger contra modificación del Super Admin por parte de otros administradores
    if (!isNew && !isSebastian) {
      const existingUser = users.find((u) => u.id === editing.id);
      if (existingUser && isUserSebastian(existingUser)) {
        return alert("⛔ Acción denegada: Solo Sebastian puede modificar los datos de su propia cuenta de Super Administrador.");
      }
    }

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
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser && isUserSebastian(targetUser)) {
      return alert("⛔ Acción denegada: El Super Administrador (Sebastian) es el propietario del sistema y no puede ser eliminado por ningún usuario.");
    }
    const updated = users.filter((u) => u.id !== userId);
    onSaveUsers(updated, userId);
    setConfirmDelete(null);
  };

  // ── Handler de bloqueo / desbloqueo (exclusivo Sebastian) ──
  const handleConfirmBlock = async () => {
    if (!confirmBlock || !onBlockUser) return;
    if (confirmBlock.id === currentUser?.id) {
      alert("No puedes bloquearte a ti mismo.");
      setConfirmBlock(null);
      return;
    }
    try {
      setIsBlocking(true);
      const nuevoEstado = !confirmBlock.bloqueado;
      await onBlockUser(confirmBlock.id, nuevoEstado);
    } catch (err) {
      console.warn("Error al cambiar estado de bloqueo:", err);
    } finally {
      setIsBlocking(false);
      setConfirmBlock(null);
    }
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
            background: onlineDevicesCount > 0 ? "#10b981" : "rgba(148, 163, 184, 0.25)",
            color: "#ffffff",
            padding: "3px 9px",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: 800,
            boxShadow: onlineDevicesCount > 0 ? "0 2px 8px rgba(16, 185, 129, 0.45)" : "none"
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
            const isBloqueado = user.bloqueado === true;
            const isTargetSuperAdmin = isUserSebastian(user);
            return (
              <div
                key={user.id}
                className={`user-card ${isAdmin ? "user-card--admin" : "user-card--staff"} ${isSelf ? "user-card--self" : ""}`}
                style={isBloqueado ? { opacity: 0.65, border: "1.5px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.04)" } : {}}
              >
                {isSelf && (
                  <div className="user-card-self-badge">Tú</div>
                )}
                {/* Badge de bloqueado */}
                {isBloqueado && (
                  <div style={{
                    position: "absolute", top: "10px", left: "10px",
                    background: "rgba(239,68,68,0.15)", color: "#ef4444",
                    fontSize: "0.62rem", fontWeight: 800,
                    padding: "3px 8px", borderRadius: "20px",
                    display: "flex", alignItems: "center", gap: "4px",
                    border: "1px solid rgba(239,68,68,0.3)"
                  }}>
                    <Lock size={9} /> Bloqueado
                  </div>
                )}
                <div className="user-card-avatar" style={isBloqueado ? { filter: "grayscale(70%)" } : {}}>
                  <span>{getInitials(user.nombre)}</span>
                </div>
                <div className="user-card-body">
                  <div className="user-card-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{user.nombre}</span>
                    {isTargetSuperAdmin && <Crown size={14} color="#f59e0b" title="Super Administrador / Propietario" />}
                  </div>
                  <div className="user-card-correo">{user.correo || "—"}</div>
                  {isTargetSuperAdmin ? (
                    <span className="badge" style={{ fontSize: "0.65rem", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", fontWeight: 700, border: "none" }}>
                      <Crown size={10} style={{ marginRight: 3 }} />
                      Super Admin
                    </span>
                  ) : (
                    <span className={`badge ${isAdmin ? "badge-indigo" : "badge-green"}`} style={{ fontSize: "0.65rem" }}>
                      {isAdmin ? <ShieldCheck size={10} style={{ marginRight: 3 }} /> : <UserCheck size={10} style={{ marginRight: 3 }} />}
                      {user.rol}
                    </span>
                  )}
                </div>
                <div className="user-card-actions">
                  <button
                    className="btn btn-outline btn-icon btn-sm"
                    title={!isSelf && isTargetSuperAdmin && !isSebastian ? "Solo el Super Admin puede editar su propia cuenta" : "Editar usuario"}
                    disabled={!isSelf && isTargetSuperAdmin && !isSebastian}
                    onClick={() => openEdit(user)}
                    style={!isSelf && isTargetSuperAdmin && !isSebastian ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                  >
                    <Pencil size={13} />
                  </button>
                  {/* Botón de bloqueo — EXCLUSIVO para Sebastian (nunca se puede bloquear a Sebastian) */}
                  {isSebastian && !isSelf && !isTargetSuperAdmin && (
                    <button
                      className="btn btn-icon btn-sm"
                      title={isBloqueado ? "Desbloquear acceso de este usuario" : "Bloquear acceso de este usuario"}
                      onClick={() => setConfirmBlock(user)}
                      style={{
                        background: isBloqueado ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
                        border: `1px solid ${isBloqueado ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
                        color: isBloqueado ? "#10b981" : "#ef4444",
                        borderRadius: "8px",
                        padding: "5px 7px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {isBloqueado ? <Unlock size={13} /> : <Lock size={13} />}
                    </button>
                  )}
                  {/* Botón de eliminación — Deshabilitado e intocable para el Super Admin */}
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    title={
                      isSelf
                        ? "No puedes eliminarte"
                        : isTargetSuperAdmin
                        ? "El Super Administrador no puede ser eliminado por nadie"
                        : "Eliminar usuario"
                    }
                    disabled={isSelf || isTargetSuperAdmin}
                    onClick={() => {
                      if (isTargetSuperAdmin) {
                        alert("⛔ Acción denegada: El Super Administrador (Sebastian) no puede ser eliminado.");
                        return;
                      }
                      setConfirmDelete(user);
                    }}
                    style={isTargetSuperAdmin ? { opacity: 0.3, cursor: "not-allowed" } : {}}
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
                Aquí ves todas las terminales conectadas con rastreo de IP, ubicación en tiempo real y marca de equipo.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                Auto-limpieza cada 15m
              </span>
              <button
                type="button"
                onClick={handleManualCleanup}
                className="btn btn-outline btn-sm"
                style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}
                title="Eliminar de la lista los equipos que llevan más de 15 minutos desconectados"
                disabled={isCleaningDevices}
              >
                <Trash2 size={12} />
                <span>{isCleaningDevices ? "Limpiando..." : "Limpiar Desconectados"}</span>
              </button>
            </div>
          </div>

          {devices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <Monitor size={36} style={{ opacity: 0.4, margin: "0 auto 12px" }} />
              <p>No se encontraron terminales registradas aún. Al abrir el sistema se registrarán aquí.</p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "16px"
            }}>
              {devices.map((dev) => {
                const diffSec = dev.ultimoLatido ? (now - new Date(dev.ultimoLatido).getTime()) / 1000 : 9999;
                const isLive = diffSec < 75 && dev.online !== false;
                const isThisDevice = dev.id === currentDeviceId;
                const isMobile = String(dev.sistemaOperativo || "").toLowerCase().includes("móvil") || String(dev.sistemaOperativo || "").toLowerCase().includes("android") || String(dev.sistemaOperativo || "").toLowerCase().includes("ios");

                return (
                  <div
                    key={dev.id}
                    style={{
                      border: isLive ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-color)",
                      background: isLive ? "rgba(16, 185, 129, 0.03)" : "var(--bg-glass)",
                      borderRadius: "18px",
                      padding: "16px",
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      minWidth: 0
                    }}
                  >
                    {/* Badge Este Equipo */}
                    {isThisDevice && (
                      <div style={{
                        position: "absolute", top: "10px", right: "10px",
                        background: "var(--accent-blue, #3b82f6)", color: "#fff",
                        fontSize: "0.68rem", fontWeight: 800,
                        padding: "3px 9px", borderRadius: "20px"
                      }}>
                        ⭐ Este Equipo
                      </div>
                    )}

                    {/* Cabecera: icono + estado + nombre */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "12px",
                        background: isLive ? "rgba(16, 185, 129, 0.18)" : "rgba(148, 163, 184, 0.12)",
                        color: isLive ? "#10b981" : "var(--text-muted)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0
                      }}>
                        {isMobile ? <Smartphone size={22} /> : <Laptop size={22} />}
                      </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
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

                      {/* Marca / Tipo */}
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "3px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.74rem", color: "var(--neon-purple, #c084fc)", fontWeight: 700 }}>
                          📱 {dev.marca ? `${dev.marca}${dev.modelo && dev.modelo !== dev.marca ? ` (${dev.modelo})` : ""}` : (dev.sistemaOperativo || "Terminal")}
                        </span>
                        {dev.tipoDispositivo && (
                          <span className="badge badge-indigo" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                            {dev.tipoDispositivo}
                          </span>
                        )}
                      </div>
                    </div>{/* end flex-col header body */}
                    </div>{/* end flex-row header */}

                    {/* Bloque de detalles */}
                    <div style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      display: "flex", flexDirection: "column", gap: "6px"
                    }}>
                      {/* IP + ISP */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "0.75rem", color: "var(--text-main)" }}>
                        <Globe size={13} color="var(--accent-blue, #60a5fa)" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ minWidth: 0 }}>
                          <span>IP: <strong style={{ wordBreak: "break-all" }}>{dev.ip || "Detectando..."}</strong></span>
                          {dev.isp && dev.isp !== "—" && (
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "1px", wordBreak: "break-word" }}>
                              {dev.isp
                                .replace(/COLOMBIA TELECOMUNICACIONES S\.A\. ESP BIC/i, "Movistar")
                                .replace(/COMUNICACION CELULAR S\.A\. COMCEL S\.A\./i, "Claro Móvil")
                                .replace(/COLOMBIA TELECOMUNICACIONES S\.A\./i, "Movistar")
                                .replace(/TELMEX COLOMBIA S\.A\./i, "Telmex Colombia")
                                .replace(/ETB - EMPRESA DE TELECOMUNICACIONES DE BOGOTA/i, "ETB")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ubicación */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <MapPin size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span style={{ wordBreak: "break-word" }}>
                          {[dev.ciudad && dev.ciudad !== "—" ? dev.ciudad : null,
                            dev.departamento && dev.departamento !== "—" ? dev.departamento.replace(/^Departamento de\s+/i, "") : null,
                            dev.pais || "Colombia"
                          ].filter(Boolean).join(", ")} 🇨🇴
                        </span>
                      </div>

                      {/* Usuario */}
                      <div style={{ fontSize: "0.75rem", color: "var(--text-main)" }}>
                        👤 Usuario: <strong>{dev.usuarioNombre || "Sin usuario"}</strong>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}> ({dev.usuarioRol || "Asistente"})</span>
                      </div>

                      {/* OS · Navegador · Resolución */}
                      <div style={{ fontSize: "0.71rem", color: "var(--text-muted)", wordBreak: "break-word" }}>
                        🖥️ {dev.sistemaOperativo || "PC"} · {dev.navegador || "Navegador"}{dev.resolucionPantalla ? ` · ${dev.resolucionPantalla}` : ""}
                      </div>

                      {/* Última señal */}
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        🕒 Última señal: {dev.ultimoLatido ? new Date(dev.ultimoLatido).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "—"}
                      </div>
                    </div>

                    {/* Footer: desconectar */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: "6px 14px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}
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

      {/* Editor Modal — Liquid Glass Premium */}
      {editing && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div
            className="modal-card"
            style={{
              maxWidth: 480,
              width: "96%",
              borderRadius: "28px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              maxHeight: "92vh"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Liquid Glass */}
            <div className="ticket-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  className="ticket-icon-box"
                  style={{
                    background: isNew ? "rgba(168, 85, 247, 0.18)" : "rgba(59, 130, 246, 0.18)",
                    border: `1px solid ${isNew ? "rgba(168, 85, 247, 0.38)" : "rgba(59, 130, 246, 0.38)"}`,
                    color: isNew ? "#c084fc" : "#60a5fa"
                  }}
                >
                  {isNew ? <UserPlus size={22} /> : <Pencil size={22} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
                    {isNew ? "Nuevo Usuario" : "Editar Usuario"}
                  </h3>
                  <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    {isNew ? "Permisos, PIN y rol de acceso" : `Editando: ${editing.nombre || "Usuario"}`}
                  </span>
                </div>
              </div>
              <button className="btn-modal-close-circle" onClick={closeEditor} title="Cerrar modal">
                <X size={16} />
              </button>
            </div>

            {/* Body con Scroll */}
            <div
              style={{
                padding: "20px",
                overflowY: "auto",
                flex: "1 1 auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
            >
              {/* Nombre */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "14px 16px", border: "1px solid rgba(216,180,254,0.13)", display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Nombre completo *</label>
                <input
                  className="form-input"
                  value={editing.nombre}
                  onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                  placeholder="Ej: María José"
                  style={{ margin: 0 }}
                />
              </div>

              {/* Correo */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "14px 16px", border: "1px solid rgba(216,180,254,0.13)", display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Correo / Identificador</label>
                <input
                  className="form-input"
                  value={editing.correo}
                  onChange={(e) => setEditing({ ...editing, correo: e.target.value })}
                  placeholder="Ej: diana@correo.com"
                  style={{ margin: 0 }}
                />
              </div>

              {/* Rol */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "14px 16px", border: "1px solid rgba(216,180,254,0.13)", display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Rol *</label>
                <select
                  className="form-select"
                  value={editing.rol}
                  onChange={(e) => setEditing({ ...editing, rol: e.target.value })}
                  style={{ margin: 0 }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: editing.rol === "Administrador" ? "rgba(129,140,248,0.10)" : "rgba(52,211,153,0.10)",
                    border: `1px solid ${editing.rol === "Administrador" ? "rgba(129,140,248,0.22)" : "rgba(52,211,153,0.22)"}`,
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

              {/* PIN */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "14px 16px", border: "1px solid rgba(216,180,254,0.13)", display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: "6px" }}>
                  <KeyRound size={13} /> PIN de acceso (mín. 4 dígitos) *
                </label>
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
                    style={{ paddingRight: "44px", margin: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Solo números, entre 4 y 8 dígitos</span>
              </div>
            </div>

            {/* Footer Liquid Glass */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid rgba(216, 180, 254, 0.14)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                flexShrink: 0
              }}
            >
              <button className="btn btn-modal-cancel" onClick={closeEditor} style={{ padding: "10px 20px", borderRadius: "14px" }}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                style={{ padding: "10px 24px", borderRadius: "14px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Save size={16} />
                <span>{isNew ? "Crear usuario" : "Guardar cambios"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal Liquid Glass */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="modal-card modal-box"
            style={{
              maxWidth: 400,
              width: "92%",
              borderRadius: "24px",
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
                background: "transparent",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.16)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Trash2 size={18} />
                </div>
                <h3 className="modal-title" style={{ color: "#f87171", margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                  Eliminar usuario
                </h3>
              </div>
              <button className="btn-modal-close-circle" onClick={() => setConfirmDelete(null)} title="Cerrar modal">
                <X size={16} />
              </button>
            </div>
            <div
              className="modal-body"
              style={{
                padding: "20px",
                background: "transparent"
              }}
            >
              <p style={{ color: "var(--text-muted)", lineHeight: 1.6, margin: 0, fontSize: "0.88rem" }}>
                ¿Estás seguro de que deseas eliminar a{" "}
                <strong style={{ color: "var(--text-main)" }}>{confirmDelete.nombre}</strong>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div
              className="modal-footer"
              style={{
                padding: "14px 20px",
                background: "transparent",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}
            >
              <button className="btn btn-modal-cancel" onClick={() => setConfirmDelete(null)} style={{ padding: "8px 18px", borderRadius: "10px" }}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)} style={{ padding: "8px 20px", borderRadius: "10px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <Trash2 size={14} />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación de Bloqueo / Desbloqueo (Exclusivo Sebastian) ── */}
      {confirmBlock && (
        <div className="modal-overlay" onClick={() => setConfirmBlock(null)}>
          <div
            className="modal-card modal-box"
            style={{
              maxWidth: 420,
              width: "92%",
              borderRadius: "24px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="modal-header"
              style={{
                padding: "16px 20px",
                background: "transparent",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: confirmBlock.bloqueado ? "rgba(16,185,129,0.16)" : "rgba(239,68,68,0.16)",
                  border: `1px solid ${confirmBlock.bloqueado ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  color: confirmBlock.bloqueado ? "#10b981" : "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {confirmBlock.bloqueado ? <Unlock size={18} /> : <Lock size={18} />}
                </div>
                <h3 className="modal-title" style={{
                  color: confirmBlock.bloqueado ? "#10b981" : "#f87171",
                  margin: 0, fontSize: "1.1rem", fontWeight: 800
                }}>
                  {confirmBlock.bloqueado ? "Desbloquear usuario" : "Bloquear usuario"}
                </h3>
              </div>
              <button className="btn-modal-close-circle" onClick={() => setConfirmBlock(null)} title="Cerrar modal">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: "20px", background: "transparent" }}>
              {confirmBlock.bloqueado ? (
                <p style={{ color: "var(--text-muted)", lineHeight: 1.6, margin: 0, fontSize: "0.88rem" }}>
                  ¿Deseas <strong style={{ color: "#10b981" }}>restaurar el acceso</strong> de{" "}
                  <strong style={{ color: "var(--text-main)" }}>{confirmBlock.nombre}</strong>?{" "}
                  Podrá iniciar sesión nuevamente con su PIN.
                </p>
              ) : (
                <p style={{ color: "var(--text-muted)", lineHeight: 1.6, margin: 0, fontSize: "0.88rem" }}>
                  ¿Deseas <strong style={{ color: "#ef4444" }}>bloquear el acceso</strong> de{" "}
                  <strong style={{ color: "var(--text-main)" }}>{confirmBlock.nombre}</strong>?{" "}
                  No podrá iniciar sesión hasta que lo desbloquees. Si tiene sesión activa, será expulsado automáticamente.
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                padding: "14px 20px",
                background: "transparent",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}
            >
              <button
                className="btn btn-modal-cancel"
                onClick={() => setConfirmBlock(null)}
                style={{ padding: "8px 18px", borderRadius: "10px" }}
                disabled={isBlocking}
              >
                Cancelar
              </button>
              <button
                className="btn"
                onClick={handleConfirmBlock}
                disabled={isBlocking}
                style={{
                  padding: "8px 20px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: confirmBlock.bloqueado ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)",
                  border: `1px solid ${confirmBlock.bloqueado ? "rgba(16,185,129,0.45)" : "rgba(239,68,68,0.45)"}`,
                  color: confirmBlock.bloqueado ? "#10b981" : "#ef4444",
                  cursor: isBlocking ? "not-allowed" : "pointer"
                }}
              >
                {confirmBlock.bloqueado ? <Unlock size={14} /> : <Lock size={14} />}
                <span>{isBlocking ? "Aplicando..." : (confirmBlock.bloqueado ? "Desbloquear" : "Bloquear")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
