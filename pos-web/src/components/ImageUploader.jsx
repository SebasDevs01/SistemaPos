import React, { useState, useRef, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, Plus, X, Star, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Comprime una imagen en el navegador para subida ultra-rápida y almacenamiento óptimo.
 * Retorna tanto un Blob JPEG ligero (para Storage) como un dataUrl base64 ultra-optimizado (para fallback/contingencia).
 */
const compressImageFile = (file, maxWidth = 900, maxHeight = 900, quality = 0.82) => {
  return new Promise((resolve) => {
    // Si no es un archivo válido
    if (!file) {
      resolve({ blob: null, dataUrl: null });
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

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob(
            (blob) => {
              resolve({ blob: blob || file, dataUrl });
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve({ blob: file, dataUrl: e.target?.result });
        }
      };
      img.onerror = () => resolve({ blob: file, dataUrl: e.target?.result });
      img.src = e.target?.result;
    };
    reader.onerror = () => resolve({ blob: file, dataUrl: null });
    reader.readAsDataURL(file);
  });
};

/**
 * Sube a Firebase Storage con fallback automático a dataUrl si Storage falla (e.g. 402 billing, cuota o sin conexión).
 */
const uploadToFirebaseStorage = async (file, productId, onProgress) => {
  const { blob, dataUrl } = await compressImageFile(file);

  if (!storage) {
    console.warn('[ImageUploader] Firebase Storage no disponible. Usando respaldo dataUrl directo.');
    return { url: dataUrl, path: null, mode: 'local' };
  }

  return new Promise((resolve) => {
    try {
      const ext = 'jpg';
      const cleanProdId = String(productId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
      const path = `productos/${cleanProdId}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const storageRef = ref(storage, path);

      const uploadTask = uploadBytesResumable(storageRef, blob || file, {
        contentType: 'image/jpeg',
        customMetadata: { productId: String(productId || '') }
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(pct);
          }
        },
        (error) => {
          console.warn('[ImageUploader] Storage upload warning (fallback activado):', error.code || error.message);
          // Si Firebase Storage da 402/403/unauthorized/quota/offline, resolvemos con dataUrl para no perder la imagen
          resolve({ url: dataUrl, path: null, mode: 'fallback' });
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ url, path, mode: 'cloud' });
          } catch (e) {
            console.warn('[ImageUploader] Error obteniendo downloadURL, usando dataUrl:', e);
            resolve({ url: dataUrl, path: null, mode: 'fallback' });
          }
        }
      );
    } catch (err) {
      console.warn('[ImageUploader] Error iniciando subida a Storage:', err);
      resolve({ url: dataUrl, path: null, mode: 'fallback' });
    }
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
  const [uploadNotice, setUploadNotice] = useState('');
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  // Normalizar lista: soporta strings (URLs o dataURLs)
  const imageList = Array.isArray(images) 
    ? images.filter(img => img && typeof img === 'string' && img.trim()) 
    : (images && typeof images === 'string' && images.trim() ? [images.trim()] : []);

  // Filtrar archivos válidos (por type o por extensión de nombre)
  const isImageFile = (file) => {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    const name = (file.name || '').toLowerCase();
    return /\.(jpg|jpeg|png|webp|gif|jfif|heic|bmp|svg)$/i.test(name);
  };

  // Procesar archivos subidos o arrastrados
  const processFiles = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const validFiles = Array.from(filesList).filter(isImageFile);

    if (validFiles.length === 0) {
      setUploadNotice('Por favor arrastra o selecciona archivos de imagen válidos (PNG, JPG, WEBP).');
      setTimeout(() => setUploadNotice(''), 4000);
      return;
    }

    const remaining = maxImages - imageList.length;
    if (remaining <= 0) {
      setUploadNotice(`Máximo ${maxImages} fotos por producto.`);
      setTimeout(() => setUploadNotice(''), 4000);
      return;
    }

    const filesToUpload = validFiles.slice(0, remaining);
    setUploading(true);
    setUploadNotice('');
    setUploadProgress(0);

    try {
      const uploadedUrls = [];
      let hadFallback = false;

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const result = await uploadToFirebaseStorage(
          file, 
          productId,
          (pct) => setUploadProgress(Math.round(((i + pct / 100) / filesToUpload.length) * 100))
        );
        if (result && result.url) {
          uploadedUrls.push(result.url);
          if (result.mode === 'fallback') hadFallback = true;
        }
      }

      if (uploadedUrls.length > 0) {
        const combined = [...imageList, ...uploadedUrls].slice(0, maxImages);
        onChange(combined);
        if (hadFallback) {
          setUploadNotice('✨ Foto guardada y optimizada para el sistema POS.');
        } else {
          setUploadNotice('☁️ Foto guardada exitosamente en la nube.');
        }
        setTimeout(() => setUploadNotice(''), 4500);
      }
    } catch (err) {
      console.error('[ImageUploader] Upload error:', err);
      setUploadNotice('No se pudo procesar la imagen. Intenta seleccionarla de nuevo.');
      setTimeout(() => setUploadNotice(''), 4000);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Drag & Drop Robusto (sin flickering de hijos mediante contador)
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { e.dataTransfer.dropEffect = 'copy'; } catch (_) {}
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  // Pegar imagen del portapapeles con Ctrl+V
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) pastedFiles.push(blob);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      processFiles(pastedFiles);
    }
  };

  // Añadir por URL externa
  const handleAddUrl = (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (imageList.includes(trimmed)) { 
      setUrlInput(''); 
      return; 
    }
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
    <div 
      onPaste={handlePaste}
      tabIndex={0}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', outline: 'none' }}
    >
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
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <CheckCircle2 size={11} /> Sincronizadas
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
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #f43f5e' : '2px dashed rgba(225, 29, 72, 0.38)',
          background: isDragging 
            ? 'rgba(244, 63, 94, 0.16)' 
            : 'rgba(255, 255, 255, 0.03)',
          transform: isDragging ? 'scale(1.01)' : 'scale(1)',
          borderRadius: '16px',
          padding: '18px 20px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDragging ? '0 0 20px rgba(244, 63, 94, 0.35)' : 'none',
          opacity: uploading ? 0.75 : 1,
          position: 'relative',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', pointerEvents: isDragging ? 'none' : 'auto' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px',
            background: isDragging ? 'rgba(244, 63, 94, 0.3)' : 'rgba(244, 63, 94, 0.12)', 
            color: 'var(--neon-rose, #e11d48)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'all 0.2s ease'
          }}>
            {uploading ? (
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <UploadCloud size={24} style={{ transform: isDragging ? 'translateY(-2px)' : 'none', transition: 'transform 0.2s' }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: isDragging ? '#f43f5e' : 'var(--text-main)' }}>
              {uploading 
                ? `Cargando foto al sistema... ${uploadProgress}%` 
                : isDragging 
                  ? '¡Suelta la foto aquí para cargarla! 📥'
                  : 'Arrastra tus fotos aquí o haz clic para elegirlas'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {uploading 
                ? 'Optimizando imagen para visualización instantánea...'
                : 'Soporta PNG, JPG, WEBP, GIF — También puedes pegar con Ctrl+V'}
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
            border: '1px solid #e2e8f0', padding: '8px 16px',
            borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '6px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            opacity: uploading ? 0.5 : 1,
            pointerEvents: isDragging ? 'none' : 'auto'
          }}
        >
          <ImageIcon size={15} color="#e11d48" />
          <span>Elegir fotos</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Notificación de estado */}
      {uploadNotice && (
        <div style={{
          background: uploadNotice.includes('Por favor') || uploadNotice.includes('Máximo') || uploadNotice.includes('No se pudo')
            ? 'rgba(239,68,68,0.12)' 
            : 'rgba(16,185,129,0.12)',
          border: uploadNotice.includes('Por favor') || uploadNotice.includes('Máximo') || uploadNotice.includes('No se pudo')
            ? '1px solid rgba(239,68,68,0.3)' 
            : '1px solid rgba(16,185,129,0.3)',
          borderRadius: '10px', padding: '8px 14px',
          fontSize: '0.78rem', 
          color: uploadNotice.includes('Por favor') || uploadNotice.includes('Máximo') || uploadNotice.includes('No se pudo')
            ? '#fca5a5' 
            : '#6ee7b7',
          display: 'flex', gap: '8px', alignItems: 'center'
        }}>
          <span>{uploadNotice.includes('Por favor') || uploadNotice.includes('No se pudo') ? '⚠️' : '✅'}</span>
          <span>{uploadNotice}</span>
          <button 
            type="button" 
            onClick={() => setUploadNotice('')} 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
          >
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
              key={`${idx}-${imgSrc.slice(-25)}`}
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
