import React, { useState, useEffect } from 'react';
import { Plus, Search, X, User, Calendar, ClipboardCheck, Edit, Trash2, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const Referrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    child: '',
    referral_date: '',
    referred_by: '',
    referral_source: '',
    referral_reason: '',
    status: 'PENDING',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [referralsRes, childrenRes] = await Promise.all([
        api.get('/referrals/'),
        api.get('/children/'),
      ]);
      setReferrals(Array.isArray(referralsRes.data) ? referralsRes.data : referralsRes.data.results || []);
      setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : childrenRes.data.results || []);
    } catch (error) {
      console.error('Error loading referrals data:', error);
      toast.error('Unable to load referrals or children data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      child: '',
      referral_date: '',
      referred_by: '',
      referral_source: '',
      referral_reason: '',
      status: 'PENDING',
      notes: '',
    });
  };

  const handleEdit = (item) => {
    setFormData({
      child: item.child || '',
      referral_date: item.referral_date || '',
      referred_by: item.referred_by || '',
      referral_source: item.referral_source || '',
      referral_reason: item.referral_reason || '',
      status: item.status || 'PENDING',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this referral record?')) return;
    try {
      await api.delete(`/referrals/${id}/`);
      toast.success('Referral deleted successfully.');
      loadData();
    } catch (error) {
      console.error('Error deleting referral:', error);
      toast.error('Unable to delete referral.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (payload.child === '') {
        toast.error('Please select a referred child.');
        setSaving(false);
        return;
      }

      if (editingId) {
        await api.put(`/referrals/${editingId}/`, payload);
        toast.success('Referral updated successfully.');
      } else {
        await api.post('/referrals/', payload);
        toast.success('Referral created successfully.');
      }
      handleClose();
      loadData();
    } catch (error) {
      console.error('Error saving referral:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save referral.';
      toast.error(`Error: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredReferrals = referrals.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      item.child_name,
      item.referred_by,
      item.referral_source,
      item.referral_reason,
      item.status,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const totalReferrals = referrals.length;
  const pendingCount = referrals.filter((item) => item.status === 'PENDING').length;
  const completedCount = referrals.filter((item) => item.status === 'COMPLETED').length;
  const cancelledCount = referrals.filter((item) => item.status === 'CANCELLED').length;

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Referrals</h1>
          <p>Manage referral cases separately from child registration and track status, source, and next steps.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Referral
        </button>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Referrals</h3>
          <div className="value">{totalReferrals}</div>
        </div>
        <div className="stats-card">
          <h3>Pending</h3>
          <div className="value">{pendingCount}</div>
        </div>
        <div className="stats-card">
          <h3>Completed</h3>
          <div className="value">{completedCount}</div>
        </div>
        <div className="stats-card">
          <h3>Cancelled</h3>
          <div className="value">{cancelledCount}</div>
        </div>
      </div>

      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search referrals by child, source, status, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading referrals...</div>
        ) : filteredReferrals.length === 0 ? (
          <div className="empty-state">
            <ClipboardCheck size={48} className="empty-state-icon" />
            <p>No referrals found. Click "New Referral" to add one.</p>
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Child</th>
                <th>Date</th>
                <th>Source</th>
                <th>Referred By</th>
                <th>Status</th>
                <th style={{ minWidth: '240px' }}>Reason</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReferrals.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <User size={14} />
                      {item.child_name || 'Unknown child'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} />
                      {item.referral_date || 'TBD'}
                    </div>
                  </td>
                  <td>{item.referral_source || 'N/A'}</td>
                  <td>{item.referred_by || 'N/A'}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: item.status === 'COMPLETED' ? '#16A34A' : item.status === 'CANCELLED' ? '#C94B4B' : '#1C7EC4' }}>
                      {item.status?.charAt(0) + item.status?.slice(1).toLowerCase() || 'Pending'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }} title={item.referral_reason}>
                    {item.referral_reason}
                  </td>
                  <td>
                    <div className="action-buttons-group">
                      <button className="btn-icon" title="View Referral" onClick={() => setViewItem(item)}>
                        <Eye size={14} />
                      </button>
                      <button className="btn-icon" title="Edit Referral" onClick={() => handleEdit(item)}>
                        <Edit size={14} style={{ color: '#2F9E68' }} />
                      </button>
                      <button className="btn-icon" title="Delete Referral" onClick={() => handleDelete(item.id)}>
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
              <h2>{editingId ? 'Edit Referral' : 'New Referral'}</h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Child</label>
                    <select name="child" value={formData.child} onChange={handleInputChange} required>
                      <option value="">Select referred child</option>
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>{child.full_name_display || child.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Referral Date</label>
                    <input type="date" name="referral_date" value={formData.referral_date} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Referred By</label>
                    <input type="text" name="referred_by" value={formData.referred_by} onChange={handleInputChange} placeholder="Referral source person or agency" required />
                  </div>
                  <div className="form-group">
                    <label>Referral Source</label>
                    <input type="text" name="referral_source" value={formData.referral_source} onChange={handleInputChange} placeholder="Health worker, school, community actor" required />
                  </div>
                  <div className="form-group">
                    <label>Referral Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Referral Reason</label>
                    <textarea name="referral_reason" rows="3" value={formData.referral_reason} onChange={handleInputChange} required placeholder="Explain why this referral was made and what follow-up is needed." />
                  </div>
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="3" value={formData.notes} onChange={handleInputChange} placeholder="Extra context such as next steps or referral notes." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Update Referral' : 'Save Referral')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewItem && (
        <ViewModal title="Referral Details" item={viewItem} onClose={() => setViewItem(null)} />
      )}
    </div>
  );
};

export default Referrals;
