import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Calendar, MapPin, Users, Percent, FileText, Edit, Trash2, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const OutreachClinics = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Form State with Auto-Calculated Attendance Rate
  const [formData, setFormData] = useState({
    date: '',
    district: '',
    village: '',
    venue: '',
    staff_involved: '',
    target_attendance: 50,
    number_attended: 0,
    attendance_rate: 0.0,
    notes: '',
  });

  const loadClinics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/outreach/');
      setClinics(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error loading outreach clinics:', error);
      toast.error('Failed to load outreach clinics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const numVal = name === 'number_attended' || name === 'target_attendance' ? parseInt(value) || 0 : value;
      const updated = {
        ...prev,
        [name]: numVal,
      };

      // Auto-calculate attendance rate
      const attended = name === 'number_attended' ? parseInt(value) || 0 : prev.number_attended;
      const target = name === 'target_attendance' ? parseInt(value) || 0 : prev.target_attendance || 50;
      const computedRate = target > 0 ? parseFloat(((attended / target) * 100).toFixed(1)) : 0.0;
      
      updated.attendance_rate = computedRate;
      return updated;
    });
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      date: '',
      district: '',
      village: '',
      venue: '',
      staff_involved: '',
      target_attendance: 50,
      number_attended: 0,
      attendance_rate: 0.0,
      notes: '',
    });
  };

  const handleEdit = (item) => {
    const calculatedTarget = item.attendance_rate > 0 ? Math.round(item.number_attended / (item.attendance_rate / 100)) : 50;
    setFormData({
      date: item.date || '',
      district: item.district || '',
      village: item.village || '',
      venue: item.venue || '',
      staff_involved: item.staff_involved || '',
      target_attendance: calculatedTarget,
      number_attended: item.number_attended || 0,
      attendance_rate: item.attendance_rate || 0.0,
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this outreach clinic?')) {
      try {
        await api.delete(`/outreach/${id}/`);
        toast.success('Outreach clinic deleted successfully!');
        loadClinics();
      } catch (error) {
        console.error('Error deleting outreach clinic:', error);
        toast.error('Failed to delete outreach clinic.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: formData.date,
        district: formData.district,
        village: formData.village,
        venue: formData.venue,
        staff_involved: formData.staff_involved,
        number_attended: formData.number_attended,
        attendance_rate: formData.attendance_rate,
        notes: formData.notes,
      };
      
      if (editingId) {
        await api.put(`/outreach/${editingId}/`, payload);
        toast.success('Outreach clinic updated successfully!');
      } else {
        await api.post('/outreach/', payload);
        toast.success('Outreach clinic recorded! Attendance rate auto-calculated.');
      }
      handleClose();
      loadClinics();
    } catch (error) {
      console.error('Error saving outreach clinic:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  // Filtered list
  const filteredClinics = clinics.filter(
    (clinic) =>
      clinic.venue?.toLowerCase().includes(search.toLowerCase()) ||
      clinic.district?.toLowerCase().includes(search.toLowerCase()) ||
      clinic.village?.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-Calculated Stats across all clinics
  const totalClinics = clinics.length;
  const totalAttended = clinics.reduce((sum, c) => sum + (c.number_attended || 0), 0);
  const avgAttendanceRate = clinics.length
    ? (clinics.reduce((sum, c) => sum + parseFloat(c.attendance_rate || 0), 0) / clinics.length).toFixed(1)
    : '0.0';

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Outreach Clinics</h1>
          <p>Schedule, document, and monitor mobile outreach clinics with automated attendance rates.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Outreach Clinic
        </button>
      </div>

      {/* Auto-Calculated Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Clinics Registered</h3>
          <div className="value">{totalClinics}</div>
        </div>
        <div className="stats-card">
          <h3>Total Children Attended</h3>
          <div className="value">{totalAttended}</div>
        </div>
        <div className="stats-card">
          <h3>System Avg. Attendance Rate</h3>
          <div className="value">{avgAttendanceRate}%</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by venue, district or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading clinics data...</div>
        ) : filteredClinics.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} className="empty-state-icon" />
            <p>No outreach clinics found. Click "New Outreach Clinic" to add one.</p>
          </div>
        ) : (
          !isMobile ? (
            <table className="responsive-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>District / Village</th>
                <th>Venue</th>
                <th>Attended</th>
                <th>Auto Rate</th>
                <th>Staff Involved</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClinics.map((clinic) => (
                <tr key={clinic.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <Calendar size={14} style={{ color: '#1c7ec4' }} />
                      {clinic.date}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} style={{ color: '#8890a6' }} />
                      {clinic.district} • {clinic.village}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{clinic.venue}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} style={{ color: '#8890a6' }} />
                      {clinic.number_attended}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#2f9e68' }}>
                      <Percent size={12} />
                      {clinic.attendance_rate}%
                    </div>
                  </td>
                  <td style={{ color: '#5a5c74', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={clinic.staff_involved}>
                    {clinic.staff_involved}
                  </td>
                  <td>
                     <div className="action-buttons-group">
                       <button 
                         className="btn-icon" 
                         title="View Clinic"
                         onClick={() => setViewItem(clinic)}
                       >
                         <Eye size={14} />
                       </button>
                       <button 
                         className="btn-icon" 
                         title="Edit Clinic"
                         onClick={() => handleEdit(clinic)}
                       >
                         <Edit size={14} style={{ color: '#2F9E68' }} />
                       </button>
                       <button 
                         className="btn-icon" 
                         title="Delete Clinic"
                         onClick={() => handleDelete(clinic.id)}
                       >
                         <Trash2 size={14} style={{ color: '#C94B4B' }} />
                       </button>
                     </div>
                   </td>
                </tr>
              ))}
              </tbody>
            </table>
          ) : (
            <div className="cards-list">
              {filteredClinics.map((clinic) => (
                <div className="child-card" key={clinic.id}>
                  <div className="child-card-top">
                    <div className="child-meta">
                      <div className="child-name">{clinic.venue}</div>
                      <div className="child-sub">{clinic.date} • {clinic.district} / {clinic.village}</div>
                    </div>
                  </div>
                  <div className="child-card-body">
                    <div><strong>Attended:</strong> {clinic.number_attended}</div>
                    <div><strong>Attendance Rate:</strong> <span style={{ fontWeight: 400 }}>{clinic.attendance_rate}%</span></div>
                    <div><strong>Staff Involved:</strong> <span style={{ fontWeight: 400 }}>{clinic.staff_involved || 'N/A'}</span></div>
                    <div><strong>Notes:</strong> <span style={{ fontWeight: 400 }}>{clinic.notes || '—'}</span></div>
                  </div>
                  <div className="child-card-actions">
                    <button className="btn-icon" title="Edit" onClick={() => handleEdit(clinic)}><Edit size={16} style={{ color: '#2F9E68' }} /></button>
                    <button className="btn-icon" title="Delete" onClick={() => handleDelete(clinic.id)}><Trash2 size={16} style={{ color: '#C94B4B' }} /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Form Modal with Auto-Calculation */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Outreach Clinic' : 'Record New Outreach Clinic'}</h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
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
                    <label>District</label>
                    <input
                      type="text"
                      name="district"
                      placeholder="e.g. Mukono"
                      value={formData.district}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Village</label>
                    <input
                      type="text"
                      name="village"
                      placeholder="e.g. Kasawo"
                      value={formData.village}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue</label>
                    <input
                      type="text"
                      name="venue"
                      placeholder="e.g. Kasawo Health Center III"
                      value={formData.venue}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Target / Expected Attendance</label>
                    <input
                      type="number"
                      name="target_attendance"
                      value={formData.target_attendance}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Actual Children Attended</label>
                    <input
                      type="number"
                      name="number_attended"
                      value={formData.number_attended}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Calculated Attendance Rate (%)</label>
                    <input
                      type="text"
                      value={`${formData.attendance_rate}% (Auto-Calculated)`}
                      disabled
                      style={{ background: '#eef0f8', color: '#1c7ec4', fontWeight: 'bold' }}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Staff Involved</label>
                    <input
                      type="text"
                      name="staff_involved"
                      placeholder="e.g. Dr. Jane Namono, Therapist Mark Lwanga"
                      value={formData.staff_involved}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Notes / Observations</label>
                    <textarea
                      name="notes"
                      rows="3"
                      placeholder="Enter challenges, findings, or cases referenced..."
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
                  {saving ? 'Saving...' : (editingId ? 'Update Clinic Session' : 'Save Clinic Session')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <ViewModal
          title="Outreach Clinic Details"
          item={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}
    </div>
  );
};

export default OutreachClinics;
