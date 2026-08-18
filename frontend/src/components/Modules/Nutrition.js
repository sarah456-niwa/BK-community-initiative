import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Apple, Calendar, Scale, Users, Edit, Trash2, Eye } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ViewModal from '../../components/Common/ViewModal';
import './Modules.css';

const Nutrition = () => {
  const [activeTab, setActiveTab] = useState('assessment');
  const [assessments, setAssessments] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [assessmentForm, setAssessmentForm] = useState({
    child: '',
    assessment_date: '',
    nutrition_status: '',
    food_ration: '',
    supplement: '',
    weight: '',
    height: '',
    notes: '',
  });

  const [parcelForm, setParcelForm] = useState({
    family_name: '',
    parcel_type: '',
    date_distributed: '',
    quantity: 1,
    items_included: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentsRes, parcelsRes, childrenRes] = await Promise.all([
        api.get('/nutrition/'),
        api.get('/food-parcels/'),
        api.get('/children/'),
      ]);

      setAssessments(Array.isArray(assessmentsRes.data) ? assessmentsRes.data : assessmentsRes.data.results || []);
      setParcels(Array.isArray(parcelsRes.data) ? parcelsRes.data : parcelsRes.data.results || []);
      setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : childrenRes.data.results || []);
    } catch (error) {
      console.error('Error loading nutrition data:', error);
      toast.error('Failed to load nutrition records or family parcels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-calculate BMI and suggest Nutrition Status
  const handleAssessmentChange = (e) => {
    const { name, value } = e.target;
    setAssessmentForm((prev) => {
      const numVal = name === 'weight' || name === 'height' ? parseFloat(value) || '' : value;
      const updated = {
        ...prev,
        [name]: numVal,
      };

      const w = name === 'weight' ? parseFloat(value) || 0 : parseFloat(prev.weight) || 0;
      const h = name === 'height' ? parseFloat(value) || 0 : parseFloat(prev.height) || 0;

      if (w > 0 && h > 0) {
        const heightMeters = h / 100;
        const bmi = (w / (heightMeters * heightMeters)).toFixed(1);
        let status = 'Normal Weight';
        if (bmi < 12) status = 'Severe Malnutrition';
        else if (bmi < 14) status = 'Moderate Malnutrition';
        else if (bmi < 16) status = 'Mild Malnutrition';
        else if (bmi > 25) status = 'Overweight';

        updated.nutrition_status = `${status} (BMI: ${bmi})`;
      }
      return updated;
    });
  };

  const handleParcelChange = (e) => {
    const { name, value } = e.target;
    setParcelForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setAssessmentForm({
      child: '',
      assessment_date: '',
      nutrition_status: '',
      food_ration: '',
      supplement: '',
      weight: '',
      height: '',
      notes: '',
    });
    setParcelForm({
      family_name: '',
      parcel_type: '',
      date_distributed: '',
      quantity: 1,
      items_included: '',
      notes: '',
    });
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    if (activeTab === 'assessment') {
      setAssessmentForm({
        child: item.child || '',
        assessment_date: item.assessment_date || '',
        nutrition_status: item.nutrition_status || '',
        food_ration: item.food_ration || '',
        supplement: item.supplement || '',
        weight: item.weight || '',
        height: item.height || '',
        notes: item.notes || '',
      });
    } else {
      setParcelForm({
        family_name: item.family_name || '',
        parcel_type: item.parcel_type || '',
        date_distributed: item.date_distributed || '',
        quantity: item.quantity || 1,
        items_included: item.items_included || '',
        notes: item.notes || '',
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const endpoint = activeTab === 'assessment' ? `/nutrition/${id}/` : `/food-parcels/${id}/`;
    if (window.confirm(`Are you sure you want to delete this ${activeTab === 'assessment' ? 'nutrition assessment' : 'food parcel'} record?`)) {
      try {
        await api.delete(endpoint);
        toast.success('Record deleted successfully!');
        loadData();
      } catch (error) {
        console.error('Error deleting nutrition record:', error);
        toast.error('Failed to delete nutrition record.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (activeTab === 'assessment') {
        if (!assessmentForm.child) {
          toast.error('Please select a child.');
          setSaving(false);
          return;
        }
        if (editingId) {
          await api.put(`/nutrition/${editingId}/`, assessmentForm);
          toast.success('Child nutrition assessment updated!');
        } else {
          await api.post('/nutrition/', assessmentForm);
          toast.success('Child nutrition assessment logged with auto BMI status!');
        }
      } else {
        if (editingId) {
          await api.put(`/food-parcels/${editingId}/`, parcelForm);
          toast.success('Food parcel delivery updated!');
        } else {
          await api.post('/food-parcels/', parcelForm);
          toast.success('Food parcel delivery logged!');
        }
      }
      handleClose();
      loadData();
    } catch (error) {
      console.error('Error saving nutrition data:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists
  const filteredAssessments = assessments.filter(
    (item) =>
      item.child_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.nutrition_status?.toLowerCase().includes(search.toLowerCase()) ||
      item.food_ration?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredParcels = parcels.filter(
    (item) =>
      item.family_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.parcel_type?.toLowerCase().includes(search.toLowerCase()) ||
      item.items_included?.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-calculated Stats
  const totalNutritionAssessments = assessments.length;
  const uniqueSupportedChildren = new Set(assessments.map(a => a.child)).size;
  const totalParcelsDelivered = parcels.reduce((sum, p) => sum + (p.quantity || 0), 0);

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Nutrition Support</h1>
          <p>Monitor child anthropometric metrics (auto BMI calculation) and track family food parcel rations.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Record New Entry
        </button>
      </div>

      {/* Auto-Calculated Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Assessments Logged</h3>
          <div className="value">{totalNutritionAssessments}</div>
        </div>
        <div className="stats-card">
          <h3>Total Children Monitored</h3>
          <div className="value">{uniqueSupportedChildren}</div>
        </div>
        <div className="stats-card">
          <h3>Total Food Parcels Delivered</h3>
          <div className="value">{totalParcelsDelivered}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'assessment' ? 'active' : ''}`}
          onClick={() => { setActiveTab('assessment'); setSearch(''); }}
        >
          Child Assessments
        </button>
        <button
          className={`tab-btn ${activeTab === 'parcel' ? 'active' : ''}`}
          onClick={() => { setActiveTab('parcel'); setSearch(''); }}
        >
          Family Food Parcels
        </button>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={
              activeTab === 'assessment'
                ? 'Search by child name, status, or ration...'
                : 'Search by family name, parcel type, items...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Cards */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading nutrition records...</div>
        ) : activeTab === 'assessment' ? (
          filteredAssessments.length === 0 ? (
            <div className="empty-state">
              <Apple size={48} className="empty-state-icon" />
              <p>No nutrition assessments recorded. Click "Record New Entry" to add one.</p>
            </div>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Assessment Date</th>
                  <th>Status & Auto BMI</th>
                  <th>Weight (kg)</th>
                  <th>Height (cm)</th>
                  <th>Food Ration</th>
                  <th>Supplement</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f2d60' }}>{item.child_name || 'Unknown Child'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a5c74' }}>
                        <Calendar size={14} />
                        {item.assessment_date}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        background: '#e8f0fe',
                        color: '#1c7ec4',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {item.nutrition_status || 'Normal'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Scale size={13} style={{ color: '#8890a6' }} />
                        {item.weight ? `${item.weight} kg` : 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        {item.height ? `${item.height} cm` : 'N/A'}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.food_ration || 'None'}</td>
                    <td>{item.supplement || 'None'}</td>
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
          )
        ) : (
          filteredParcels.length === 0 ? (
            <div className="empty-state">
              <Users size={48} className="empty-state-icon" />
              <p>No family parcels distributions logged. Click "Record New Entry" to log one.</p>
            </div>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Family/Caregiver Name</th>
                  <th>Parcel Type</th>
                  <th>Quantity</th>
                  <th>Date Delivered</th>
                  <th>Items Included</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParcels.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: '#0f2d60' }}>{item.family_name}</td>
                    <td style={{ fontWeight: 600 }}>{item.parcel_type}</td>
                    <td style={{ fontWeight: 600 }}>x{item.quantity}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a5c74' }}>
                        <Calendar size={14} />
                        {item.date_distributed}
                      </div>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.items_included}>
                      {item.items_included}
                    </td>
                    <td style={{ color: '#5a5c74', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                      {item.notes || 'None'}
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button 
                          className="btn-icon" 
                          title="View Parcel"
                          onClick={() => setViewItem(item)}
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Edit Parcel"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit size={14} style={{ color: '#2F9E68' }} />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Delete Parcel"
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

      {viewItem && (
        <ViewModal title={activeTab === 'assessment' ? 'Assessment Details' : 'Parcel Details'} item={viewItem} onClose={() => setViewItem(null)} />
      )}
      {/* Form Modal with Auto-BMI Calculation */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {editingId ? 'Edit' : 'Record New'} {activeTab === 'assessment' ? 'Child Nutrition Assessment' : 'Family Food Parcel'}
              </h2>
              <button className="close-btn" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {activeTab === 'assessment' ? (
                    <>
                      <div className="form-group">
                        <label>Select Child</label>
                        <select
                          name="child"
                          value={assessmentForm.child}
                          onChange={handleAssessmentChange}
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
                          name="assessment_date"
                          value={assessmentForm.assessment_date}
                          onChange={handleAssessmentChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Weight (kg)</label>
                        <input
                          type="number"
                          name="weight"
                          step="0.01"
                          placeholder="e.g. 14.5"
                          value={assessmentForm.weight}
                          onChange={handleAssessmentChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Height (cm)</label>
                        <input
                          type="number"
                          name="height"
                          step="0.1"
                          placeholder="e.g. 98.0"
                          value={assessmentForm.height}
                          onChange={handleAssessmentChange}
                          required
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Calculated Nutrition Status (Auto BMI)</label>
                        <input
                          type="text"
                          name="nutrition_status"
                          value={assessmentForm.nutrition_status || 'Enter weight & height to auto-calculate'}
                          onChange={handleAssessmentChange}
                          placeholder="Auto-calculated from weight and height"
                          style={{ background: '#eef0f8', color: '#1c7ec4', fontWeight: 'bold' }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Food Ration Allocated</label>
                        <input
                          type="text"
                          name="food_ration"
                          placeholder="e.g. Soy Porridge Kit, None"
                          value={assessmentForm.food_ration}
                          onChange={handleAssessmentChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Supplement Type</label>
                        <input
                          type="text"
                          name="supplement"
                          placeholder="e.g. Vitamin A drops, Zinc..."
                          value={assessmentForm.supplement}
                          onChange={handleAssessmentChange}
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Assessment Remarks / Progress Notes</label>
                        <textarea
                          name="notes"
                          rows="3"
                          placeholder="Caregiver remarks, child eating behaviors, dietary recommendations..."
                          value={assessmentForm.notes}
                          onChange={handleAssessmentChange}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group full-width">
                        <label>Family/Caregiver Name</label>
                        <input
                          type="text"
                          name="family_name"
                          placeholder="e.g. Family of Child BK-CH-2024-0012, or Caregiver Jane..."
                          value={parcelForm.family_name}
                          onChange={handleParcelChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Parcel Type</label>
                        <input
                          type="text"
                          name="parcel_type"
                          placeholder="e.g. Standard Ration, High Energy Kit"
                          value={parcelForm.parcel_type}
                          onChange={handleParcelChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantity Delivered</label>
                        <input
                          type="number"
                          name="quantity"
                          min="1"
                          value={parcelForm.quantity}
                          onChange={handleParcelChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Date Distributed</label>
                        <input
                          type="date"
                          name="date_distributed"
                          value={parcelForm.date_distributed}
                          onChange={handleParcelChange}
                          required
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Items Included</label>
                        <textarea
                          name="items_included"
                          rows="2"
                          placeholder="e.g. Maize Flour 10kg, Beans 5kg, Cooking Oil 2L, Fortified Soy..."
                          value={parcelForm.items_included}
                          onChange={handleParcelChange}
                          required
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Distribution Remarks</label>
                        <textarea
                          name="notes"
                          rows="2"
                          placeholder="Delivery confirmation notes, recipient remarks..."
                          value={parcelForm.notes}
                          onChange={handleParcelChange}
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
                  {saving ? 'Saving...' : (editingId ? 'Update Log' : 'Save Nutrition Log')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nutrition;
