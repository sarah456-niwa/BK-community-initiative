import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Calendar, ClipboardList, Users, MessageSquare, Edit, Trash2, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const MEETING_TYPES = [
  { value: 'STAFF', label: 'Staff Meeting' },
  { value: 'COMMUNITY', label: 'Community Meeting' },
  { value: 'PARTNER', label: 'Partner Meeting' },
  { value: 'REVIEW', label: 'Review Meeting' },
  { value: 'PLANNING', label: 'Planning Meeting' },
  { value: 'OTHER', label: 'Other' },
];

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    meeting_type: 'STAFF',
    date: '',
    participants: 0,
    minutes: '',
    decisions: '',
    action_items: '',
  });

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/meetings/');
      setMeetings(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'participants' ? parseInt(value) || 0 : value,
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      meeting_type: 'STAFF',
      date: '',
      participants: 0,
      minutes: '',
      decisions: '',
      action_items: '',
    });
  };

  const handleEdit = (item) => {
    setFormData({
      meeting_type: item.meeting_type || 'STAFF',
      date: item.date || '',
      participants: item.participants || 0,
      minutes: item.minutes || '',
      decisions: item.decisions || '',
      action_items: item.action_items || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this meeting log?')) {
      try {
        await api.delete(`/meetings/${id}/`);
        toast.success('Meeting log deleted successfully!');
        loadMeetings();
      } catch (error) {
        console.error('Error deleting meeting:', error);
        toast.error('Failed to delete meeting.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/meetings/${editingId}/`, formData);
        toast.success('Meeting details updated successfully!');
      } else {
        await api.post('/meetings/', formData);
        toast.success('Meeting details recorded successfully!');
      }
      handleClose();
      loadMeetings();
    } catch (error) {
      console.error('Error saving meeting:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  // Filtered list
  const filteredMeetings = meetings.filter(
    (item) =>
      item.meeting_type?.toLowerCase().includes(search.toLowerCase()) ||
      item.minutes?.toLowerCase().includes(search.toLowerCase()) ||
      item.decisions?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalMeetings = meetings.length;
  const totalParticipants = meetings.reduce((sum, m) => sum + (m.participants || 0), 0);
  const avgParticipants = meetings.length ? Math.round(totalParticipants / meetings.length) : 0;

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>System Meetings</h1>
          <p>Log minutes, resolutions, and trace action items from internal staff and external community meetings.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Record New Meeting
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Meetings Logged</h3>
          <div className="value">{totalMeetings}</div>
        </div>
        <div className="stats-card">
          <h3>Total Participants</h3>
          <div className="value">{totalParticipants}</div>
        </div>
        <div className="stats-card">
          <h3>Average Attendance</h3>
          <div className="value">{avgParticipants}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by meeting type, minutes or decisions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading meetings...</div>
        ) : filteredMeetings.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={48} className="empty-state-icon" />
            <p>No meetings found. Click "Record New Meeting" to log one.</p>
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Meeting Type</th>
                <th>Date</th>
                <th>Participants</th>
                <th>Minutes Abstract</th>
                <th>Decisions Made</th>
                <th>Action Items</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeetings.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{
                      background: 'rgba(28, 126, 196, 0.08)',
                      color: '#1c7ec4',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {MEETING_TYPES.find(t => t.value === item.meeting_type)?.label || item.meeting_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5a5c74' }}>
                      <Calendar size={14} />
                      {item.date}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Users size={14} style={{ color: '#8890a6' }} />
                      {item.participants}
                    </div>
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.minutes}>
                    {item.minutes}
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.decisions}>
                    {item.decisions || 'None'}
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.action_items}>
                    {item.action_items || 'None'}
                  </td>
                  <td>
                    <div className="action-buttons-group">
                      <button 
                        className="btn-icon" 
                        title="View Meeting"
                        onClick={() => setViewItem(item)}
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Edit Meeting"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit size={14} style={{ color: '#2F9E68' }} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Delete Meeting"
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
              <h2>{editingId ? 'Edit Meeting Details' : 'Record Meeting Minutes & Resolutions'}</h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Meeting Type</label>
                    <select
                      name="meeting_type"
                      value={formData.meeting_type}
                      onChange={handleInputChange}
                      required
                    >
                      {MEETING_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date Held</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Number of Participants</label>
                    <input
                      type="number"
                      name="participants"
                      value={formData.participants}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Meeting Minutes / Summary</label>
                    <textarea
                      name="minutes"
                      rows="3"
                      placeholder="Write discussions summary, remarks, topics discussed..."
                      value={formData.minutes}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Key Decisions Made</label>
                    <textarea
                      name="decisions"
                      rows="2"
                      placeholder="Enter resolution details, policy agreements..."
                      value={formData.decisions}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Action Items Assigned</label>
                    <textarea
                      name="action_items"
                      rows="2"
                      placeholder="e.g. Namono Jane to follow up with Kasawo health center by July 30..."
                      value={formData.action_items}
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
                  {saving ? 'Saving...' : (editingId ? 'Update Minutes' : 'Save Meeting Minutes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <ViewModal
          title="Meeting Details"
          item={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}
    </div>
  );
};

export default Meetings;
