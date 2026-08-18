import React, { useState, useEffect } from 'react';
import { Plus, Search, X, ShieldAlert, Edit, Trash2, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const Safeguarding = () => {
  const [incidents, setIncidents] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    child: '',
    incident_type: 'SAFETY',
    date_of_incident: '',
    reported_by: '',
    description: '',
    action_taken: '',
    is_confidential: true,
    status: 'OPEN',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [incidentsRes, childrenRes] = await Promise.all([
        api.get('/safeguarding/'),
        api.get('/children/')
      ]);
      setIncidents(Array.isArray(incidentsRes.data) ? incidentsRes.data : incidentsRes.data.results || []);
      setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : childrenRes.data.results || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load safeguarding incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      child: '',
      incident_type: 'SAFETY',
      date_of_incident: '',
      reported_by: '',
      description: '',
      action_taken: '',
      is_confidential: true,
      status: 'OPEN',
    });
  };

  const handleEdit = (item) => {
    setFormData({
      child: item.child || '',
      incident_type: item.incident_type || 'SAFETY',
      date_of_incident: item.date_of_incident || '',
      reported_by: item.reported_by || '',
      description: item.description || '',
      action_taken: item.action_taken || '',
      is_confidential: item.is_confidential,
      status: item.status || 'OPEN',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this incident record? This action cannot be undone.')) {
      try {
        await api.delete(`/safeguarding/${id}/`);
        toast.success('Incident deleted successfully!');
        loadData();
      } catch (error) {
        console.error('Error deleting incident:', error);
        toast.error('Failed to delete incident.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.child) delete payload.child;

      if (editingId) {
        await api.put(`/safeguarding/${editingId}/`, payload);
        toast.success('Incident updated successfully!');
      } else {
        await api.post('/safeguarding/', payload);
        toast.success('Incident logged successfully!');
      }
      handleClose();
      loadData();
    } catch (error) {
      console.error('Error saving incident:', error);
      toast.error('Failed to save incident.');
    } finally {
      setSaving(false);
    }
  };

  const filteredIncidents = incidents.filter(
    (inc) =>
      inc.incident_type?.toLowerCase().includes(search.toLowerCase()) ||
      inc.child_name?.toLowerCase().includes(search.toLowerCase()) ||
      inc.reported_by?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Safeguarding Incidents</h1>
          <p>Confidential log of safeguarding and safety incidents.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Log Incident
        </button>
      </div>

      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by child, type, or reporter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading incidents...</div>
        ) : filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <ShieldAlert size={48} className="empty-state-icon" />
            <p>No safeguarding incidents recorded.</p>
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Child</th>
                <th>Type</th>
                <th>Reported By</th>
                <th>Status</th>
                <th>Confidential</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => (
                <tr key={inc.id}>
                  <td>{inc.date_of_incident}</td>
                  <td style={{ fontWeight: 600 }}>{inc.child_name || 'N/A'}</td>
                  <td>{inc.incident_type}</td>
                  <td>{inc.reported_by}</td>
                  <td>
                    <span className={`status-badge ${inc.status.toLowerCase()}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td>{inc.is_confidential ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="action-buttons-group">
                      <button className="btn-icon" title="View Incident" onClick={() => setViewItem(inc)}>
                        <Eye size={14} />
                      </button>
                      <button className="btn-icon" title="Edit Incident" onClick={() => handleEdit(inc)}>
                        <Edit size={14} style={{ color: '#2F9E68' }} />
                      </button>
                      <button className="btn-icon" title="Delete Incident" onClick={() => handleDelete(inc.id)}>
                        <Trash2 size={14} style={{ color: '#C94B4B' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Incident' : 'Log Safeguarding Incident'}</h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Child (Optional)</label>
                    <select
                      name="child"
                      value={formData.child}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Child...</option>
                      {children.map(c => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Incident Type</label>
                    <select
                      name="incident_type"
                      value={formData.incident_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="ABUSE">Suspected Abuse</option>
                      <option value="NEGLECT">Neglect</option>
                      <option value="SAFETY">Safety/Injury Incident</option>
                      <option value="BEHAVIORAL">Severe Behavioral Incident</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date of Incident</label>
                    <input
                      type="date"
                      name="date_of_incident"
                      value={formData.date_of_incident}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Reported By</label>
                    <input
                      type="text"
                      name="reported_by"
                      value={formData.reported_by}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      name="description"
                      rows="4"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Action Taken</label>
                    <textarea
                      name="action_taken"
                      rows="3"
                      value={formData.action_taken}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      name="is_confidential"
                      checked={formData.is_confidential}
                      onChange={handleInputChange}
                      id="confidential"
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="confidential" style={{ marginBottom: 0 }}>Mark as Highly Confidential</label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <ViewModal
          title="Incident Details"
          item={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}
    </div>
  );
};

export default Safeguarding;
