import React, { useEffect, useState } from 'react';
import '../styles/Modals.css';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!message) return;

    const intervalTime = 20;
    const decrement = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          if (onClose) onClose();
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="toast-container">
      <div className={`toast-item ${type}`}>
        <span className="material-symbols-rounded" style={{ color: type === 'success' ? '#22C55E' : 'var(--primary)' }}>
          {type === 'success' ? 'check_circle' : 'info'}
        </span>
        <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{message}</div>
        <div
          className="toast-progress-bar"
          style={{
            width: `${progress}%`,
            backgroundColor: type === 'success' ? '#22C55E' : 'var(--primary)'
          }}
        />
      </div>
    </div>
  );
}
