import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, Plus, X, Star, Loader2 } from 'lucide-react';

// Sube un archivo a Firebase Storage y retorna la URL pública
const uploadToFirebaseStorage = (file, productId, onProgress) => {
  return new Promise((resolve, reject) => {
    if (!storage) {
      reject(new Error('Firebase Storage no está disponible en este momento.'));
      return;
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `productos/${productId || 'general'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      (error) => {
        console.error('Error subiendo imagen a Storage:', error);
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, path });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
};


export default function ImageUploader({ 
  images = [], 
  onChange,
  productId,
  maxImages = 8
}) {
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Normalizar lista: soporta strings (URLs) o strings directos
  const imageList = Array.isArray(images) 
    ? images.filter(img => img && typeof img === 'string' && img.trim()) 
    : (images ? [String(images)] : []);

  // Subir archivos a Firebase Storage
  const processFiles = async (files) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const remaining = maxImages - imageList.length;
    if (remaining <= 0) {
      setUploadError(`Máximo ${maxImages} fotos por producto.`);
      return;
    }

    const filesToUpload = validFiles.slice(0, remaining);
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    try {
      const uploadedUrls = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const result = await uploadToFirebaseStorage(
          file, 
          productId,
          (pct) => setUploadProgress(Math.round(((i + pct / 100) / filesToUpload.length) * 100))
        );
        uploadedUrls.push(result.url);
      }
      const combined = [...imageList, ...uploadedUrls].slice(0, maxImages);
      onChange(combined);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError('Error al subir la imagen. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Drag & Drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) processFiles(e.dataTransfer.files);
  };

  // Añadir por URL externa
  const handleAddUrl = (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (imageList.includes(trimmed)) { setUrlInput(''); return; }
    const updated = [...imageList, trimmed].slice(0, maxImages);
    onChange(updated);
    setUrlInput('');
  };

  // Eliminar imagen
  const handleRemove = (indexToRemove, e) => {
    e.stopPropagation();
    const updated = imageList.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  // Marcar como principal (mover al índice 0)
  const handleSetPrincipal = (index, e) => {
    e.stopPropagation();
    if (index === 0) return;
    const selected = imageList[index];
    const rest = imageList.filter((_, idx) => idx !== index);
    onChange([selected, ...rest]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Encabezado con contador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Fotos del Producto</span>
          <span>📸</span>
          {imageList.length > 0 && (
            <span style={{
              background: 'rgba(16,185,129,0.15)',
              color: '#10b981',
              fontSize: '0.68rem',
              padding: '1px 7px',
              borderRadius: '20px',
              fontWeight: 700,
              border: '1px solid rgba(16,185,129,0.3)'
            }}>
              Guardadas en la nube ☁️
            </span>
          )}
        </label>
        <span style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--neon-rose, #f43f5e)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '2px 10px',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 800
        }}>
          {imageList.length}/{maxImages} fotos
        </span>
      </div>

      {/* Zona Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #e11d48' : '2px dashed rgba(225, 29, 72, 0.35)',
          background: isDragging ? 'rgba(225, 29, 72, 0.08)' : 'rgba(255, 255, 255, 0.03)',
          borderRadius: '16px',
          padding: '18px 20px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? '0 0 15px rgba(225, 29, 72, 0.2)' : 'none',
          opacity: uploading ? 0.7 : 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px',
            background: 'rgba(244, 63, 94, 0.12)', color: 'var(--neon-rose, #e11d48)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {uploading ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={24} />}
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {uploading ? `Subiendo a Firebase Storage... ${uploadProgress}%` : 'Subir fotos desde tu equipo o celular'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {uploading 
                ? 'Las fotos se guardan directamente en la nube ☁️'
                : 'Haz clic aquí o arrastra fotos (PNG, JPG, WEBP) — Puedes seleccionar varias'
              }
            </div>
            {/* Barra de progreso */}
            {uploading && (
              <div style={{
                marginTop: '6px', height: '4px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.1)', overflow: 'hidden', width: '200px'
              }}>
                <div style={{
                  height: '100%', width: `${uploadProgress}%`,
                  background: 'linear-gradient(90deg, #e11d48, #f43f5e)',
                  borderRadius: '4px', transition: 'width 0.3s ease'
                }} />
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={uploading}
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          style={{
            background: '#ffffff', color: '#0f172a',
            border: '1px solid #e2e8f0', padding: '7px 14px',
            borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '6px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            opacity: uploading ? 0.5 : 1
          }}
        >
          <ImageIcon size={14} color="#e11d48" />
          <span>Elegir fotos</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/gif"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Error de subida */}
      {uploadError && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '8px 14px',
          fontSize: '0.78rem', color: '#fca5a5', display: 'flex', gap: '8px', alignItems: 'center'
        }}>
          <span>⚠️</span>
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input de URL externa */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <LinkIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="url"
            className="input-field"
            placeholder="O pega URL de imagen (https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(e); } }}
            style={{ paddingLeft: '38px', height: '40px', fontSize: '0.85rem' }}
          />
        </div>
        <button
          type="button"
          onClick={handleAddUrl}
          style={{
            height: '40px', padding: '0 18px',
            background: 'linear-gradient(135deg, #b91c1c, #991b1b)',
            color: '#ffffff', border: 'none', borderRadius: '10px',
            fontSize: '0.85rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: '6px',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(185, 28, 28, 0.35)'
          }}
        >
          <Plus size={16} />
          <span>Añadir</span>
        </button>
      </div>

      {/* Galería de imágenes cargadas */}
      {imageList.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '10px', marginTop: '4px'
        }}>
          {imageList.map((imgSrc, idx) => (
            <div
              key={`${idx}-${imgSrc.slice(-20)}`}
              onClick={(e) => handleSetPrincipal(idx, e)}
              style={{
                position: 'relative', width: '100%', aspectRatio: '1',
                borderRadius: '12px', overflow: 'hidden',
                border: idx === 0 ? '2px solid #e11d48' : '1px solid var(--border-color)',
                boxShadow: idx === 0 ? '0 0 12px rgba(225, 29, 72, 0.35)' : 'none',
                cursor: 'pointer', background: 'var(--bg-tertiary)'
              }}
              title={idx === 0 ? 'Foto Principal' : 'Haz clic para hacerla foto principal'}
            >
              <img
                src={imgSrc}
                alt={`Foto ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=60';
                }}
              />

              {/* Badge Principal */}
              {idx === 0 && (
                <div style={{
                  position: 'absolute', top: '6px', left: '6px',
                  background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)',
                  color: '#fbbf24', fontSize: '0.62rem', fontWeight: 900,
                  padding: '2px 6px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', gap: '3px',
                  border: '1px solid rgba(251, 191, 36, 0.4)'
                }}>
                  <Star size={10} fill="#fbbf24" />
                  <span>Principal</span>
                </div>
              )}

              {/* Botón Eliminar */}
              <button
                type="button"
                onClick={(e) => handleRemove(idx, e)}
                style={{
                  position: 'absolute', top: '6px', right: '6px',
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.75)', border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.15s'
                }}
                title="Eliminar esta foto"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Spinner CSS */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
