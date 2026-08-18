import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { ACTIVE_ROLES, THERAPIST_SUB_ROLES } from '../../utils/permissions';
import api from '../../services/api';
import { Plus, Pencil, Trash2, Search, X, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import './Users.css';

const UserList = () => {
  const { canManageUsers } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
    role: 'Program Manager',
    sub_role: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${userId}/`);
      loadUsers();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      password: '',
      password2: '',
      role: user.role || 'Program Manager',
      sub_role: user.sub_role || '',
    });
    setPhotoFile(null);
    setShowPassword(false);
    setShowPassword2(false);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password2: '',
      role: 'Program Manager',
      sub_role: '',
    });
    setPhotoFile(null);
    setShowPassword(false);
    setShowPassword2(false);
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const data = new FormData();
      data.append('username', formData.username);
      data.append('email', formData.email);
      data.append('first_name', formData.first_name || '');
      data.append('last_name', formData.last_name || '');
      data.append('role', formData.role);
      data.append('sub_role', formData.sub_role || '');
      
      if (formData.password) {
        data.append('password', formData.password);
        data.append('password2', formData.password2);
      }
      if (photoFile) {
        data.append('photo', photoFile);
      }

      const headers = { 'Content-Type': 'multipart/form-data' };

      if (editingId) {
        await api.put(`/users/${editingId}/`, data, { headers });
        setFormSuccess('User updated successfully.');
      } else {
        if (!formData.password) {
          setFormError('Password is required for new users.');
          setSubmitting(false);
          return;
        }
        await api.post('/users/', data, { headers });
        setFormSuccess('User created successfully.');
        setFormData({
          username: '',
          email: '',
          first_name: '',
          last_name: '',
          password: '',
          password2: '',
          role: 'Program Manager',
          sub_role: '',
        });
        setPhotoFile(null);
      }
      loadUsers();
    } catch (error) {
      console.error(error);
      const detail = error.response?.data;
      if (detail && typeof detail === 'object') {
        // Collect messages from response detail safely
        const msgs = [];
        Object.keys(detail).forEach((k) => {
          const v = detail[k];
          if (Array.isArray(v)) msgs.push(...v.filter(Boolean));
          else if (typeof v === 'string') msgs.push(v);
        });
        const firstError = msgs.find(Boolean);
        if (firstError) {
          const lower = firstError.toLowerCase();
          // Hide verbose Django password validation messages and show a generic hint
          if (lower.includes('this password') || (lower.includes('password') && (lower.includes('too') || lower.includes('short') || lower.includes('invalid') || lower.includes('common') || lower.includes('require')))) {
            setFormError('Password must meet complexity requirements (min length and must not be common).');
          } else {
            setFormError(firstError);
          }
        } else {
          setFormError('Failed to save user.');
        }
      } else {
        setFormError('Failed to save user.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = (users || []).filter(user =>
    (user.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(search.toLowerCase()) ||
    `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  if (!canManageUsers()) {
    return <div style={{ padding: '24px' }}>Access Denied</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h1>User Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#2E2C6E', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add User</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid #E4E6F0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Username</label>
              <input required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E4E6F0', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Email</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E4E6F0', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>First Name</label>
              <input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E4E6F0', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Last Name</label>
              <input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E4E6F0', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Profile Photo</label>
              <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} style={{ width: '100%', padding: '8px 0', border: 'none' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required={!editingId}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ width: '100%', padding: '10px 42px 10px 12px', border: '1px solid #E4E6F0', borderRadius: '8px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                style={{
                  position: 'absolute',
                  top: '70%',
                  transform: 'translateY(-50%)',
                  right: '12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5A5C74',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Confirm Password</label>
              <input
                type={showPassword2 ? 'text' : 'password'}
                required={!editingId}
                value={formData.password2}
                onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                style={{ width: '100%', padding: '10px 42px 10px 12px', border: '1px solid #E4E6F0', borderRadius: '8px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword2((visible) => !visible)}
                style={{
                  position: 'absolute',
                  top: '70%',
                  transform: 'translateY(-50%)',
                  right: '12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5A5C74',
                }}
              >
                {showPassword2 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value, sub_role: e.target.value !== 'Therapist' ? '' : formData.sub_role })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E4E6F0', borderRadius: '8px' }}>
                {ACTIVE_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            {formData.role === 'Therapist' && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Therapist Specialty</label>
                <select value={formData.sub_role} onChange={(e) => setFormData({ ...formData, sub_role: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E4E6F0', borderRadius: '8px' }}>
                  <option value="">Select a specialty</option>
                  {THERAPIST_SUB_ROLES.map((subRole) => (
                    <option key={subRole} value={subRole}>{subRole}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {formError && <div style={{ marginTop: '12px', color: '#C94B4B' }}>{formError}</div>}
          {formSuccess && <div style={{ marginTop: '12px', color: '#2E7D32' }}>{formSuccess}</div>}

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={submitting} style={{ background: '#2E2C6E', color: 'white', padding: '10px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {submitting ? 'Saving...' : (editingId ? 'Update User' : 'Create User')}
            </button>
            <button type="button" onClick={handleCancel} style={{ background: 'white', border: '1px solid #E4E6F0', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9294AB' }} />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E4E6F0', borderRadius: '8px', fontSize: '14px' }}
        />
      </div>

      {loading ? <div>Loading users...</div> : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E4E6F0', overflow: 'hidden' }}>
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#FAFAFD' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Username</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} style={{ borderTop: '1px solid #E4E6F0' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EEF0F8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #E4E6F0', flexShrink: 0 }}>
                        {user.photo ? (
                          <img src={user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <UserIcon size={16} style={{ color: '#8890a6' }} />
                        )}
                      </div>
                      {user.username}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{user.first_name} {user.last_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <span style={{ background: '#EEF0F8', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
                      {user.role || 'No Role'}{user.role === 'Therapist' && user.sub_role ? ` • ${user.sub_role}` : ''}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1C7EC4', marginRight: '8px' }} onClick={() => handleEdit(user)}>
                      <Pencil size={16} />
                    </button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C94B4B' }} onClick={() => handleDelete(user.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserList;