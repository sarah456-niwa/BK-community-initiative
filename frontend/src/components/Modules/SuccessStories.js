import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Star, Calendar, MessageSquare, Link2, Sparkles, Edit, Trash2, Image, Video, Globe, Eye } from 'lucide-react';
import ViewModal from '../../components/Common/ViewModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Modules.css';

const SuccessStories = () => {
  const [stories, setStories] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [mediaType, setMediaType] = useState('none');

  // Form State
  const [formData, setFormData] = useState({
    child: '',
    title: '',
    description: '',
    before_story: '',
    after_story: '',
    video_url: '',
    other_url: '',
    featured: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [storiesRes, childrenRes] = await Promise.all([
        api.get('/success-stories/'),
        api.get('/children/'),
      ]);

      setStories(Array.isArray(storiesRes.data) ? storiesRes.data : storiesRes.data.results || []);
      setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : childrenRes.data.results || []);
    } catch (error) {
      console.error('Error loading success stories data:', error);
      toast.error('Failed to load success stories or beneficiary profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setPhotoFile(null);
    setMediaType('none');
    setFormData({
      child: '',
      title: '',
      description: '',
      before_story: '',
      after_story: '',
      video_url: '',
      other_url: '',
      featured: false,
    });
  };

  const handleEdit = (item) => {
    setFormData({
      child: item.child || '',
      title: item.title || '',
      description: item.description || '',
      before_story: item.before_story || '',
      after_story: item.after_story || '',
      video_url: item.video_url || '',
      other_url: item.other_url || '',
      featured: item.featured || false,
    });
    setEditingId(item.id);
    setPhotoFile(null);
    if (item.photo) {
      setMediaType('photo');
    } else if (item.video_url) {
      setMediaType('video');
    } else if (item.other_url) {
      setMediaType('website');
    } else {
      setMediaType('none');
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this success story?')) {
      try {
        await api.delete(`/success-stories/${id}/`);
        toast.success('Success story deleted successfully!');
        loadData();
      } catch (error) {
        console.error('Error deleting success story:', error);
        toast.error('Failed to delete success story.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.child) {
      toast.error('Please select a child.');
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append('child', formData.child);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('before_story', formData.before_story || '');
      data.append('after_story', formData.after_story || '');
      data.append('featured', formData.featured);
      
      // Conditionally append media fields based on mediaType
      if (mediaType === 'photo') {
        if (photoFile) {
          data.append('photo', photoFile);
        }
        data.append('video_url', '');
        data.append('other_url', '');
      } else if (mediaType === 'video') {
        data.append('video_url', formData.video_url || '');
        data.append('other_url', '');
        data.append('photo', '');
      } else if (mediaType === 'website') {
        data.append('other_url', formData.other_url || '');
        data.append('video_url', '');
        data.append('photo', '');
      } else {
        data.append('video_url', '');
        data.append('other_url', '');
        data.append('photo', '');
      }

      const headers = { 'Content-Type': 'multipart/form-data' };
      if (editingId) {
        await api.put(`/success-stories/${editingId}/`, data, { headers });
        toast.success('Success story updated successfully!');
      } else {
        await api.post('/success-stories/', data, { headers });
        toast.success('Success story saved successfully!');
      }
      handleClose();
      loadData();
    } catch (error) {
      console.error('Error saving success story:', error);
      const detail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save.';
      toast.error('Error: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  // Filtered list
  const filteredStories = stories.filter(
    (item) =>
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.child_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalStories = stories.length;
  const featuredStories = stories.filter(s => s.featured).length;

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h1>Success Stories</h1>
          <p>Document and showcase milestones, beneficiary achievements, and recovery case studies.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Record Success Story
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Success Stories</h3>
          <div className="value">{totalStories}</div>
        </div>
        <div className="stats-card">
          <h3>Featured Case Studies</h3>
          <div className="value" style={{ color: '#fb8c00', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={24} fill="#fb8c00" />
            {featuredStories}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by story title, child name, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5a5c74' }}>Loading success stories...</div>
        ) : filteredStories.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={48} className="empty-state-icon" style={{ color: '#fb8c00' }} />
            <p>No success stories found. Click "Record Success Story" to add one.</p>
          </div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Featured</th>
                <th>Title</th>
                <th>Child</th>
                <th>Date Recorded</th>
                <th>Before/Initial State</th>
                <th>After/Milestone Progress</th>
                <th>Media Attachment</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStories.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {item.featured ? (
                        <Star size={16} fill="#fb8c00" style={{ color: '#fb8c00' }} />
                      ) : (
                        <Star size={16} style={{ color: '#8890a6' }} />
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f2d60' }}>{item.title}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.child_name || 'Beneficiary'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5a5c74' }}>
                      <Calendar size={14} />
                      {item.date_recorded}
                    </div>
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }} title={item.before_story}>
                    {item.before_story || 'N/A'}
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }} title={item.after_story}>
                    {item.after_story || 'N/A'}
                  </td>
                  <td>
                    {item.photo ? (
                      <a href={item.photo} target="_blank" rel="noopener noreferrer" style={{ color: '#2F9E68', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Image size={14} /> Photo
                      </a>
                    ) : item.video_url ? (
                      <a href={item.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1c7ec4', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Video size={14} /> Video
                      </a>
                    ) : item.other_url ? (
                      <a href={item.other_url} target="_blank" rel="noopener noreferrer" style={{ color: '#fb8c00', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Globe size={14} /> Link
                      </a>
                    ) : (
                      <span style={{ color: '#8890a6' }}>None</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons-group">
                      <button 
                        className="btn-icon" 
                        title="View Story"
                        onClick={() => setViewItem(item)}
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Edit Story"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit size={14} style={{ color: '#2F9E68' }} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Delete Story"
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
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Success Story' : 'Record Beneficiary Success Story'}</h2>
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
                      value={formData.child}
                      onChange={handleInputChange}
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
                  <div className="form-group">
                    <label>Story Title / Catchy Headline</label>
                    <input
                      type="text"
                      name="title"
                      placeholder="e.g. Walking independently for the first time!"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Initial Situation (Before Therapy/Support)</label>
                    <textarea
                      name="before_story"
                      rows="2"
                      placeholder="e.g. Unable to crawl or stand, highly sensitive to noise..."
                      value={formData.before_story}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Current Milestone Achieved (After Therapy/Support)</label>
                    <textarea
                      name="after_story"
                      rows="2"
                      placeholder="e.g. Stand up with support for 5 minutes, smile response to sounds..."
                      value={formData.after_story}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Full Story Details / Description</label>
                    <textarea
                      name="description"
                      rows="3"
                      placeholder="Narrate the child's development timeline, caregiver support, challenges overcome..."
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Media Attachment Type</label>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, cursor: 'pointer' }}>
                        <input type="radio" name="mediaType" checked={mediaType === 'none'} onChange={() => setMediaType('none')} /> None
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, cursor: 'pointer' }}>
                        <input type="radio" name="mediaType" checked={mediaType === 'photo'} onChange={() => setMediaType('photo')} /> Photo Upload
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, cursor: 'pointer' }}>
                        <input type="radio" name="mediaType" checked={mediaType === 'video'} onChange={() => setMediaType('video')} /> Video URL
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, cursor: 'pointer' }}>
                        <input type="radio" name="mediaType" checked={mediaType === 'website'} onChange={() => setMediaType('website')} /> Website Link
                      </label>
                    </div>
                  </div>

                  {mediaType === 'photo' && (
                    <div className="form-group full-width">
                      <label>Upload Photo</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setPhotoFile(e.target.files[0])} 
                        style={{ marginTop: '4px', border: 'none', padding: 0 }}
                      />
                    </div>
                  )}

                  {mediaType === 'video' && (
                    <div className="form-group full-width">
                      <label>Video Link / Media URL</label>
                      <input
                        type="url"
                        name="video_url"
                        placeholder="e.g. https://youtube.com/..."
                        value={formData.video_url}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}

                  {mediaType === 'website' && (
                    <div className="form-group full-width">
                      <label>Website Link / URL</label>
                      <input
                        type="url"
                        name="other_url"
                        placeholder="e.g. https://example.com/story..."
                        value={formData.other_url}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                  <div className="form-group checkbox-group">
                    <input
                      type="checkbox"
                      id="featured"
                      name="featured"
                      checked={formData.featured}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="featured" style={{ cursor: 'pointer' }}>
                      Mark as Featured Story (Featured on dashboards and newsletters)
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingId ? 'Update Story' : 'Save Success Story')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <ViewModal
          title="Success Story Details"
          item={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}
    </div>
  );
};

export default SuccessStories;
