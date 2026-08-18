import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Activity, User, Calendar, Clock, Award, Edit, Trash2, Filter, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const THERAPY_TYPES = [
  { value: 'PHYSIO', label: 'Physiotherapy' },
  { value: 'SPEECH', label: 'Speech Therapy' },
  { value: 'OCCUPATIONAL', label: 'Occupational Therapy' },
  { value: 'BEHAVIORAL', label: 'Behavioral Therapy' },
  { value: 'COGNITIVE', label: 'Cognitive Therapy' },
  { value: 'OTHER', label: 'Other' },
];

const Therapy = () => {
  const [sessions, setSessions] = useState([]);
  const [children, setChildren] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [therapistFilter, setTherapistFilter] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    child: '',
    therapy_type: 'PHYSIO',
    hours: '',
    therapist: '',
    date: '',
    outcome: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, childrenRes, usersRes] = await Promise.all([
        api.get('/therapy/'),
        api.get('/children/'),
        api.get('/users/'),
      ]);

      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : sessionsRes.data.results || []);
      setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : childrenRes.data.results || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || []);
    } catch (error) {
      console.error('Error loading therapy data:', error);
      toast.error('Failed to load therapy sessions or dropdown data.');
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
      [name]: name === 'hours' ? parseFloat(value) || '' : value,
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      child: '',
      therapy_type: 'PHYSIO',
      hours: '',
      therapist: '',
      date: '',
      outcome: '',
      notes: '',
    });
  };

  const handleEdit = (item) => {
    setFormData({
      child: item.child || '',
      therapy_type: item.therapy_type || 'PHYSIO',
      hours: item.hours || '',
      therapist: item.therapist || '',
      date: item.date || '',
      outcome: item.outcome || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this therapy session?')) {
      try {
        await api.delete(`/therapy/${id}/`);
        toast.success('Therapy session deleted successfully!');
        loadData();
      } catch (error) {
        console.error('Error deleting therapy session:', error);
        toast.error('Failed to delete therapy session.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.child) {
      toast.error('Please select a child.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/therapy/${editingId}/`, formData);
        toast.success('Therapy session updated successfully!');
      } else {
        await api.post('/therapy/', formData);
        toast.success('Therapy session recorded successfully!');
      }
      handleClose();
      loadData();
    } catch (error) {
      console.error('Error saving therapy session:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  // Filtered List
  const filteredSessions = sessions.filter(
    (item) => {
      const matchesSearch =
        item.child_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.therapy_type?.toLowerCase().includes(search.toLowerCase()) ||
        item.outcome?.toLowerCase().includes(search.toLowerCase());
      const matchesTherapist = therapistFilter ? String(item.therapist) === String(therapistFilter) : true;
      return matchesSearch && matchesTherapist;
    }
  );

  // Stats
  const totalSessions = sessions.length;
  const totalHours = sessions.reduce((sum, s) => sum + parseFloat(s.hours || 0), 0).toFixed(1);
  const activeChildrenCount = new Set(sessions.map(s => s.child)).size;

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Therapy Sessions</h1>
          <p>Schedule and document clinical therapy visits, session durations, and patient outcomes.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Log Therapy Session
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Sessions</h3>
          <div className="value">{totalSessions}</div>
        </div>
        <div className="stats-card">
          <h3>Total Hours logged</h3>
          <div className="value">{totalHours} hrs</div>
        </div>
        <div className="stats-card">
          <h3>Beneficiary Children</h3>
          <div className="value">{activeChildrenCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-row flex-wrap" style={{ gap: '12px' }}>
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by child name, therapy type, or outcome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group-row">
          <div className="select-wrapper">
            <Filter size={14} className="filter-select-icon" />
            <select
              className="has-icon"
              value={therapistFilter}
              onChange={(e) => setTherapistFilter(e.target.value)}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading therapy logs...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="empty-state">
            <Activity size={48} className="empty-state-icon" />
            <p>No therapy sessions recorded. Click "Log Therapy Session" to add one.</p>
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Child</th>
                <th>Therapy Type</th>
                <th>Hours</th>
                <th>Date</th>
                <th>Therapist</th>
                <th>Outcome</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f2d60' }}>
                      {item.child_name || 'Unknown Child'}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      background: 'rgba(28, 126, 196, 0.08)',
                      color: '#1c7ec4',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {THERAPY_TYPES.find(t => t.value === item.therapy_type)?.label || item.therapy_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Clock size={13} style={{ color: '#8890a6' }} />
                      {item.hours}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a5c74' }}>
                      <Calendar size={14} />
                      {item.date}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} style={{ color: '#8890a6' }} />
                      {item.therapist ? users.find(u => u.id === item.therapist)?.first_name || 'Assigned' : 'Unassigned'}
                    </div>
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.outcome}>
                    {item.outcome}
                  </td>
                  <td>
                    <div className="action-buttons-group">
                      <button 
                        className="btn-icon" 
                        title="View Session"
                        onClick={() => setViewItem(item)}
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Edit Session"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit size={14} style={{ color: '#2F9E68' }} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Delete Session"
                        onClick={() => handleDelete(item.id)}
                      >
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

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Therapy Session' : 'Record Therapy Session'}</h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Select Child</label>
                    <select
                      name="child"
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">-- Choose Beneficiary --</option>
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.child_id} - {child.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Therapy Type</label>
                    <select
                      name="therapy_type"
                      value={formData.therapy_type}
                      onChange={handleInputChange}
                      required
                    >
                      {THERAPY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Select Therapist</label>
                    <select
                      name="therapist"
                      value={formData.therapist}
                      onChange={handleInputChange}
                    >
                      <option value="">-- Choose User --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Session Duration (Hours)</label>
                    <input
                      type="number"
                      name="hours"
                      step="0.1"
                      placeholder="e.g. 1.5"
                      value={formData.hours}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Session Outcome</label>
                    <textarea
                      name="outcome"
                      rows="3"
                      placeholder="e.g. Child is beginning to support weight on heels, speech responsiveness improved..."
                      value={formData.outcome}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Clinical Notes</label>
                    <textarea
                      name="notes"
                      rows="3"
                      placeholder="Enter details on exercises done, next session plan, caregiver instructions..."
                      value={formData.notes}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingId ? 'Update Therapy Log' : 'Save Therapy Log')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <ViewModal
          title="Therapy Session Details"
          item={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}
    </div>
  );
};

export default Therapy;
