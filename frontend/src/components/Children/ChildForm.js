import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Home, ShieldAlert, FileText, Camera, Upload, Trash2 } from 'lucide-react';
import CameraCaptureModal from '../Common/CameraCaptureModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Children.css';

const ChildForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [activeTab, setActiveTab] = useState('personal');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    // Personal Information
    full_name: '',
    date_of_birth: '',
    age: '',
    gender: 'M',
    disability_type: '',
    severity: 'MODERATE',
    diagnosis: '',
    school: '',
    status: 'ACTIVE',
    consent_given: false,
    consent_date: '',
    discharge_reason: '',
    discharge_date: '',
    exit_destination: '',
    
    // Caregiver Information
    caregiver_name: '',
    caregiver_phone: '',
    caregiver_email: '',
    caregiver_relationship: '',
    
    // Address
    address: '',
    village: '',
    district: '',
    gps_coordinates: '',
    
    // Medical Information
    medical_history: '',
    current_medication: '',
    allergies: '',
    
    // Program Information
    therapist_assigned: '',
    notes: '',
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users/');
        setUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load therapists list.');
      }
    };

    const fetchChildDetails = async () => {
      if (!isEditMode) return;
      setLoading(true);
      try {
        const response = await api.get(`/children/${id}/`);
        const data = response.data;
        if (data.photo) {
          setPhotoPreviewUrl(data.photo);
        }
        
        // Format date of birth to YYYY-MM-DD and calculate age
        const formattedDOB = data.date_of_birth ? data.date_of_birth.substring(0, 10) : '';
        const calculatedAge = formattedDOB
          ? Math.floor((new Date() - new Date(formattedDOB)) / (365.25 * 24 * 60 * 60 * 1000))
          : '';
        
        setFormData({
          full_name: data.full_name || '',
          date_of_birth: formattedDOB,
          age: calculatedAge,
          gender: data.gender || 'M',
          disability_type: data.disability_type || '',
          severity: data.severity || 'MODERATE',
          diagnosis: data.diagnosis || '',
          school: data.school || '',
          status: data.status || 'ACTIVE',
          consent_given: data.consent_given || false,
          consent_date: data.consent_date || '',
          discharge_reason: data.discharge_reason || '',
          discharge_date: data.discharge_date || '',
          exit_destination: data.exit_destination || '',
          
          caregiver_name: data.caregiver_name || '',
          caregiver_phone: data.caregiver_phone || '',
          caregiver_email: data.caregiver_email || '',
          caregiver_relationship: data.caregiver_relationship || '',
          
          address: data.address || '',
          village: data.village || '',
          district: data.district || '',
          gps_coordinates: data.gps_coordinates || '',
          
          medical_history: data.medical_history || '',
          current_medication: data.current_medication || '',
          allergies: data.allergies || '',
          
          therapist_assigned: data.therapist_assigned || '',
          notes: data.notes || '',
        });
      } catch (error) {
        console.error('Error fetching child details:', error);
        toast.error('Failed to load child details for editing.');
        navigate('/children');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    fetchChildDetails();
  }, [id, isEditMode, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'age') {
        const years = parseInt(value, 10);
        if (!Number.isNaN(years) && years > 0) {
          const date = new Date();
          date.setFullYear(date.getFullYear() - years);
          next.date_of_birth = date.toISOString().slice(0, 10);
        }
      }
      if (name === 'date_of_birth') {
        const ageValue = value
          ? Math.floor((new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000))
          : '';
        next.age = ageValue;
      }
      return next;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
      toast.success('Photo file selected.');
    }
  };

  const handleCameraCapture = (file, previewUrl) => {
    setPhotoFile(file);
    setPhotoPreviewUrl(previewUrl);
    toast.success('Photo captured with camera!');
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast('Photo removed.', { icon: '🗑️' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!formData.full_name || !formData.date_of_birth || !formData.caregiver_name || !formData.caregiver_phone || !formData.village || !formData.district) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    
    // Construct FormData payload
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === 'therapist_assigned') {
        const val = formData.therapist_assigned === '' ? '' : parseInt(formData.therapist_assigned);
        if (val) {
          data.append(key, val);
        }
      } else if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    });

    if (photoFile) {
      data.append('photo', photoFile);
    }

    try {
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (isEditMode) {
        await api.put(`/children/${id}/`, data, { headers });
        toast.success('Child profile updated successfully!');
      } else {
        await api.post('/children/', data, { headers });
        toast.success('Child registered successfully!');
      }
      navigate('/children');
    } catch (error) {
      console.error('Error saving child:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="module-container" style={{ textAlign: 'center', padding: '100px' }}>Loading child profile details...</div>;
  }

  return (
    <div className="module-container">
      <div className="form-header-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn-icon" onClick={() => navigate('/children')} title="Go back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#0f2d60', fontWeight: 700 }}>
            {isEditMode ? 'Edit Child Profile' : 'Register New Child'}
          </h1>
          <p style={{ margin: 0, color: '#5a5c74', fontSize: '14px' }}>
            {isEditMode ? `Update beneficiary info for child ID: ${id}` : 'Create a new beneficiary file in the BK database'}
          </p>
        </div>
      </div>

      <div className="form-card" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e4e6f0', overflow: 'hidden' }}>
        {/* Form Tabs */}
        <div className="form-tabs-row" style={{ display: 'flex', background: '#fafafd', borderBottom: '1px solid #e4e6f0' }}>
          <button 
            type="button"
            className={`form-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <User size={16} /> Personal Info
          </button>
          <button 
            type="button"
            className={`form-tab ${activeTab === 'caregiver' ? 'active' : ''}`}
            onClick={() => setActiveTab('caregiver')}
          >
            <Home size={16} /> Caregiver & Location
          </button>
          <button 
            type="button"
            className={`form-tab ${activeTab === 'medical' ? 'active' : ''}`}
            onClick={() => setActiveTab('medical')}
          >
            <ShieldAlert size={16} /> Medical & Program
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* TAB 1: Personal Details */}
          {activeTab === 'personal' && (
            <div className="form-grid fade-in">
              <div className="form-group">
                <label className="required">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="First and last name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="required">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Age (years)</label>
                <input
                  type="number"
                  name="age"
                  min="0"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Enter age in years"
                />
              </div>

              <div className="form-group">
                <label className="required">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="required">Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} required>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="DECEASED">Deceased</option>
                </select>
              </div>

              <div className="form-group">
                <label>Disability Type</label>
                <input
                  type="text"
                  name="disability_type"
                  value={formData.disability_type}
                  onChange={handleInputChange}
                  placeholder="e.g. Cerebral Palsy, Down Syndrome"
                />
              </div>

              <div className="form-group">
                <label className="required">Severity Level</label>
                <select name="severity" value={formData.severity} onChange={handleInputChange} required>
                  <option value="MILD">Mild</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="SEVERE">Severe</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Diagnosis / Medical Notes</label>
                <textarea
                  name="diagnosis"
                  rows="3"
                  value={formData.diagnosis}
                  onChange={handleInputChange}
                  placeholder="Detailed diagnostic results or clinical remarks..."
                />
              </div>

              <div className="form-group">
                <label>School Attended</label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  placeholder="Name of school, or blank if not enrolled"
                />
              </div>

              {/* Beneficiary Photo with Camera and File Upload */}
              <div className="form-group full-width">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={16} /> Beneficiary Photo (Optional)
                </label>

                {photoPreviewUrl ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '14px 18px',
                      background: '#FAFAFD',
                      border: '1px solid #E4E6F0',
                      borderRadius: '12px',
                      marginTop: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '2px solid #2E2C6E',
                        flexShrink: 0,
                        background: '#EEF0F8',
                      }}
                    >
                      <img
                        src={photoPreviewUrl}
                        alt="Beneficiary Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1B1B2B' }}>
                          Photo Attached
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            background: '#E1F4EA',
                            color: '#1E7E34',
                            padding: '1px 8px',
                            borderRadius: '10px',
                            fontWeight: 600,
                          }}
                        >
                          Ready
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#5A5C74' }}>
                        This photo will be displayed on the child's profile and M&E reports.
                      </p>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setIsCameraOpen(true)}
                          className="btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Camera size={13} /> Retake with Camera
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Upload size={13} /> Choose Another File
                        </button>

                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          style={{
                            background: '#FEE8E8',
                            border: '1px solid #F8B4B4',
                            color: '#C94B4B',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '18px',
                      background: '#FAFAFD',
                      border: '1.5px dashed #DCDFEA',
                      borderRadius: '12px',
                      marginTop: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '13px', color: '#5A5C74' }}>
                      Take an identification picture directly with your camera or select an image file:
                    </p>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="btn-primary"
                        style={{
                          padding: '8px 18px',
                          fontSize: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Camera size={16} /> Take Photo with Camera
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary"
                        style={{
                          padding: '8px 18px',
                          fontSize: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Upload size={16} /> Upload Image File
                      </button>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  name="consent_given"
                  checked={formData.consent_given}
                  onChange={handleInputChange}
                  id="consent_given"
                  style={{ width: 'auto' }}
                />
                <label htmlFor="consent_given" style={{ marginBottom: 0 }}>Consent Given for M&E and Media</label>
              </div>

              {formData.consent_given && (
                <div className="form-group">
                  <label className="required">Consent Date</label>
                  <input
                    type="date"
                    name="consent_date"
                    value={formData.consent_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Caregiver Details */}
          {activeTab === 'caregiver' && (
            <div className="form-grid fade-in">
              <div className="form-group">
                <label className="required">Caregiver Name</label>
                <input
                  type="text"
                  name="caregiver_name"
                  value={formData.caregiver_name}
                  onChange={handleInputChange}
                  placeholder="Guardian/Parent primary contact"
                  required
                />
              </div>

              <div className="form-group">
                <label className="required">Caregiver Phone</label>
                <input
                  type="text"
                  name="caregiver_phone"
                  value={formData.caregiver_phone}
                  onChange={handleInputChange}
                  placeholder="e.g. +256 700 000000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Caregiver Email</label>
                <input
                  type="email"
                  name="caregiver_email"
                  value={formData.caregiver_email}
                  onChange={handleInputChange}
                  placeholder="e.g. caregiver@gmail.com"
                />
              </div>

              <div className="form-group">
                <label>Caregiver Relationship</label>
                <input
                  type="text"
                  name="caregiver_relationship"
                  value={formData.caregiver_relationship}
                  onChange={handleInputChange}
                  placeholder="e.g. Mother, Father, Uncle"
                />
              </div>

              <div className="form-group">
                <label className="required">Village / Sub-County</label>
                <input
                  type="text"
                  name="village"
                  value={formData.village}
                  onChange={handleInputChange}
                  placeholder="Village name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="required">District</label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  placeholder="District name"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Physical Address (Directions)</label>
                <textarea
                  name="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Landmarks, neighborhood directions, etc."
                />
              </div>

              <div className="form-group">
                <label>GPS Coordinates</label>
                <input
                  type="text"
                  name="gps_coordinates"
                  value={formData.gps_coordinates}
                  onChange={handleInputChange}
                  placeholder="Latitude, Longitude (optional)"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Medical / Program Info */}
          {activeTab === 'medical' && (
            <div className="form-grid fade-in">
              <div className="form-group full-width">
                <label>Medical History</label>
                <textarea
                  name="medical_history"
                  rows="3"
                  value={formData.medical_history}
                  onChange={handleInputChange}
                  placeholder="Prior surgeries, hospitalization, chronic issues..."
                />
              </div>

              <div className="form-group full-width">
                <label>Current Medication</label>
                <textarea
                  name="current_medication"
                  rows="2"
                  value={formData.current_medication}
                  onChange={handleInputChange}
                  placeholder="Daily prescriptions or supplements..."
                />
              </div>

              <div className="form-group full-width">
                <label>Allergies</label>
                <textarea
                  name="allergies"
                  rows="2"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  placeholder="Drug allergies, food intolerances, etc."
                />
              </div>

              <div className="form-group">
                <label className="required">Enrollment Status</label>
                <select 
                  name="status" 
                  value={formData.status} 
                  onChange={handleInputChange}
                  required
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="DECEASED">Deceased</option>
                </select>
              </div>

              <div className="form-group">
                <label>Assigned Therapist / Case Worker</label>
                <select 
                  name="therapist_assigned" 
                  value={formData.therapist_assigned} 
                  onChange={handleInputChange}
                >
                  <option value="">-- Assign Staff --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label>General Notes</label>
                <textarea
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Social background, school placement goals, etc."
                />
              </div>

              {['INACTIVE', 'TRANSFERRED', 'DECEASED'].includes(formData.status) && (
                <>
                  <div className="form-group">
                    <label>Discharge/Exit Date</label>
                    <input
                      type="date"
                      name="discharge_date"
                      value={formData.discharge_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Exit Destination</label>
                    <input
                      type="text"
                      name="exit_destination"
                      placeholder="e.g. Relocated, Other Organization"
                      value={formData.exit_destination}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Discharge Reason</label>
                    <textarea
                      name="discharge_reason"
                      rows="2"
                      value={formData.discharge_reason}
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e4e6f0' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate('/children')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : (isEditMode ? 'Update Profile' : 'Register Child')}
            </button>
          </div>
        </form>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        title={isEditMode ? `Take Photo for ${formData.full_name || 'Child'}` : 'Take Beneficiary Photo'}
      />
    </div>
  );
};

export default ChildForm;
