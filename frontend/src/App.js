import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import Layout from './components/Common/Layout';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import ChildList from './components/Children/ChildList';
import ChildProfile from './components/Children/ChildProfile';
import ChildForm from './components/Children/ChildForm';
import OutreachClinics from './components/Modules/OutreachClinics';
import Assessments from './components/Modules/Assessments';
import Therapy from './components/Modules/Therapy';
import Devices from './components/Modules/Devices';
import Training from './components/Modules/Training';
import Nutrition from './components/Modules/Nutrition';
import CommunityOutreach from './components/Modules/CommunityOutreach';
import Referrals from './components/Modules/Referrals';
import Meetings from './components/Modules/Meetings';
import SuccessStories from './components/Modules/SuccessStories';
import Safeguarding from './components/Modules/Safeguarding';
import Feedback from './components/Modules/Feedback';
import ReportGenerator from './components/Reports/ReportGenerator';
import UserList from './components/Users/UserList';
import Profile from './components/Profile/Profile';
import './App.css';

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="children" element={<PrivateRoute requiredModule="CHILDREN"><ChildList /></PrivateRoute>} />
          <Route path="children/new" element={<PrivateRoute requiredModule="CHILDREN"><ChildForm /></PrivateRoute>} />
          <Route path="children/:id" element={<PrivateRoute requiredModule="CHILDREN"><ChildProfile /></PrivateRoute>} />
          <Route path="children/:id/edit" element={<PrivateRoute requiredModule="CHILDREN"><ChildForm /></PrivateRoute>} />
          <Route path="outreach" element={<PrivateRoute requiredModule="OUTREACH"><OutreachClinics /></PrivateRoute>} />
          <Route path="assessments" element={<PrivateRoute requiredModule="ASSESSMENTS"><Assessments /></PrivateRoute>} />
          <Route path="therapy" element={<PrivateRoute requiredModule="THERAPY"><Therapy /></PrivateRoute>} />
          <Route path="devices" element={<PrivateRoute requiredModule="DEVICES"><Devices /></PrivateRoute>} />
          <Route path="training" element={<PrivateRoute requiredModule="TRAINING"><Training /></PrivateRoute>} />
          <Route path="nutrition" element={<PrivateRoute requiredModule="NUTRITION"><Nutrition /></PrivateRoute>} />
          <Route path="community" element={<PrivateRoute requiredModule="COMMUNITY"><CommunityOutreach /></PrivateRoute>} />
          <Route path="referrals" element={<PrivateRoute requiredModule="REFERRALS"><Referrals /></PrivateRoute>} />
          <Route path="meetings" element={<PrivateRoute requiredModule="MEETINGS"><Meetings /></PrivateRoute>} />
          <Route path="success-stories" element={<PrivateRoute requiredModule="SUCCESS_STORIES"><SuccessStories /></PrivateRoute>} />
          <Route path="safeguarding" element={<PrivateRoute requiredModule="SAFEGUARDING"><Safeguarding /></PrivateRoute>} />
          <Route path="feedback" element={<PrivateRoute requiredModule="FEEDBACK"><Feedback /></PrivateRoute>} />
          <Route path="reports" element={<PrivateRoute requiredModule="REPORTS"><ReportGenerator /></PrivateRoute>} />
          <Route path="users" element={<PrivateRoute requiredModule="USER_MANAGEMENT"><UserList /></PrivateRoute>} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
