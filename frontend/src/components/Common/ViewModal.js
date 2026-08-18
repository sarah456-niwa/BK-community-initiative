import React from 'react';
import { X } from 'lucide-react';
import '../../components/Modules/Modules.css';

const ViewModal = ({ title = 'Record Details', item = null, onClose }) => {
  if (!item) return null;

  const entries = Object.entries(item);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #edf0f6' }}>
                  <td style={{ padding: '10px 12px', width: '35%', verticalAlign: 'top', color: '#5a5c74', fontWeight: 600 }}>{k.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    {v === null || v === undefined ? '—' : (
                      typeof v === 'object' ? JSON.stringify(v) : String(v)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewModal;
