import React, { useState, useEffect } from 'react';
import { Plus, Search, X, ClipboardCheck, User, Calendar, Tag, BookOpen, Edit, Trash2, Filter, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const ASSESSMENT_TYPES = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'OCCUPATIONAL', label: 'Occupational' },
  { value: 'SPEECH', label: 'Speech' },
  { value: 'PSYCHOLOGICAL', label: 'Psychological' },
  { value: 'DEVELOPMENTAL', label: 'Developmental' },
  { value: 'EDUCATIONAL', label: 'Educational' },
  { value: 'OTHER', label: 'Other' },
];

const Assessments = () => {
  const [assessments, setAssessments] = useState([]);
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
    date: '',
    therapist: '',
    assessment_type: 'PHYSICAL',
    findings: '',
    recommendations: '',
    progress_report: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentsRes, childrenRes, usersRes] = await Promise.all([
        api.get('/assessments/'),
        api.get('/children/'),
        api.get('/users/'),
      ]);

      setAssessments(Array.isArray(assessmentsRes.data) ? assessmentsRes.data : assessmentsRes.data.results || []);
      setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : childrenRes.data.results || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || []);
    } catch (error) {
      console.error('Error loading assessments data:', error);
      toast.error('Failed to load assessments or dropdown data.');
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
      date: '',
      therapist: '',
      assessment_type: 'PHYSICAL',
      findings: '',
      recommendations: '',
      progress_report: '',
    });
  };

  const handleEdit = (item) => {
    setFormData({
      child: item.child || '',
      date: item.date || '',
      therapist: item.therapist || '',
      assessment_type: item.assessment_type || 'PHYSICAL',
      findings: item.findings || '',
      recommendations: item.recommendations || '',
      progress_report: item.progress_report || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      try {
        await api.delete(`/assessments/${id}/`);
        toast.success('Assessment deleted successfully!');
        loadData();
      } catch (error) {
        console.error('Error deleting assessment:', error);
        toast.error('Failed to delete assessment.');
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
        await api.put(`/assessments/${editingId}/`, formData);
        toast.success('Assessment updated successfully!');
      } else {
        await api.post('/assessments/', formData);
        toast.success('Assessment recorded successfully!');
      }
      handleClose();
      loadData();
    } catch (error) {
      console.error('Error saving assessment:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  // Filtered List
  const filteredAssessments = assessments.filter(
    (item) => {
      const matchesSearch =
        item.child_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.assessment_type?.toLowerCase().includes(search.toLowerCase()) ||
        item.findings?.toLowerCase().includes(search.toLowerCase());
      const matchesTherapist = therapistFilter ? String(item.therapist) === String(therapistFilter) : true;
      return matchesSearch && matchesTherapist;
    }
  );

  // Stats
  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(a => a.findings && a.findings.length > 0).length;
  const uniqueChildren = new Set(assessments.map(a => a.child)).size;

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Assessments</h1>
          <p>Track beneficiary diagnostics, initial assessments, and progress reviews over time.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Assessment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Assessments</h3>
          <div className="value">{totalAssessments}</div>
        </div>
        <div className="stats-card">
          <h3>Completed Reviews</h3>
          <div className="value">{completedAssessments}</div>
        </div>
        <div className="stats-card">
          <h3>Children Assessed</h3>
          <div className="value">{uniqueChildren}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-row flex-wrap" style={{ gap: '12px' }}>
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by child name, findings, type..."
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
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading assessments...</div>
        ) : filteredAssessments.length === 0 ? (
          <div className="empty-state">
            <ClipboardCheck size={48} className="empty-state-icon" />
            <p>No assessments recorded. Click "New Assessment" to add one.</p>
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Child</th>
                <th>Date</th>
                <th>Type</th>
                <th>Therapist</th>
                <th>Findings</th>
                <th>Recommendations</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssessments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f2d60' }}>
                      {item.child_name || 'Unknown Child'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a5c74' }}>
                      <Calendar size={14} />
                      {item.date}
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
                      {item.assessment_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} style={{ color: '#8890a6' }} />
                      {item.therapist ? users.find(u => u.id === item.therapist)?.first_name || 'Assigned' : 'Unassigned'}
                    </div>
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.findings}>
                    {item.findings}
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.recommendations}>
                    {item.recommendations}
                  </td>
                  <td>
                     <div className="action-buttons-group">
                       <button
                         className="btn-icon"
                         title="View Assessment"
                         onClick={() => setViewItem(item)}
                       >
                         <Eye size={14} />
                       </button>
                       <button 
                         className="btn-icon" 
                         title="Edit Assessment"
                         onClick={() => handleEdit(item)}
                       >
                         <Edit size={14} style={{ color: '#2F9E68' }} />
                       </button>
                       <button 
                         className="btn-icon" 
                         title="Delete Assessment"
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
      {viewItem && (
        <ViewModal title="Assessment Details" item={viewItem} onClose={() => setViewItem(null)} />
      )}

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Assessment' : 'Record New Assessment'}</h2>
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
                      value={formData.child}
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
                    <label>Assessment Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Assessment Type</label>
                    <select
                      name="assessment_type"
                      value={formData.assessment_type}
                      onChange={handleInputChange}
                      required
                    >
                      {ASSESSMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Select Therapist / Assessor</label>
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
                  <div className="form-group full-width">
                    <label>Clinical Findings</label>
                    <textarea
                      name="findings"
                      rows="3"
                      placeholder="Describe diagnostic observations and results..."
                      value={formData.findings}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Recommendations</label>
                    <textarea
                      name="recommendations"
                      rows="3"
                      placeholder="Suggested therapies, devices, or exercises..."
                      value={formData.recommendations}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Progress Report / Notes</label>
                    <textarea
                      name="progress_report"
                      rows="3"
                      placeholder="Details on overall development and next milestone targets..."
                      value={formData.progress_report}
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
                  {saving ? 'Saving...' : (editingId ? 'Update Assessment' : 'Save Assessment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessments;

