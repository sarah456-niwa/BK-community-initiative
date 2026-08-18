// frontend/src/components/Profile/Profile.js
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { Save, Camera } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.photo || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const data = new FormData();
      data.append('first_name', profile.first_name);
      data.append('last_name', profile.last_name);
      data.append('email', profile.email);
      data.append('phone', profile.phone);
      data.append('department', profile.department);
      if (photoFile) {
        data.append('photo', photoFile);
      }

      const response = await api.put('/profile/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Profile updated successfully!');
      updateUser(response.data);
    } catch (error) {
      setMessage('Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #E4E6F0' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 16px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#2E2C6E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid #2E2C6E',
              fontSize: '32px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {previewUrl ? (
                <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.first_name?.[0] || user?.username?.[0] || 'U'
              )}
            </div>
            <label style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: '#1C7EC4',
              color: 'white',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px solid white'
            }}>
              <Camera size={14} />
              <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </label>
          </div>
          <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif' }}>{user?.first_name} {user?.last_name}</h1>
          <p style={{ color: '#5A5C74' }}>{user?.role || 'No Role'}</p>
          <p style={{ color: '#9294AB', fontSize: '14px' }}>@{user?.username}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {message && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: message.includes('success') ? '#E1F4EA' : '#FBE7E7',
              color: message.includes('success') ? '#2F9E68' : '#C94B4B'
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>First Name</label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>Last Name</label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>Department</label>
            <input
              type="text"
              value={profile.department}
              onChange={(e) => setProfile({ ...profile, department: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              marginTop: '24px',
              padding: '12px',
              background: '#2E2C6E',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={loading}
          >
            <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;