import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, User, Phone, MapPin, Activity, ClipboardCheck, Accessibility, Apple, Heart, Info, Clock } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Children.css';

const ChildProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [child, setChild] = useState(null);
  const [therapySessions, setTherapySessions] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [nutritionRecords, setNutritionRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [referrals, setReferrals] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const [
          childRes,
          sessionsRes,
          assessmentsRes,
          devicesRes,
          nutritionRes,
          usersRes,
          referralsRes
        ] = await Promise.all([
          api.get(`/children/${id}/`),
          api.get(`/children/${id}/therapy_sessions/`),
          api.get(`/children/${id}/assessments/`),
          api.get(`/children/${id}/devices/`),
          api.get(`/children/${id}/nutrition_records/`),
          api.get('/users/'),
          api.get('/referrals/', { params: { child: id } })
        ]);

        setChild(childRes.data);
        setTherapySessions(sessionsRes.data || []);
        setAssessments(assessmentsRes.data || []);
        setDevices(devicesRes.data || []);
        setNutritionRecords(nutritionRes.data || []);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.results || []);
        setReferrals(Array.isArray(referralsRes.data) ? referralsRes.data : referralsRes.data?.results || []);
      } catch (error) {
        console.error('Error fetching child profile data:', error);
        toast.error('Failed to load child profile database.');
        navigate('/children');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [id, navigate]);

  if (loading) {
    return <div className="module-container" style={{ textAlign: 'center', padding: '100px' }}>Loading beneficiary case file...</div>;
  }

  if (!child) return null;

  const usersList = Array.isArray(users) ? users : [];

  return (
    <div className="module-container">
      {/* Header Row */}
      <div className="profile-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon" onClick={() => navigate('/children')} title="Back to Directory">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#0f2d60', fontWeight: 700 }}>{child.full_name}</h1>
            <p style={{ margin: 0, color: '#1C7EC4', fontWeight: 600 }}>Case ID: {child.child_id}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => navigate(`/children/${child.id}/edit`)}>
          <Edit size={16} /> Edit Profile
        </button>
      </div>

      <div className="profile-layout-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Summary Card */}
        <div className="profile-summary-card" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e4e6f0', padding: '24px' }}>
          <div className="profile-photo" style={{ width: '100%', height: '180px', borderRadius: '12px', background: '#fafafd', display: 'flex', alignItems: 'center', justifyContent: 'center', border: child.photo ? '1px solid #e4e6f0' : '1px dashed #cfd4e6', marginBottom: '20px', overflow: 'hidden' }}>
            {child.photo ? (
              <img src={child.photo} alt={child.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={64} style={{ color: '#a0a7c4' }} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#8890a6', textTransform: 'uppercase', marginBottom: '4px' }}>Enrollment Status</div>
              <span className={`status-pill ${child.status?.toLowerCase()}`}>{child.status}</span>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#8890a6', textTransform: 'uppercase', marginBottom: '4px' }}>Disability details</div>
              <div style={{ fontWeight: 600, color: '#0f2d60' }}>{child.disability_type || 'Unspecified'}</div>
              <span className={`badge-severity ${child.severity?.toLowerCase()}`} style={{ marginTop: '6px', display: 'inline-block' }}>
                {child.severity} Severity
              </span>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid #e4e6f0', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Calendar size={16} style={{ color: '#8890a6' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#8890a6' }}>Age / Birthdate</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#5a5c74' }}>{child.age} yrs ({child.date_of_birth})</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <User size={16} style={{ color: '#8890a6' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#8890a6' }}>Gender</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#5a5c74' }}>
                    {child.gender === 'M' ? 'Male' : child.gender === 'F' ? 'Female' : 'Other'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Phone size={16} style={{ color: '#8890a6' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#8890a6' }}>Caregiver Contact</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#5a5c74' }}>{child.caregiver_name}</div>
                  <div style={{ fontSize: '12px', color: '#8890a6' }}>{child.caregiver_phone}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <MapPin size={16} style={{ color: '#8890a6' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#8890a6' }}>Location</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#5a5c74' }}>{child.village}, {child.district}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Heart size={16} style={{ color: '#8890a6' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#8890a6' }}>Assigned Caseworker</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#5a5c74' }}>
                    {child.therapist_name || 'No Caseworker Assigned'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Information */}
        <div className="profile-tabs-card" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e4e6f0', overflow: 'hidden' }}>
          <div className="profile-tabs-header" style={{ display: 'flex', background: '#fafafd', borderBottom: '1px solid #e4e6f0' }}>
            <button 
              className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Info size={16} /> Overview
            </button>
            <button 
              className={`profile-tab ${activeTab === 'therapy' ? 'active' : ''}`}
              onClick={() => setActiveTab('therapy')}
            >
              <Activity size={16} /> Therapy ({therapySessions.length})
            </button>
            <button 
              className={`profile-tab ${activeTab === 'assessments' ? 'active' : ''}`}
              onClick={() => setActiveTab('assessments')}
            >
              <ClipboardCheck size={16} /> Assessments ({assessments.length})
            </button>
            <button 
              className={`profile-tab ${activeTab === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveTab('devices')}
            >
              <Accessibility size={16} /> Devices ({devices.length})
            </button>
            <button 
              className={`profile-tab ${activeTab === 'nutrition' ? 'active' : ''}`}
              onClick={() => setActiveTab('nutrition')}
            >
              <Apple size={16} /> Nutrition ({nutritionRecords.length})
            </button>
          </div>

          <div className="profile-tab-content" style={{ padding: '24px' }}>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="tab-overview fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f2d60' }}>Medical Background</h3>
                  <div style={{ background: '#fafafd', borderRadius: '8px', padding: '16px', border: '1px solid #e4e6f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', display: 'block', fontSize: '13px' }}>Diagnosis</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{child.diagnosis || 'No formal diagnosis recorded.'}</p>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', display: 'block', fontSize: '13px' }}>Medical History</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{child.medical_history || 'No medical history recorded.'}</p>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', display: 'block', fontSize: '13px' }}>Current Medication</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{child.current_medication || 'None.'}</p>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', display: 'block', fontSize: '13px' }}>Allergies</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: child.allergies ? '#C94B4B' : 'inherit' }}>{child.allergies || 'No known allergies.'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f2d60' }}>Caregiver & Contact Info</h3>
                  <div style={{ background: '#fafafd', borderRadius: '8px', padding: '16px', border: '1px solid #e4e6f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Caregiver Name</span>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.caregiver_name}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Relationship</span>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.caregiver_relationship || 'Not specified'}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Phone Number</span>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.caregiver_phone}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Email Address</span>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.caregiver_email || 'N/A'}</div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Physical Address</span>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.address || 'No physical address directions registered.'}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f2d60' }}>Referral Tracking</h3>
                  <div style={{ background: '#fafafd', borderRadius: '8px', padding: '16px', border: '1px solid #e4e6f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {referrals.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '14px', color: '#5a5c74' }}>
                        No referrals recorded for this child yet.
                      </p>
                    ) : (
                      referrals.map((referral) => (
                        <div key={referral.id} style={{ background: '#fff', border: '1px solid #e4e6f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 700, color: '#0f2d60' }}>{referral.referral_source || 'Referral source not recorded'}</div>
                            <span className={`status-pill ${String(referral.status || '').toLowerCase()}`}>
                              {referral.status || 'PENDING'}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#5a5c74' }}>
                            Referred by {referral.referred_by || 'Unknown'} • {referral.referral_date || 'Date not set'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#0f2d60', fontWeight: 600 }}>
                            {referral.referral_reason || 'No referral reason recorded.'}
                          </div>
                          {referral.notes ? (
                            <div style={{ fontSize: '13px', color: '#5a5c74' }}>Notes: {referral.notes}</div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f2d60' }}>Case Management Notes</h3>
                  <div style={{ background: '#fafafd', borderRadius: '8px', padding: '16px', border: '1px solid #e4e6f0' }}>
                    <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{child.notes || 'No casework notes added yet.'}</p>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f2d60' }}>M&E and Safeguarding</h3>
                  <div style={{ background: '#fafafd', borderRadius: '8px', padding: '16px', border: '1px solid #e4e6f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Media/M&E Consent Given</span>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        <span className={`status-pill ${child.consent_given ? 'active' : 'inactive'}`}>
                          {child.consent_given ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    {child.consent_given && (
                      <div>
                        <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Consent Date</span>
                        <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.consent_date || 'N/A'}</div>
                      </div>
                    )}
                    {['INACTIVE', 'TRANSFERRED', 'DECEASED'].includes(child.status) && (
                      <>
                        <div style={{ gridColumn: 'span 2', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e4e6f0' }}></div>
                        <div>
                          <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Discharge/Exit Date</span>
                          <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.discharge_date || 'N/A'}</div>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Exit Destination</span>
                          <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.exit_destination || 'N/A'}</div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ fontWeight: 600, color: '#5a5c74', fontSize: '13px' }}>Discharge Reason</span>
                          <div style={{ fontSize: '14px', marginTop: '4px' }}>{child.discharge_reason || 'N/A'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* THERAPY TAB */}
            {activeTab === 'therapy' && (
              <div className="fade-in">
                {therapySessions.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#8890a6', padding: '20px' }}>No therapy sessions logged for this child.</p>
                ) : (
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Hours</th>
                        <th>Therapist</th>
                        <th>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {therapySessions.map((s) => (
                        <tr key={s.id}>
                          <td>{s.date}</td>
                          <td>
                            <span style={{ background: 'rgba(28, 126, 196, 0.08)', color: '#1c7ec4', padding: '3px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                              {s.therapy_type}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} style={{ color: '#8890a6' }} />
                              {s.hours} hrs
                            </div>
                          </td>
                          <td>{s.therapist ? usersList.find(u => u.id === s.therapist)?.first_name || 'Assigned' : 'Unassigned'}</td>
                          <td>{s.outcome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ASSESSMENTS TAB */}
            {activeTab === 'assessments' && (
              <div className="fade-in">
                {assessments.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#8890a6', padding: '20px' }}>No assessments logged for this child.</p>
                ) : (
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Assessor</th>
                        <th>Findings</th>
                        <th>Recommendations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.map((a) => (
                        <tr key={a.id}>
                          <td>{a.date}</td>
                          <td>
                            <span style={{ background: 'rgba(47, 158, 104, 0.08)', color: '#2f9e68', padding: '3px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                              {a.assessment_type}
                            </span>
                          </td>
                          <td>{a.therapist ? usersList.find(u => u.id === a.therapist)?.first_name || 'Assigned' : 'Unassigned'}</td>
                          <td title={a.findings} style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.findings}</td>
                          <td title={a.recommendations} style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.recommendations}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* DEVICES TAB */}
            {activeTab === 'devices' && (
              <div className="fade-in">
                {devices.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#8890a6', padding: '20px' }}>No sensory or assistive devices assigned.</p>
                ) : (
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>Device Name/Type</th>
                        <th>Issue Date</th>
                        <th>Condition</th>
                        <th>Details / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((d) => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600, color: '#0f2d60' }}>{d.device_type || d.device_name}</td>
                          <td>{d.date_issued || d.date_distributed}</td>
                          <td>
                            {d.condition ? (
                              <span className={`status-pill ${d.condition === 'NEW' || d.condition === 'GOOD' ? 'active' : 'inactive'}`}>
                                {d.condition}
                              </span>
                            ) : `Quantity: ${d.quantity || 1}`}
                          </td>
                          <td>{d.notes || 'None'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* NUTRITION TAB */}
            {activeTab === 'nutrition' && (
              <div className="fade-in">
                {nutritionRecords.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#8890a6', padding: '20px' }}>No nutrition support records for this child.</p>
                ) : (
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>Assessment Date</th>
                        <th>Weight</th>
                        <th>Height</th>
                        <th>Nutrition Status</th>
                        <th>Ration / Supplement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nutritionRecords.map((n) => (
                        <tr key={n.id}>
                          <td>{n.assessment_date}</td>
                          <td>{n.weight ? `${n.weight} kg` : 'N/A'}</td>
                          <td>{n.height ? `${n.height} cm` : 'N/A'}</td>
                          <td>{n.nutrition_status}</td>
                          <td>{n.food_ration || n.supplement || 'None'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildProfile;
