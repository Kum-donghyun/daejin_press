import React from 'react';
import { useAuth } from '../context/AuthContext';

function Toast() {
  const { toast } = useAuth();

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.type === 'success' && <i className="fas fa-check-circle mr-2"></i>}
      {toast.type === 'error' && <i className="fas fa-exclamation-circle mr-2"></i>}
      {toast.type === 'info' && <i className="fas fa-info-circle mr-2"></i>}
      {toast.message}
    </div>
  );
}

export default Toast;
