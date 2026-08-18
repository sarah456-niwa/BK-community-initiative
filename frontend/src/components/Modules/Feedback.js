import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Megaphone, Edit, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    beneficiary_name: '',
    date_received: '',
    channel: 'IN_PERSON',
    description: '',
    raised_by: '',
    resolution: '',
    is_resolved: false,
  });

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/feedback/');
      setFeedbacks(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
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
      beneficiary_name: '',
      date_received: '',
      channel: 'IN_PERSON',
      description: '',
      raised_by: '',
      resolution: '',
      is_resolved: false,
    });
  };

  const handleEdit = (item) => {
    setFormData({
      beneficiary_name: item.beneficiary_name || '',
      date_received: item.date_received || '',
      channel: item.channel || 'IN_PERSON',
      description: item.description || '',
      raised_by: item.raised_by || '',
      resolution: item.resolution || '',
      is_resolved: item.is_resolved,
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this feedback record?')) {
      try {
        await api.delete(`/feedback/${id}/`);
        toast.success('Feedback deleted successfully!');
        loadFeedbacks();
      } catch (error) {
        console.error('Error deleting feedback:', error);
        toast.error('Failed to delete feedback.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/feedback/${editingId}/`, formData);
        toast.success('Feedback updated successfully!');
      } else {
        await api.post('/feedback/', formData);
        toast.success('Feedback recorded successfully!');
      }
      handleClose();
      loadFeedbacks();
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback.');
    } finally {
      setSaving(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(
    (fb) =>
      fb.description?.toLowerCase().includes(search.toLowerCase()) ||
      fb.beneficiary_name?.toLowerCase().includes(search.toLowerCase()) ||
      fb.raised_by?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Feedback & Complaints</h1>
          <p>Track beneficiary feedback, complaints, and resolutions.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Record Feedback
        </button>
      </div>

      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading feedback...</div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="empty-state">
            <Megaphone size={48} className="empty-state-icon" />
            <p>No feedback recorded. Click "Record Feedback" to add one.</p>
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Date Received</th>
                <th>Beneficiary</th>
                <th>Channel</th>
                <th>Raised By</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map((fb) => (
                <tr key={fb.id}>
                  <td>{fb.date_received}</td>
                  <td style={{ fontWeight: 600 }}>{fb.beneficiary_name || 'Anonymous'}</td>
                  <td>{fb.channel.replace('_', ' ')}</td>
                  <td>{fb.raised_by || 'Self'}</td>
                  <td>
                    <span className={`status-badge ${fb.is_resolved ? 'completed' : 'pending'}`}>
                      {fb.is_resolved ? 'Resolved' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons-group">
                      <button className="btn-icon" title="Edit Feedback" onClick={() => handleEdit(fb)}>
                        <Edit size={14} style={{ color: '#2F9E68' }} />
                      </button>
                      <button className="btn-icon" title="Delete Feedback" onClick={() => handleDelete(fb.id)}>
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
              <h2>{editingId ? 'Edit Feedback' : 'Record Feedback'}</h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Beneficiary Name (Optional)</label>
                    <input
                      type="text"
                      name="beneficiary_name"
                      value={formData.beneficiary_name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Raised By (Optional)</label>
                    <input
                      type="text"
                      name="raised_by"
                      placeholder="e.g. Caregiver, Staff"
                      value={formData.raised_by}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Date Received</label>
                    <input
                      type="date"
                      name="date_received"
                      value={formData.date_received}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Channel</label>
                    <select
                      name="channel"
                      value={formData.channel}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="IN_PERSON">In Person</option>
                      <option value="PHONE">Phone</option>
                      <option value="SUGGESTION_BOX">Suggestion Box</option>
                      <option value="COMMUNITY_MEETING">Community Meeting</option>
                      <option value="OTHER">Other</option>
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
                    <label>Resolution</label>
                    <textarea
                      name="resolution"
                      rows="3"
                      value={formData.resolution}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      name="is_resolved"
                      checked={formData.is_resolved}
                      onChange={handleInputChange}
                      id="resolved"
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="resolved" style={{ marginBottom: 0 }}>Mark as Resolved</label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback;
