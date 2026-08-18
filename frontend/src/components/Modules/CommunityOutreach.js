import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Megaphone, Calendar, MapPin, Users, Edit, Trash2, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const CommunityOutreach = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [formData, setFormData] = useState({
    activity_name: '',
    participants: 0,
    date: '',
    location: '',
    objectives: '',
    outcomes: '',
    stigma_reduction_feedback: '',
    follow_up_required: false,
    follow_up_date: '',
    follow_up_staff: '',
    follow_up_notes: '',
    follow_up_status: 'PENDING',
    notes: '',
  });

  const loadActivities = async () => {
    setLoading(true);
    try {
      const response = await api.get('/community-outreach/');
      setActivities(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error loading community outreach:', error);
      toast.error('Failed to load community outreach activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'participants' ? parseInt(value) || 0 : value,
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      activity_name: '',
      participants: 0,
      date: '',
      location: '',
      objectives: '',
      outcomes: '',
      stigma_reduction_feedback: '',
      follow_up_required: false,
      follow_up_date: '',
      follow_up_staff: '',
      follow_up_notes: '',
      follow_up_status: 'PENDING',
      notes: '',
    });
  };

  const handleEdit = (item) => {
    setFormData({
      activity_name: item.activity_name || '',
      participants: item.participants || 0,
      date: item.date || '',
      location: item.location || '',
      objectives: item.objectives || '',
      outcomes: item.outcomes || '',
      stigma_reduction_feedback: item.stigma_reduction_feedback || '',
      follow_up_required: item.follow_up_required || false,
      follow_up_date: item.follow_up_date || '',
      follow_up_staff: item.follow_up_staff || '',
      follow_up_notes: item.follow_up_notes || '',
      follow_up_status: item.follow_up_status || 'PENDING',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this outreach activity?')) return;
    try {
      await api.delete(`/community-outreach/${id}/`);
      toast.success('Outreach activity deleted successfully!');
      loadActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/community-outreach/${editingId}/`, formData);
        toast.success('Community outreach activity updated successfully!');
      } else {
        await api.post('/community-outreach/', formData);
        toast.success('Community outreach activity recorded successfully!');
      }
      handleClose();
      loadActivities();
    } catch (error) {
      console.error('Error saving outreach activity:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  const filteredActivities = activities.filter(
    (item) =>
      item.activity_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase()) ||
      item.objectives?.toLowerCase().includes(search.toLowerCase())
  );

  const totalActivities = activities.length;
  const totalParticipants = activities.reduce((sum, a) => sum + (a.participants || 0), 0);
  const averageParticipants = activities.length ? Math.round(totalParticipants / activities.length) : 0;

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Community Outreach</h1>
          <p>Document community advocacy activities, awareness meetings, and trace public engagement metrics.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Outreach Activity
        </button>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <h3>Outreach Events</h3>
          <div className="value">{totalActivities}</div>
        </div>
        <div className="stats-card">
          <h3>Total Engaged</h3>
          <div className="value">{totalParticipants}</div>
        </div>
        <div className="stats-card">
          <h3>Avg. Engagement / Event</h3>
          <div className="value">{averageParticipants}</div>
        </div>
      </div>

      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search by event title, location, or objectives..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading activities data...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="empty-state">
            <Megaphone size={48} className="empty-state-icon" />
            <p>No community activities found. Click "New Outreach Activity" to add one.</p>
          </div>
        ) : isMobile ? (
          <div className="cards-list">
            {filteredActivities.map((item) => (
              <div className="child-card" key={item.id}>
                <div className="child-card-top">
                  <div className="child-meta">
                    <div className="child-name">{item.activity_name}</div>
                    <div className="child-sub">{item.date} • {item.location}</div>
                  </div>
                </div>
                <div className="child-card-body">
                  <div><strong>Participants:</strong> {item.participants}</div>
                  <div><strong>Objectives:</strong> <span style={{ fontWeight: 400 }}>{item.objectives}</span></div>
                  <div><strong>Outcomes:</strong> <span style={{ fontWeight: 400 }}>{item.outcomes}</span></div>
                  <div><strong>Follow-up Status:</strong> <span style={{ fontWeight: 400 }}>{item.follow_up_status}</span></div>
                  {item.follow_up_required && (
                    <>
                      <div><strong>Follow-up Date:</strong> <span style={{ fontWeight: 400 }}>{item.follow_up_date || 'Not set'}</span></div>
                      <div><strong>Follow-up Staff:</strong> <span style={{ fontWeight: 400 }}>{item.follow_up_staff || 'Unassigned'}</span></div>
                    </>
                  )}
                </div>
                <div className="child-card-actions">
                  <button className="btn-icon" title="Edit" onClick={() => handleEdit(item)}><Edit size={16} style={{ color: '#2F9E68' }} /></button>
                  <button className="btn-icon" title="Delete" onClick={() => handleDelete(item.id)}><Trash2 size={16} style={{ color: '#C94B4B' }} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Activity / Event Name</th>
                <th>Date</th>
                <th>Location</th>
                <th>Participants</th>
                <th>Objectives</th>
                <th>Outcomes</th>
                <th>Follow-up</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#0f2d60' }}>
                      <Megaphone size={14} style={{ color: '#1c7ec4' }} />
                      {item.activity_name}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5a5c74' }}>
                      <Calendar size={14} />
                      {item.date}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} style={{ color: '#8890a6' }} />
                      {item.location}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Users size={14} style={{ color: '#8890a6' }} />
                      {item.participants}
                    </div>
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }} title={item.objectives}>
                    {item.objectives}
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }} title={item.outcomes}>
                    {item.outcomes}
                  </td>
                  <td className="followup-cell">
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: item.follow_up_status === 'COMPLETED' ? '#16A34A' : item.follow_up_status === 'CANCELLED' ? '#C94B4B' : '#1C7EC4' }}>
                        {item.follow_up_status?.charAt(0) + item.follow_up_status?.slice(1).toLowerCase() || 'Pending'}
                      </span>
                      {item.follow_up_required ? (
                        <>
                          <span style={{ fontSize: '12px', color: '#5a5c74' }}>{item.follow_up_date || 'Date not set'}</span>
                          <span style={{ fontSize: '12px', color: '#5a5c74' }}>{item.follow_up_staff || 'Staff not assigned'}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>No follow-up action required</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons-group">
                      <button 
                        className="btn-icon" 
                        title="View Event"
                        onClick={() => setViewItem(item)}
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Edit Event"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit size={14} style={{ color: '#2F9E68' }} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Delete Event"
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
              <h2>{editingId ? 'Edit Outreach Event' : 'Record New Community Activity'}</h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Activity / Event Name</label>
                    <input
                      type="text"
                      name="activity_name"
                      placeholder="e.g. Disability Awareness Dialogue Meeting"
                      value={formData.activity_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date Conducted</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Location / Venue</label>
                    <input
                      type="text"
                      name="location"
                      placeholder="e.g. Kasawo Sub-county Headquarters"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Participants</label>
                    <input
                      type="number"
                      name="participants"
                      min="0"
                      value={formData.participants}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Objectives</label>
                    <textarea name="objectives" value={formData.objectives} onChange={handleInputChange} rows={3} />
                  </div>

                  <div className="form-group full-width">
                    <label>Outcomes</label>
                    <textarea name="outcomes" value={formData.outcomes} onChange={handleInputChange} rows={3} />
                  </div>

                  <div className="form-group">
                    <label>
                      <input type="checkbox" name="follow_up_required" checked={!!formData.follow_up_required} onChange={handleCheckboxChange} /> Follow-up required
                    </label>
                  </div>

                  {formData.follow_up_required && (
                    <>
                      <div className="form-group">
                        <label>Follow-up Date</label>
                        <input type="date" name="follow_up_date" value={formData.follow_up_date} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Follow-up Staff</label>
                        <input type="text" name="follow_up_staff" value={formData.follow_up_staff} onChange={handleInputChange} />
                      </div>
                    </>
                  )}

                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Event' : 'Save Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <ViewModal
          title="Community Activity Details"
          item={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}
    </div>
  );
};

export default CommunityOutreach;
