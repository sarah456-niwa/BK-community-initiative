import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import './Users.css';

const UserProfile = () => {
  const { user } = usePermissions();

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Profile</h1>
      </div>
      <div style={{ marginTop: '24px', background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E4E6F0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#5A5C74', marginBottom: '8px' }}>Username</div>
            <div>{user?.username || '—'}</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#5A5C74', marginBottom: '8px' }}>Email</div>
            <div>{user?.email || '—'}</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#5A5C74', marginBottom: '8px' }}>Full Name</div>
            <div>{`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—'}</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#5A5C74', marginBottom: '8px' }}>Role</div>
            <div>{user?.role || 'User'}</div>
          </div>
          {user?.sub_role && (
            <div>
              <div style={{ fontWeight: 600, color: '#5A5C74', marginBottom: '8px' }}>Specialty</div>
              <div>{user?.sub_role}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
