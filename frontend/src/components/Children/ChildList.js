import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, Trash2, Users, AlertCircle, Filter } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Children.css';

const ChildList = () => {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [therapistFilter, setTherapistFilter] = useState('');

  const loadUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadChildren = async () => {
    setLoading(true);
    try {
      const response = await api.get('/children/');
      setChildren(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error loading children:', error);
      toast.error('Failed to load children records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
    loadUsers();
  }, []);

  // detect mobile layout
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete the record for ${name}?`)) {
      try {
        await api.delete(`/children/${id}/`);
        toast.success(`Successfully deleted ${name}'s record.`);
        loadChildren();
      } catch (error) {
        console.error('Error deleting child:', error);
        toast.error('Failed to delete child record.');
      }
    }
  };

  // Filter logic
  const filteredChildren = children.filter((child) => {
    const matchesSearch = 
      child.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      child.child_id?.toLowerCase().includes(search.toLowerCase()) ||
      child.village?.toLowerCase().includes(search.toLowerCase()) ||
      child.district?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter ? child.status === statusFilter : true;
    const matchesSeverity = severityFilter ? child.severity === severityFilter : true;
    const matchesGender = genderFilter ? child.gender === genderFilter : true;
    const matchesTherapist = therapistFilter ? String(child.therapist_assigned) === String(therapistFilter) : true;

    return matchesSearch && matchesStatus && matchesSeverity && matchesGender && matchesTherapist;
  });

  // Calculate statistics
  const totalCount = children.length;
  const activeCount = children.filter(c => c.status === 'ACTIVE').length;
  const severeCount = children.filter(c => c.severity === 'SEVERE').length;
  const moderateCount = children.filter(c => c.severity === 'MODERATE').length;

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Children Directory</h1>
          <p>Manage and track beneficiary details, medical background, and assigned caseworkers.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/children/new')}>
          <Plus size={18} /> Register Child
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Beneficiaries</h3>
          <div className="value">{totalCount}</div>
        </div>
        <div className="stats-card">
          <h3>Active Program</h3>
          <div className="value">{activeCount}</div>
        </div>
        <div className="stats-card">
          <h3>Severe Cases</h3>
          <div className="value" style={{ color: '#C94B4B' }}>{severeCount}</div>
        </div>
        <div className="stats-card">
          <h3>Moderate Cases</h3>
          <div className="value" style={{ color: '#B9793A' }}>{moderateCount}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="controls-row flex-wrap" style={{ gap: '12px' }}>
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, ID, village or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="filter-group-row">
          <div className="select-wrapper">
            <Filter size={14} className="filter-select-icon" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="DECEASED">Deceased</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="">All Severities</option>
              <option value="MILD">Mild</option>
              <option value="MODERATE">Moderate</option>
              <option value="SEVERE">Severe</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
              <option value="">All Genders</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)}>
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

      {/* Table Card */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading children database...</div>
        ) : filteredChildren.length === 0 ? (
          <div className="empty-state">
            <Users size={48} className="empty-state-icon" />
            <p>No beneficiaries found matching current search/filters.</p>
          </div>
        ) : (
          <>
            {!isMobile ? (
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>Child ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Disability Type</th>
                    <th>Severity</th>
                    <th>Village</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChildren.map((child) => (
                    <tr key={child.id}>
                      <td className="nowrap-cell">
                        <div style={{ fontWeight: 700, color: '#1C7EC4' }}>{child.child_id}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EEF0F8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #E4E6F0', flexShrink: 0 }}>
                            {child.photo ? (
                              <img src={child.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#5A5C74' }}>
                                {child.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'C'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 600, color: '#0f2d60' }}>{child.full_name}</div>
                        </div>
                      </td>
                      <td>{child.age !== null && child.age !== undefined ? `${child.age} yrs` : 'N/A'}</td>
                      <td>{child.gender === 'M' ? 'Male' : child.gender === 'F' ? 'Female' : 'Other'}</td>
                      <td>{child.disability_type || 'Unspecified'}</td>
                      <td>
                        <span className={`badge-severity ${child.severity?.toLowerCase()}`}>
                          {child.severity}
                        </span>
                      </td>
                      <td>{child.village}</td>
                      <td>
                        <span className={`status-pill ${child.status?.toLowerCase()}`}>
                          {child.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          <button 
                            className="btn-icon" 
                            title="View Profile"
                            onClick={() => navigate(`/children/${child.id}`)}
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="btn-icon" 
                            title="Edit Child"
                            onClick={() => navigate(`/children/${child.id}/edit`)}
                          >
                            <Edit size={16} style={{ color: '#2F9E68' }} />
                          </button>
                          <button 
                            className="btn-icon" 
                            title="Delete Child"
                            onClick={() => handleDelete(child.id, child.full_name)}
                          >
                            <Trash2 size={16} style={{ color: '#C94B4B' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="cards-list">
                {filteredChildren.map((child) => (
                  <div className="child-card" key={child.id}>
                    <div className="child-card-top">
                      <div className="avatar">
                        {child.photo ? (
                          <img src={child.photo} alt="" />
                        ) : (
                          <span>{child.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'C'}</span>
                        )}
                      </div>
                      <div className="child-meta">
                        <div className="child-name">{child.full_name}</div>
                        <div className="child-sub">{child.child_id} • {child.village} • {child.age ? `${child.age} yrs` : 'N/A'}</div>
                      </div>
                    </div>
                    <div className="child-card-body">
                      <div><strong>Gender:</strong> {child.gender === 'M' ? 'Male' : child.gender === 'F' ? 'Female' : 'Other'}</div>
                      <div><strong>Disability:</strong> {child.disability_type || 'Unspecified'}</div>
                      <div><strong>Severity:</strong> <span className={`badge-severity ${child.severity?.toLowerCase()}`}>{child.severity}</span></div>
                      <div><strong>Status:</strong> <span className={`status-pill ${child.status?.toLowerCase()}`}>{child.status}</span></div>
                    </div>
                    <div className="child-card-actions">
                      <button className="btn-icon" title="View" onClick={() => navigate(`/children/${child.id}`)}><Eye size={16} /></button>
                      <button className="btn-icon" title="Edit" onClick={() => navigate(`/children/${child.id}/edit`)}><Edit size={16} style={{ color: '#2F9E68' }} /></button>
                      <button className="btn-icon" title="Delete" onClick={() => handleDelete(child.id, child.full_name)}><Trash2 size={16} style={{ color: '#C94B4B' }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChildList;
