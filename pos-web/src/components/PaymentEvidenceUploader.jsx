import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, X, Loader2, Eye, CheckCircle2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

/**
 * Comprime una imagen en el navegador a JPEG de calidad equilibrada
 * para subida ultra-rápida y menor consumo de datos/almacenamiento.
 */
const compressImage = (file, maxWidth = 1400, maxHeight = 1400, quality = 0.85) => {
  return new Promise((resolve) => {
    // Si no es imagen, retornar archivo original
    if (!file || !file.type.startsWith("image/")) {
      resolve({ file, dataUrl: null });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        canvas.toBlob(
          (blob) => {
            resolve({ blob: blob || file, dataUrl });
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve({ file, dataUrl: e.target.result });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ file, dataUrl: null });
    reader.readAsDataURL(file);
  });
};

/**
 * Sube la imagen a Firebase Storage o genera dataUrl de respaldo.
 */
const uploadEvidence = async (file, folder = "comprobantes_alquiler", onProgress = null) => {
  const { blob, dataUrl } = await compressImage(file);

  if (!storage) {
    return dataUrl;
  }

  try {
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.jpg`;
    const storageRef = ref(storage, `${folder}/${filename}`);
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: "image/jpeg"
    });

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (onProgress && snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (error) => {
          console.warn("Storage upload failed, falling back to dataUrl:", error);
          // Fallback a dataUrl para no bloquear la operación
          resolve(dataUrl);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (e) {
            resolve(dataUrl);
          }
        }
      );
    });
  } catch (err) {
    console.warn("Error en uploadEvidence:", err);
    return dataUrl;
  }
};

export default function PaymentEvidenceUploader({
  value,
  onChange,
  label = "📸 Comprobante de Transferencia / Pago",
  helperText = "Captura de Nequi, Daviplata, Bancolombia u otra transferencia",
  folder = "comprobantes_alquiler"
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleProcessFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen válida (JPG, PNG, WebP o captura de pantalla).");
      return;
    }

    setIsUploading(true);
    setUploadPct(10);

    try {
      const url = await uploadEvidence(file, folder, (pct) => setUploadPct(pct));
      if (url) {
        onChange(url);
      }
    } catch (err) {
      console.error("Error subiendo comprobante:", err);
      alert("No se pudo procesar la imagen. Intenta de nuevo.");
    } finally {
      setIsUploading(false);
      setUploadPct(0);
    }
  };

  // Pegar con Ctrl+V directo de WhatsApp o capturas de pantalla
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessFile(file);
          break;
        }
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      tabIndex={0}
      className={`payment-evidence-box ${isDragging ? "dragging" : ""}`}
      style={{
        borderRadius: "14px",
        padding: "12px 14px",
        outline: "none",
        transition: "all 0.2s ease"
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleProcessFile(e.target.files[0]);
          }
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
          {label}
        </label>
        {value && (
          <span style={{ fontSize: "0.72rem", color: "#34d399", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
            <CheckCircle2 size={13} /> Adjunto
          </span>
        )}
      </div>

      {value ? (
        <div className="payment-evidence-preview-row" style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 10px",
          borderRadius: "10px"
        }}>
          {/* Miniatura clickeable para ver */}
          <div
            onClick={() => setShowPreviewModal(true)}
            style={{
              position: "relative",
              width: "60px",
              height: "60px",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--border-strong)",
              cursor: "pointer",
              flexShrink: 0,
              background: "#000"
            }}
            title="Clic para ampliar comprobante"
          >
            <img
              src={value}
              alt="Comprobante de pago"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.9
            }}>
              <Eye size={18} color="#fff" />
            </div>
          </div>

          {/* Información y botones */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Captura de transferencia</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Clic en la miniatura para ver completa
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline"
                style={{ padding: "3px 8px", fontSize: "0.74rem" }}
                disabled={isUploading}
              >
                Cambiar imagen
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="btn btn-outline"
                style={{ padding: "3px 8px", fontSize: "0.74rem", color: "#f87171", borderColor: "rgba(244,63,94,0.3)" }}
                disabled={isUploading}
              >
                <X size={12} style={{ marginRight: "3px" }} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            cursor: "pointer",
            textAlign: "center",
            padding: "14px 10px",
            background: isDragging ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.015)",
            borderRadius: "10px",
            transition: "all 0.2s ease"
          }}
        >
          {isUploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <Loader2 size={24} className="animate-spin" color="var(--accent-primary)" />
              <span style={{ fontSize: "0.8rem", color: "var(--text-main)", fontWeight: 600 }}>
                Subiendo comprobante ({uploadPct}%)...
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <UploadCloud size={24} color="var(--text-muted)" />
              <div style={{ fontSize: "0.8rem", color: "var(--text-main)", fontWeight: 600 }}>
                Toca aquí para subir captura o arrastra la imagen
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {helperText} · También puedes pegar con <strong>Ctrl + V</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal visor de la imagen completa */}
      {showPreviewModal && value && (
        <div
          className="modal-overlay"
          onClick={() => setShowPreviewModal(false)}
          style={{ zIndex: 1300, background: "rgba(0,0,0,0.88)" }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "650px",
              width: "95%",
              background: "var(--bg-secondary, #111827)",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.9)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                <ImageIcon size={18} color="var(--neon-emerald)" />
                Comprobante de Transferencia
              </h4>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="btn btn-outline"
                style={{ padding: "4px 8px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              maxHeight: "75vh",
              overflowY: "auto",
              borderRadius: "10px",
              background: "#000",
              textAlign: "center",
              padding: "8px"
            }}>
              <img
                src={value}
                alt="Comprobante"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "8px"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                download="comprobante-pago.jpg"
                className="btn btn-outline"
                style={{ fontSize: "0.82rem", padding: "6px 14px", textDecoration: "none" }}
              >
                Abrir en pestaña nueva / Descargar
              </a>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="btn btn-primary"
                style={{ fontSize: "0.82rem", padding: "6px 16px" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
