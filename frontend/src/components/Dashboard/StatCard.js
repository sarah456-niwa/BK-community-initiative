import React from 'react';
import './Dashboard.css';

const StatCard = ({ icon: Icon, label, value, subtitle, color }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-icon" style={{ backgroundColor: color + '20', color: color }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
};

export default StatCard;
