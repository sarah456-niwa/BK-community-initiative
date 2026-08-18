import React, { useState, useEffect } from 'react';
import { Plus, Search, X, GraduationCap, Calendar, Users, FileText, Gift, Edit, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const Training = () => {
  const [activeTab, setActiveTab] = useState('training');
  const [trainings, setTrainings] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [trainingForm, setTrainingForm] = useState({
    workshop_name: '',
    date: '',
    trainer: '',
    attendance: 0,
    topics: '',
    evaluation: '',
    knowledge_improvement: '',
    materials_distributed: 0,
  });

  const [materialForm, setMaterialForm] = useState({
    material_name: '',
    quantity: 1,
    date_distributed: '',
    recipient: '',
    purpose: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [trainingsRes, materialsRes] = await Promise.all([
        api.get('/training/'),
        api.get('/materials/'),
      ]);

      setTrainings(Array.isArray(trainingsRes.data) ? trainingsRes.data : trainingsRes.data.results || []);
      setMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : materialsRes.data.results || []);
    } catch (error) {
      console.error('Error loading training data:', error);
      toast.error('Failed to load training or material data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTrainingChange = (e) => {
    const { name, value } = e.target;
    setTrainingForm(prev => ({
      ...prev,
      [name]: name === 'attendance' || name === 'materials_distributed' ? parseInt(value) || 0 : value
    }));
  };

  const handleMaterialChange = (e) => {
    const { name, value } = e.target;
    setMaterialForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setTrainingForm({
      workshop_name: '',
      date: '',
      trainer: '',
      attendance: 0,
      topics: '',
      evaluation: '',
      knowledge_improvement: '',
      materials_distributed: 0,
    });
    setMaterialForm({
      material_name: '',
      quantity: 1,
      date_distributed: '',
      recipient: '',
      purpose: '',
    });
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    if (activeTab === 'training') {
      setTrainingForm({
        workshop_name: item.workshop_name || '',
        date: item.date || '',
        trainer: item.trainer || '',
        attendance: item.attendance || 0,
        topics: item.topics || '',
        evaluation: item.evaluation || '',
        knowledge_improvement: item.knowledge_improvement || '',
        materials_distributed: item.materials_distributed || 0,
      });
    } else {
      setMaterialForm({
        material_name: item.material_name || '',
        quantity: item.quantity || 1,
        date_distributed: item.date_distributed || '',
        recipient: item.recipient || '',
        purpose: item.purpose || '',
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const endpoint = activeTab === 'training' ? `/training/${id}/` : `/materials/${id}/`;
    if (window.confirm(`Are you sure you want to delete this ${activeTab === 'training' ? 'workshop' : 'material distribution'} record?`)) {
      try {
        await api.delete(endpoint);
        toast.success('Record deleted successfully!');
        loadData();
      } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Failed to delete record.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (activeTab === 'training') {
        if (editingId) {
          await api.put(`/training/${editingId}/`, trainingForm);
          toast.success('Caregiver training workshop updated!');
        } else {
          await api.post('/training/', trainingForm);
          toast.success('Caregiver training workshop recorded!');
        }
      } else {
        if (editingId) {
          await api.put(`/materials/${editingId}/`, materialForm);
          toast.success('Educational material distribution updated!');
        } else {
          await api.post('/materials/', materialForm);
          toast.success('Educational material distribution logged!');
        }
      }
      handleClose();
      loadData();
    } catch (error) {
      console.error('Error saving training data:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists
  const filteredTrainings = trainings.filter(
    (item) =>
      item.workshop_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.trainer?.toLowerCase().includes(search.toLowerCase()) ||
      item.topics?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMaterials = materials.filter(
    (item) =>
      item.material_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.recipient?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalWorkshops = trainings.length;
  const totalTrained = trainings.reduce((sum, t) => sum + (t.attendance || 0), 0);
  const totalMaterialsDistributed = materials.reduce((sum, m) => sum + (m.quantity || 0), 0);

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Caregiver Training & Materials</h1>
          <p>Organize caregiver empowerment workshops, trace workshop attendance, and log distributed education kits.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Record New Entry
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Workshops Completed</h3>
          <div className="value">{totalWorkshops}</div>
        </div>
        <div className="stats-card">
          <h3>Caregivers Trained</h3>
          <div className="value">{totalTrained}</div>
        </div>
        <div className="stats-card">
          <h3>Educational Kits Distributed</h3>
          <div className="value">{totalMaterialsDistributed}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'training' ? 'active' : ''}`}
          onClick={() => { setActiveTab('training'); setSearch(''); }}
        >
          Workshops
        </button>
        <button
          className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => { setActiveTab('materials'); setSearch(''); }}
        >
          Educational Materials
        </button>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={
              activeTab === 'training'
                ? 'Search by workshop title, trainer, or topics...'
                : 'Search by material name or recipient...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Cards */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading training data...</div>
        ) : activeTab === 'training' ? (
          filteredTrainings.length === 0 ? (
            <div className="empty-state">
              <GraduationCap size={48} className="empty-state-icon" />
              <p>No workshops recorded. Click "Record New Entry" to add one.</p>
            </div>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Workshop Name</th>
                  <th>Date</th>
                  <th>Trainer</th>
                  <th>Attendance</th>
                  <th>Kits Shared</th>
                  <th>Topics Covered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f2d60' }}>{item.workshop_name}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a5c74' }}>
                        <Calendar size={14} />
                        {item.date}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.trainer}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <Users size={14} style={{ color: '#8890a6' }} />
                        {item.attendance}
                      </div>
                    </td>
                    <td>{item.materials_distributed || 0} kits</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }} title={item.topics}>
                      {item.topics}
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button 
                          className="btn-icon" 
                          title="Edit Workshop"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit size={14} style={{ color: '#2F9E68' }} />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Delete Workshop"
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
          )
        ) : (
          filteredMaterials.length === 0 ? (
            <div className="empty-state">
              <Gift size={48} className="empty-state-icon" />
              <p>No material distributions logged. Click "Record New Entry" to log one.</p>
            </div>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Material / Kit Name</th>
                  <th>Recipient Name</th>
                  <th>Quantity</th>
                  <th>Date Distributed</th>
                  <th>Purpose</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.material_name}</td>
                    <td style={{ fontWeight: 600, color: '#0f2d60' }}>{item.recipient}</td>
                    <td style={{ fontWeight: 600 }}>x{item.quantity}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a5c74' }}>
                        <Calendar size={14} />
                        {item.date_distributed}
                      </div>
                    </td>
                    <td style={{ color: '#5a5c74', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }} title={item.purpose}>
                      {item.purpose || 'N/A'}
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button 
                          className="btn-icon" 
                          title="Edit Material"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit size={14} style={{ color: '#2F9E68' }} />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Delete Material"
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
          )
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {editingId ? 'Edit' : 'Record New'} {activeTab === 'training' ? 'Caregiver Workshop' : 'Material Distribution'}
              </h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {activeTab === 'training' ? (
                    <>
                      <div className="form-group full-width">
                        <label>Workshop Title / Theme</label>
                        <input
                          type="text"
                          name="workshop_name"
                          placeholder="e.g. Caregiver Physiotherapy Routine Training"
                          value={trainingForm.workshop_name}
                          onChange={handleTrainingChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Date Conducted</label>
                        <input
                          type="date"
                          name="date"
                          value={trainingForm.date}
                          onChange={handleTrainingChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Trainer / Facilitator</label>
                        <input
                          type="text"
                          name="trainer"
                          placeholder="e.g. Lead Therapist Namono Jane"
                          value={trainingForm.trainer}
                          onChange={handleTrainingChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Caregivers Attended</label>
                        <input
                          type="number"
                          name="attendance"
                          min="0"
                          value={trainingForm.attendance}
                          onChange={handleTrainingChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Kits Distributed</label>
                        <input
                          type="number"
                          name="materials_distributed"
                          min="0"
                          value={trainingForm.materials_distributed}
                          onChange={handleTrainingChange}
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Topics Covered</label>
                        <textarea
                          name="topics"
                          rows="2"
                          placeholder="e.g. Basic sensory stimulation, home exercise routines, nutrition guidelines..."
                          value={trainingForm.topics}
                          onChange={handleTrainingChange}
                          required
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Evaluation / Feedback Summary</label>
                        <textarea
                          name="evaluation"
                          rows="2"
                          placeholder="Feedback from caregivers regarding workshop clarity..."
                          value={trainingForm.evaluation}
                          onChange={handleTrainingChange}
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Knowledge Improvement Indicators</label>
                        <textarea
                          name="knowledge_improvement"
                          rows="2"
                          placeholder="Pre-workshop vs post-workshop evaluation summary..."
                          value={trainingForm.knowledge_improvement}
                          onChange={handleTrainingChange}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group full-width">
                        <label>Educational Material / Book / Kit Name</label>
                        <input
                          type="text"
                          name="material_name"
                          placeholder="e.g. Caregiver Guidebook on Cerebral Palsy"
                          value={materialForm.material_name}
                          onChange={handleMaterialChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantity Distributed</label>
                        <input
                          type="number"
                          name="quantity"
                          min="1"
                          value={materialForm.quantity}
                          onChange={handleMaterialChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Date Distributed</label>
                        <input
                          type="date"
                          name="date_distributed"
                          value={materialForm.date_distributed}
                          onChange={handleMaterialChange}
                          required
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Recipient Name / Group</label>
                        <input
                          type="text"
                          name="recipient"
                          placeholder="e.g. Mukono Caregiver Support Group, or individual name..."
                          value={materialForm.recipient}
                          onChange={handleMaterialChange}
                          required
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Purpose / Remarks</label>
                        <textarea
                          name="purpose"
                          rows="3"
                          placeholder="e.g. Provide guidelines for home exercises to Kasawo village caregivers..."
                          value={materialForm.purpose}
                          onChange={handleMaterialChange}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingId ? 'Update Log' : 'Save Training Log')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Training;
