import React from 'react';
import { Users, Activity, MapPin, GraduationCap, Accessibility, Apple, ClipboardCheck, Star, UserX } from 'lucide-react';
import { useQuery } from 'react-query';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import StatCard from './StatCard';
import LoadingSpinner from '../Common/LoadingSpinner';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

const Dashboard = () => {
  const { user } = useAuth();
  const [isBarChartModalOpen, setIsBarChartModalOpen] = React.useState(false);

  // Query live dashboard API without static initialData overrides
  const { data: dashboardData, isLoading, isError, refetch } = useQuery(
    'dashboard',
    async () => {
      const response = await api.get('/dashboard/');
      return response.data;
    },
    {
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchInterval: 10000, // Auto-refresh every 10s if active
    }
  );

  if (isLoading && !dashboardData) return <LoadingSpinner />;

  const activeData = dashboardData || {};
  const isAdminView = Boolean(user?.is_superuser || user?.role === 'Administrator' || user?.role === 'Admin');

  const colors = {
    primary: '#2E2C6E',
    secondary: '#1C7EC4',
    success: '#2F9E68',
    warning: '#B9793A',
    danger: '#C94B4B',
    accent: '#7C6FD1',
  };

  // Dynamic Chart 1: Children by Disability Type
  const disabilityItems = activeData.children_by_disability && activeData.children_by_disability.length > 0
    ? activeData.children_by_disability
    : [
        { disability_type: 'Cerebral Palsy', count: 0 },
        { disability_type: 'Physical / Mobility', count: 0 },
        { disability_type: 'Speech & Hearing', count: 0 },
        { disability_type: 'Intellectual', count: 0 },
      ];

  const totalDisabilities = disabilityItems.reduce((sum, item) => sum + item.count, 0);

  const disabilityData = {
    labels: disabilityItems.map(d => {
      const label = d.disability_type || 'Unspecified';
      const percentage = totalDisabilities > 0 ? Math.round((d.count / totalDisabilities) * 100) : 0;
      return `${label}: ${d.count} (${percentage}%)`;
    }),
    datasets: [{
      data: disabilityItems.map(d => d.count),
      backgroundColor: ['#2E2C6E', '#1C7EC4', '#B9793A', '#2F9E68', '#C94B4B', '#7C6FD1'],
      borderWidth: 0,
    }]
  };

  // Dynamic Chart 2: Program Service Interventions Breakdown
  const serviceInterventionsData = {
    labels: ['Outreach Clinics', 'Assessments', 'Therapy Sessions', 'Assistive Devices', 'Workshops', 'Food Parcels'],
    datasets: [
      {
        label: 'Total Service Counts',
        data: [
          activeData.outreach_clinics?.total || 0,
          activeData.assessments?.total || 0,
          activeData.therapy?.total_sessions || 0,
          activeData.devices?.total || 0,
          activeData.training?.total_workshops || 0,
          activeData.nutrition?.food_parcels_delivered || 0,
        ],
        backgroundColor: '#1C7EC4',
        borderRadius: 8,
      },
    ],
  };

  const smallBarOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
      datalabels: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#FAFAFD' },
        ticks: { stepSize: 5 },
      },
      x: { grid: { display: false } },
    },
  };

  const largeBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      datalabels: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#FAFAFD' },
        max: 10,
        ticks: { stepSize: 0.5 },
      },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">{isAdminView ? 'Admin Executive Dashboard' : 'Program Overview Dashboard'}</h1>
          <p className="dashboard-subtitle">Real-time indicators and live service impact metrics across all BK initiatives.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => refetch()}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            🔄 Refresh Live
          </button>
          <div className="dashboard-role-pill">{user?.role || 'Administrator'}</div>
        </div>
      </div>

      <div className="dashboard-highlight-card">
        <div>
          <p className="dashboard-highlight-label">Current Focus</p>
          <h3>Automated impact monitoring across outreach, therapy, devices, and nutrition</h3>
        </div>
        <div className="dashboard-highlight-badge">Live System</div>
      </div>

      {/* Auto-Calculated Dashboard Stat Cards */}
      <div className="stats-grid">
        <StatCard icon={Users} label="Total Children" value={activeData.total_children || 0} color={colors.primary} />
        <StatCard icon={Activity} label="Active Children" value={activeData.active_children || 0} color={colors.success} />
        <StatCard icon={UserX} label="Inactive Children" value={activeData.inactive_children || 0} color={activeData.inactive_children > 0 ? colors.danger : '#8890a6'} />
        <StatCard icon={MapPin} label="Outreach Clinics" value={activeData.outreach_clinics?.total || 0} color={colors.secondary} />
        <StatCard icon={GraduationCap} label="Caregivers Trained" value={activeData.training?.caregivers_trained || 0} color={colors.warning} />
        <StatCard icon={Accessibility} label="Devices Distributed" value={activeData.devices?.total || 0} color={colors.secondary} />
        <StatCard icon={Apple} label="Nutrition Support" value={activeData.nutrition?.children_supported || 0} color={colors.success} />
        <StatCard icon={ClipboardCheck} label="Total Referrals" value={activeData.referrals?.total || 0} color={colors.primary} />
        <StatCard icon={Users} label="Children Referred" value={activeData.referrals?.children_referred || 0} color={colors.secondary} />
        <StatCard icon={Activity} label="Follow-ups Conducted" value={activeData.outreach_follow_ups?.total || 0} color={colors.warning} />
        <StatCard icon={MapPin} label="People Followed Up" value={activeData.outreach_follow_ups?.staff_followed_up || 0} color={colors.success} />
        <StatCard icon={ClipboardCheck} label="Assessments" value={activeData.assessments?.total || 0} color={colors.primary} />
        <StatCard icon={Star} label="Success Stories" value={activeData.success_stories || 0} color={colors.warning} />
      </div>

      {/* Dynamic Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Children Breakdown by Disability</h3>
          <div className="chart-container">
            <Doughnut 
              data={disabilityData} 
              options={{ 
                responsive: true, 
                plugins: { 
                  legend: { position: 'bottom' },
                  datalabels: { display: false }
                }, 
                cutout: '60%' 
              }} 
            />
          </div>
        </div>
        
        <div className="chart-card">
          <h3>Service Interventions Comparison (Click to expand)</h3>
          <div 
            className="chart-container" 
            style={{ padding: '10px 0', cursor: 'pointer' }}
            onClick={() => setIsBarChartModalOpen(true)}
          >
            <Bar data={serviceInterventionsData} options={smallBarOptions} />
          </div>
        </div>
      </div>

      {/* Dynamic Program Highlights */}
      <div className="chart-card" style={{ marginTop: '20px' }}>
        <h3>Real-Time System Program Highlights</h3>
        <ul style={{ paddingLeft: '1.2rem', lineHeight: '2.0', color: '#1B1B2B' }}>
          <li><strong>{activeData.active_children || 0}</strong> active children receiving care; <strong>{activeData.inactive_children || 0}</strong> auto-flagged inactive due to 6+ months without recorded activity.</li>
          <li><strong>{activeData.outreach_clinics?.total || 0}</strong> outreach clinics completed with <strong>{activeData.outreach_clinics?.total_attended || 0}</strong> total children attended.</li>
          <li><strong>{activeData.referrals?.total || 0}</strong> referrals logged across the program.</li>
          <li><strong>{activeData.referrals?.children_referred || 0}</strong> unique children referred.</li>
          <li><strong>{activeData.outreach_follow_ups?.total || 0}</strong> outreach follow-up actions flagged.</li>
          <li><strong>{activeData.outreach_follow_ups?.staff_followed_up || 0}</strong> staff members assigned to follow-up.</li>
          <li><strong>{activeData.training?.caregivers_trained || 0}</strong> caregivers trained across <strong>{activeData.training?.total_workshops || 0}</strong> empowerment workshops.</li>
          <li><strong>{activeData.devices?.total || 0}</strong> assistive devices and <strong>{activeData.devices?.sensory_total || 0}</strong> sensory items distributed to date.</li>
          <li><strong>{activeData.therapy?.total_sessions || 0}</strong> therapy sessions logged totaling <strong>{activeData.therapy?.total_hours || 0}</strong> hours of care.</li>
          <li><strong>{activeData.nutrition?.food_parcels_delivered || 0}</strong> family food parcels distributed to support child nutrition.</li>
          <li><strong>{activeData.success_stories || 0}</strong> success stories and milestone progress case studies documented.</li>
        </ul>
      </div>


      {isBarChartModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setIsBarChartModalOpen(false)}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '30px',
            width: '90%', height: '90%', position: 'relative',
            display: 'flex', flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setIsBarChartModalOpen(false)}
              style={{
                position: 'absolute', top: '15px', right: '20px', 
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666'
              }}
            >
              ×
            </button>
            <h3 style={{ marginBottom: '20px', color: '#1B1B2B' }}>Service Interventions Comparison (Expanded View)</h3>
            <div style={{ flex: 1, position: 'relative' }}>
              <Bar data={serviceInterventionsData} options={largeBarOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
