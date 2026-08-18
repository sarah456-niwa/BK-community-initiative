import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Accessibility, User, Calendar, Settings, Activity, Edit, Trash2, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const CONDITION_CHOICES = [
  { value: 'NEW', label: 'New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'NEEDS_REPLACEMENT', label: 'Needs Replacement' },
];

const Devices = () => {
  const [activeTab, setActiveTab] = useState('assistive');
  const [assistiveDevices, setAssistiveDevices] = useState([]);
  const [sensoryDevices, setSensoryDevices] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  // Form State
  const [assistiveForm, setAssistiveForm] = useState({
    child: '',
    device_type: '',
    date_issued: '',
    serial_number: '',
    condition: 'NEW',
    replacement_date: '',
    notes: '',
  });

  const [sensoryForm, setSensoryForm] = useState({
    child: '',
    device_name: '',
    quantity: 1,
    date_distributed: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [assistiveRes, sensoryRes, childrenRes] = await Promise.all([
        api.get('/devices/'),
        api.get('/sensory-devices/'),
        api.get('/children/'),
      ]);

      setAssistiveDevices(Array.isArray(assistiveRes.data) ? assistiveRes.data : assistiveRes.data.results || []);
      setSensoryDevices(Array.isArray(sensoryRes.data) ? sensoryRes.data : sensoryRes.data.results || []);
      setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : childrenRes.data.results || []);
    } catch (error) {
      console.error('Error loading devices data:', error);
      toast.error('Failed to load devices or children data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssistiveChange = (e) => {
    const { name, value } = e.target;
    setAssistiveForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSensoryChange = (e) => {
    const { name, value } = e.target;
    setSensoryForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setAssistiveForm({
      child: '',
      device_type: '',
      date_issued: '',
      serial_number: '',
      condition: 'NEW',
      replacement_date: '',
      notes: '',
    });
    setSensoryForm({
      child: '',
      device_name: '',
      quantity: 1,
      date_distributed: '',
      notes: '',
    });
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    if (activeTab === 'assistive') {
      setAssistiveForm({
        child: item.child || '',
        device_type: item.device_type || '',
        date_issued: item.date_issued || '',
        serial_number: item.serial_number || '',
        condition: item.condition || 'NEW',
        replacement_date: item.replacement_date || '',
        notes: item.notes || '',
      });
    } else {
      setSensoryForm({
        child: item.child || '',
        device_name: item.device_name || '',
        quantity: item.quantity || 1,
        date_distributed: item.date_distributed || '',
        notes: item.notes || '',
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const endpoint = activeTab === 'assistive' ? `/devices/${id}/` : `/sensory-devices/${id}/`;
    if (window.confirm(`Are you sure you want to delete this ${activeTab === 'assistive' ? 'assistive' : 'sensory'} device record?`)) {
      try {
        await api.delete(endpoint);
        toast.success('Record deleted successfully!');
        loadData();
      } catch (error) {
        console.error('Error deleting device:', error);
        toast.error('Failed to delete device record.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (activeTab === 'assistive') {
        if (!assistiveForm.child) {
          toast.error('Please select a child.');
          setSaving(false);
          return;
        }
        if (editingId) {
          await api.put(`/devices/${editingId}/`, assistiveForm);
          toast.success('Assistive device record updated!');
        } else {
          await api.post('/devices/', assistiveForm);
          toast.success('Assistive device record saved!');
        }
      } else {
        if (!sensoryForm.child) {
          toast.error('Please select a child.');
          setSaving(false);
          return;
        }
        if (editingId) {
          await api.put(`/sensory-devices/${editingId}/`, sensoryForm);
          toast.success('Sensory device record updated!');
        } else {
          await api.post('/sensory-devices/', sensoryForm);
          toast.success('Sensory device record saved!');
        }
      }
      handleClose();
      loadData();
    } catch (error) {
      console.error('Error saving device record:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists
  const filteredAssistive = assistiveDevices.filter(
    (item) =>
      item.device_type?.toLowerCase().includes(search.toLowerCase()) ||
      item.child_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSensory = sensoryDevices.filter(
    (item) =>
      item.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.child_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalAssistive = assistiveDevices.length;
  const totalSensoryQty = sensoryDevices.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const needsReplacement = assistiveDevices.filter(d => d.condition === 'NEEDS_REPLACEMENT').length;

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Assistive & Sensory Devices</h1>
          <p>Track distribution, status, serial numbers, and replacements of assistive devices and sensory toys.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Record Device Distribution
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Assistive Devices Distributed</h3>
          <div className="value">{totalAssistive}</div>
        </div>
        <div className="stats-card">
          <h3>Sensory Items Distributed</h3>
          <div className="value">{totalSensoryQty}</div>
        </div>
        <div className="stats-card">
          <h3>Needs Replacement</h3>
          <div className="value" style={{ color: needsReplacement > 0 ? '#C94B4B' : 'inherit' }}>
            {needsReplacement}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'assistive' ? 'active' : ''}`}
          onClick={() => { setActiveTab('assistive'); setSearch(''); }}
        >
          Assistive Devices
        </button>
        <button
          className={`tab-btn ${activeTab === 'sensory' ? 'active' : ''}`}
          onClick={() => { setActiveTab('sensory'); setSearch(''); }}
        >
          Sensory Devices
        </button>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={
              activeTab === 'assistive'
                ? 'Search by child, device type, serial number...'
                : 'Search by child or sensory device name...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Cards */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading devices...</div>
        ) : activeTab === 'assistive' ? (
          filteredAssistive.length === 0 ? (
            <div className="empty-state">
              <Accessibility size={48} className="empty-state-icon" />
              <p>No assistive devices recorded. Click "Record Device Distribution" to add one.</p>
            </div>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Device Type</th>
                  <th>Serial Number</th>
                  <th>Condition</th>
                  <th>Date Issued</th>
                  <th>Est. Replacement</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssistive.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f2d60' }}>{item.child_name || 'Unknown Child'}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.device_type}</td>
                    <td className="nowrap-cell" style={{ fontFamily: 'monospace', color: '#5a5c74' }}>{item.serial_number || 'N/A'}</td>
                    <td>
                      <span style={{
                        background: item.condition === 'NEW' ? '#e1f4ea' : item.condition === 'GOOD' ? '#e8f0fe' : item.condition === 'FAIR' ? '#fff3e0' : '#fbe7e7',
                        color: item.condition === 'NEW' ? '#2f9e68' : item.condition === 'GOOD' ? '#1c7ec4' : item.condition === 'FAIR' ? '#fb8c00' : '#c94b4b',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {CONDITION_CHOICES.find(c => c.value === item.condition)?.label || item.condition}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a5c74' }}>
                        <Calendar size={14} />
                        {item.date_issued}
                      </div>
                    </td>
                    <td style={{ color: '#8890a6' }}>{item.replacement_date || 'N/A'}</td>
                    <td>
                      <div className="action-buttons-group">
                        <button className="btn-icon" title="View Device" onClick={() => setViewItem(item)}>
                          <Eye size={14} />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Edit Device"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit size={14} style={{ color: '#2F9E68' }} />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Delete Device"
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
          filteredSensory.length === 0 ? (
            <div className="empty-state">
              <Activity size={48} className="empty-state-icon" />
              <p>No sensory devices recorded. Click "Record Device Distribution" to add one.</p>
            </div>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Device/Item Name</th>
                  <th>Quantity</th>
                  <th>Date Distributed</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSensory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f2d60' }}>{item.child_name || 'Unknown Child'}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.device_name}</td>
                    <td style={{ fontWeight: 600 }}>x{item.quantity}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a5c74' }}>
                        <Calendar size={14} />
                        {item.date_distributed}
                      </div>
                    </td>
                    <td style={{ color: '#5a5c74', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                      {item.notes || 'None'}
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button 
                          className="btn-icon" 
                          title="Edit Device"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit size={14} style={{ color: '#2F9E68' }} />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Delete Device"
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
        {viewItem && (
          <ViewModal title="Device Details" item={viewItem} onClose={() => setViewItem(null)} />
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {editingId ? 'Edit' : 'Record'} {activeTab === 'assistive' ? 'Assistive Device' : 'Sensory Device'} Distribution
              </h2>
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
                      value={activeTab === 'assistive' ? assistiveForm.child : sensoryForm.child}
                      onChange={activeTab === 'assistive' ? handleAssistiveChange : handleSensoryChange}
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

                  {activeTab === 'assistive' ? (
                    <>
                      <div className="form-group">
                        <label>Device Type</label>
                        <input
                          type="text"
                          name="device_type"
                          placeholder="e.g. Wheelchair, Standing Frame"
                          value={assistiveForm.device_type}
                          onChange={handleAssistiveChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Serial / Reference Number</label>
                        <input
                          type="text"
                          name="serial_number"
                          placeholder="e.g. BK-WC-409"
                          value={assistiveForm.serial_number}
                          onChange={handleAssistiveChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Condition</label>
                        <select
                          name="condition"
                          value={assistiveForm.condition}
                          onChange={handleAssistiveChange}
                          required
                        >
                          {CONDITION_CHOICES.map(choice => (
                            <option key={choice.value} value={choice.value}>
                              {choice.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Date Issued</label>
                        <input
                          type="date"
                          name="date_issued"
                          value={assistiveForm.date_issued}
                          onChange={handleAssistiveChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Est. Replacement Date</label>
                        <input
                          type="date"
                          name="replacement_date"
                          value={assistiveForm.replacement_date}
                          onChange={handleAssistiveChange}
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Notes / Measurements</label>
                        <textarea
                          name="notes"
                          rows="3"
                          placeholder="Fittings, size adjustments, special configurations..."
                          value={assistiveForm.notes}
                          onChange={handleAssistiveChange}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Sensory Device / Item Name</label>
                        <input
                          type="text"
                          name="device_name"
                          placeholder="e.g. Texture Boards, Fidget Set"
                          value={sensoryForm.device_name}
                          onChange={handleSensoryChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantity Distributed</label>
                        <input
                          type="number"
                          name="quantity"
                          min="1"
                          value={sensoryForm.quantity}
                          onChange={handleSensoryChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Date Distributed</label>
                        <input
                          type="date"
                          name="date_distributed"
                          value={sensoryForm.date_distributed}
                          onChange={handleSensoryChange}
                          required
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Notes / Distribution Context</label>
                        <textarea
                          name="notes"
                          rows="3"
                          placeholder="e.g. Distributed during outreach clinic, caregiver instructed on play..."
                          value={sensoryForm.notes}
                          onChange={handleSensoryChange}
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
                  {saving ? 'Saving...' : (editingId ? 'Update Distribution Log' : 'Save Distribution Log')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;
