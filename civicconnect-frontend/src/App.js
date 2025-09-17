import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:5000/api';

// Token management
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// Set default auth header
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login Component
const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/login', formData);
      const { token, user } = response.data;
      
      setToken(token);
      onLogin(user);
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo"></div>
        <h2 className="auth-title">CivicConnect</h2>
        <p className="auth-subtitle">Report and track civic issues in your community</p>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="form-input"
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              className="form-input"
              placeholder="Enter your password"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>Demo Credentials:</p>
          <p><strong>Citizen:</strong> citizen@demo.com / password123</p>
          <p><strong>Admins:</strong> admin1@demo.com, admin2@demo.com / password123</p>
        </div>
      </div>
    </div>
  );
};

// Register Component
const RegisterForm = ({ onRegister, switchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'citizen'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/register', formData);
      const { token, user } = response.data;
      
      setToken(token);
      onRegister(user);
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo"></div>
        <h2 className="auth-title">Join CivicConnect</h2>
        <p className="auth-subtitle">Create an account to start reporting issues</p>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="form-input"
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="form-input"
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
              className="form-input"
              placeholder="Enter your phone number"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              className="form-input"
              placeholder="Create a password"
              minLength="6"
            />
          </div>
          
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
              className="form-input"
              placeholder="Confirm your password"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>Already have an account? 
            <button onClick={switchToLogin} className="link-button">
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Issue Form Component
const IssueForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    address: '',
    latitude: '',
    longitude: ''
  });
  const [images, setImages] = useState([]);
  const [locationStatus, setLocationStatus] = useState('');

  const getCurrentLocation = () => {
    setLocationStatus('Getting location...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          });
          setLocationStatus('Location obtained successfully');
        },
        (error) => {
          setLocationStatus('Unable to get location');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setLocationStatus('Geolocation not supported');
    }
  };

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Duplicate check before submit
    try {
      const params = new URLSearchParams({
        category: formData.category,
        latitude: formData.latitude,
        longitude: formData.longitude,
        thresholdMeters: '300'
      }).toString();
      const dupResp = await axios.get(`/issues/duplicates?${params}`);
      const dup = dupResp.data.duplicate;
      if (dup) {
        const confirmMsg = `A similar issue seems nearby (${dup.distanceMeters}m):\n\n` +
          `${dup.title}\n` +
          `Category: ${dup.category} | Status: ${dup.status} | Upvotes: ${dup.upvotes}\n` +
          `Address: ${dup.address || 'N/A'}\n\n` +
          `Do you want to upvote the existing issue instead?`;
        const chooseUpvote = window.confirm(confirmMsg);
        if (chooseUpvote) {
          try {
            await axios.post(`/issues/${dup._id}/upvote`);
            window.alert('Upvoted the existing issue. Thank you!');
            return; // Skip creating new issue
          } catch (err) {
            const alreadyUpvoted = err?.response?.status === 400;
            if (alreadyUpvoted) {
              const proceed = window.confirm('You have already upvoted this issue. Do you want to submit a new report anyway?');
              if (!proceed) return;
            } else {
              window.alert('Could not upvote the existing issue. Proceeding to submit a new report.');
            }
          }
        }
      }
    } catch (err) {
      console.warn('Duplicate check failed or none found:', err?.response?.data || err.message);
    }
    
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });
    
    images.forEach(image => {
      submitData.append('images', image);
    });
    
    await onSubmit(submitData);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      address: '',
      latitude: '',
      longitude: ''
    });
    setImages([]);
  };

  return (
    <form onSubmit={handleSubmit} className="issue-form">
      <div className="form-group">
        <label>Issue Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          required
          className="form-input"
          placeholder="Brief description of the issue"
        />
      </div>

      <div className="form-group">
        <label>Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          required
          className="form-select"
        >
          <option value="">Select Category</option>
          <option value="pothole"> Pothole</option>
          <option value="streetlight"> Streetlight</option>
          <option value="trash">Trash/Sanitation</option>
          <option value="graffiti"> Graffiti</option>
          <option value="traffic"> Traffic Signal</option>
          <option value="drainage"> Drainage</option>
          <option value="water"> Water</option>
          <option value="electricity"> Electricity</option>
          <option value="other">📋 Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Priority</label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData({...formData, priority: e.target.value})}
          className="form-select"
        >
          <option value="low">🟢 Low - Minor inconvenience</option>
          <option value="medium">🟡 Medium - Moderate issue</option>
          <option value="high">🔴 High - Safety hazard</option>
        </select>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          required
          className="form-textarea"
          placeholder="Provide detailed description of the issue..."
          rows="4"
        />
      </div>

      <div className="form-group">
        <label>Address</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          required
          className="form-input"
          placeholder="Enter the exact address or location"
        />
      </div>

      <div className="form-group">
        <label>Location Coordinates</label>
        <div className="location-inputs">
          <input
            type="number"
            step="any"
            value={formData.latitude}
            onChange={(e) => setFormData({...formData, latitude: e.target.value})}
            placeholder="Latitude"
            className="form-input"
            required
          />
          <input
            type="number"
            step="any"
            value={formData.longitude}
            onChange={(e) => setFormData({...formData, longitude: e.target.value})}
            placeholder="Longitude"
            className="form-input"
            required
          />
        </div>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="btn btn-secondary"
        >
          📍 Get Current Location
        </button>
        {locationStatus && (
          <div className={`location-status ${locationStatus.includes('success') ? 'success' : ''}`}>
            {locationStatus}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Images (Optional)</label>
        <input
          type="file"
          onChange={handleImageChange}
          accept="image/*"
          multiple
          className="form-input"
        />
        <small>You can upload up to 5 images (max 5MB each)</small>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? 'Submitting...' : 'Submit Issue'}
      </button>
    </form>
  );
};

// Timer Display Component
const TimerDisplay = ({ targetResolutionTime, isOverdue, status }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetResolutionTime || status === 'resolved' || status === 'rejected') {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const target = new Date(targetResolutionTime);
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Overdue');
        setIsExpired(true);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h left`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m left`);
        } else {
          setTimeLeft(`${minutes}m left`);
        }
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [targetResolutionTime, status]);

  if (!targetResolutionTime || status === 'resolved' || status === 'rejected') {
    return null;
  }

  return (
    <div className={`timer-display ${isExpired || isOverdue ? 'overdue' : ''}`}>
      <span className="timer-icon">⏰</span>
      <span className="timer-text">{timeLeft}</span>
      {isExpired || isOverdue ? <span className="overdue-badge">OVERDUE</span> : null}
    </div>
  );
};

// Issues List Component
const IssuesList = ({ issues, onIssueClick, userRole, onUpvote, currentUser }) => {
  const getStatusColor = (status) => {
    const colors = {
      'pending': '#f59e0b',
      'in-progress': '#3b82f6',
      'resolved': '#10b981',
      'rejected': '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'high': '#dc2626',
      'medium': '#f59e0b',
      'low': '#10b981'
    };
    return colors[priority] || '#64748b';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (issues.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>No issues found</h3>
        <p>No issues match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="issues-list">
      {issues.map((issue) => (
        <div
          key={issue._id}
          className={`issue-item priority-${issue.priority}`}
          onClick={() => onIssueClick(issue)}
        >
          <div className="issue-header">
            <div className="issue-title">{issue.title}</div>
            <div className="issue-badges">
              <span 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(issue.status) }}
              >
                {issue.status.replace('-', ' ')}
              </span>
              <span 
                className="priority-badge"
                style={{ backgroundColor: getPriorityColor(issue.priority) }}
              >
                {issue.priority}
              </span>
            </div>
          </div>
          
          <div className="issue-meta">
            <span>📍 {issue.location.address}</span>
            <span>🗂️ {issue.category}</span>
            <span>📅 {formatDate(issue.createdAt)}</span>
            {userRole === 'admin' && issue.reporter && (
              <span>👤 {issue.reporter.name}</span>
            )}
            {issue.assignedTo?.department && (
              <span> {issue.assignedTo.department}</span>
            )}
            {issue.assignedTo?.assignee?.name && (
              <span>👷 {issue.assignedTo.assignee.name}</span>
            )}
          </div>
          
          <div className="issue-description">
            {issue.description.length > 150 
              ? `${issue.description.substring(0, 150)}...`
              : issue.description
            }
          </div>
          
          <div className="issue-actions">
            {issue.comments && issue.comments.length > 0 && (
              <div className="issue-comments-count">
                💬 {issue.comments.length} comment{issue.comments.length !== 1 ? 's' : ''}
              </div>
            )}
            {userRole === 'citizen' && onUpvote && (
              <button 
                className="upvote-button"
                onClick={(e) => {
                  e.stopPropagation();
                  const hasUpvoted = issue.upvotedBy && issue.upvotedBy.includes(currentUser?.userId);
                  onUpvote(issue._id, !hasUpvoted);
                }}
                title={issue.upvotedBy && issue.upvotedBy.includes(currentUser?.userId) ? 'Remove upvote' : 'Upvote this issue'}
              >
                👍 {issue.upvotes || 0}
              </button>
            )}
            {userRole === 'admin' && (
              <div className="upvote-count">
                👍 {issue.upvotes || 0} upvotes
              </div>
            )}
          </div>
          
          <TimerDisplay 
            targetResolutionTime={issue.targetResolutionTime}
            isOverdue={issue.isOverdue}
            status={issue.status}
          />
        </div>
      ))}
    </div>
  );
};

// Issue Details Modal
const IssueModal = ({ issue, isOpen, onClose, userRole, onStatusUpdate, onAddComment, onReopen }) => {
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState(issue?.status || 'pending');
  const [estimatedResolution, setEstimatedResolution] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (issue) {
      setStatus(issue.status);
    }
  }, [issue]);

  if (!isOpen || !issue) return null;

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(issue._id, {
        status,
        comment: comment.trim() || undefined,
        estimatedResolution: estimatedResolution || undefined
      });
      setComment('');
      setEstimatedResolution('');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      await onAddComment(issue._id, comment);
      setComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{issue.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="issue-details-full">
            <div className="detail-section">
              <h3>Issue Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`status-badge status-${issue.status}`}>
                    {issue.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Priority:</label>
                  <span className={`priority-badge priority-${issue.priority}`}>
                    {issue.priority}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Category:</label>
                  <span>{issue.category}</span>
                </div>
                <div className="detail-item">
                  <label>Department:</label>
                  <span>{issue.assignedTo?.department || 'Not assigned'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Location</h3>
              <p>📍 {issue.location.address}</p>
              <p>🌐 {issue.location.coordinates.latitude}, {issue.location.coordinates.longitude}</p>
            </div>

            <div className="detail-section">
              <h3>Description</h3>
              <p>{issue.description}</p>
            </div>

            {issue.images && issue.images.length > 0 && (
              <div className="detail-section">
                <h3>Images</h3>
                <div className="issue-images">
                  {issue.images.map((image, index) => (
                    <img 
                      key={index}
                      src={`http://localhost:5000/${image}`}
                      alt={`Issue ${index + 1}`}
                      className="issue-image"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="detail-section">
              <h3>Timeline</h3>
              <div className="timeline">
                <div className="timeline-item">
                  <strong>Reported:</strong> {formatDate(issue.createdAt)}
                  {issue.reporter && <span> by {issue.reporter.name}</span>}
                </div>
                {issue.updatedAt !== issue.createdAt && (
                  <div className="timeline-item">
                    <strong>Last Updated:</strong> {formatDate(issue.updatedAt)}
                  </div>
                )}
                {issue.estimatedResolution && (
                  <div className="timeline-item">
                    <strong>Estimated Resolution:</strong> {formatDate(issue.estimatedResolution)}
                  </div>
                )}
                {issue.resolvedAt && (
                  <div className="timeline-item">
                    <strong>Resolved:</strong> {formatDate(issue.resolvedAt)}
                  </div>
                )}
              </div>
            </div>

            {issue.comments && issue.comments.length > 0 && (
              <div className="detail-section">
                <h3>Comments</h3>
                <div className="comments-list">
                  {issue.comments.map((comment, index) => (
                    <div key={index} className="comment-item">
                      <div className="comment-header">
                        <strong>{comment.user?.name || 'Anonymous'}</strong>
                        <span className="comment-date">{formatDate(comment.timestamp)}</span>
                      </div>
                      <p>{comment.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          {/* Admin Actions */}
          {userRole === 'admin' && (
            <div className="admin-actions">
              <div className="form-group">
                <label>Update Status:</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  className="form-select"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              {status === 'in-progress' && (
                <div className="form-group">
                  <label>Estimated Resolution:</label>
                  <input
                    type="datetime-local"
                    value={estimatedResolution}
                    onChange={(e) => setEstimatedResolution(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
              
              <button 
                onClick={handleStatusUpdate}
                className="btn btn-primary"
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          )}

          {userRole === 'citizen' && ['resolved','rejected'].includes(issue.status) && (
            <div className="citizen-actions">
              <button 
                onClick={() => onReopen && onReopen(issue._id)}
                className="btn btn-primary"
              >
                Reopen Issue
              </button>
            </div>
          )}

          {/* Comment Section */}
          <div className="comment-form">
            <div className="form-group">
              <label>Add Comment:</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="form-textarea"
                rows="3"
              />
            </div>
            <button 
              onClick={handleAddComment}
              className="btn btn-secondary"
              disabled={!comment.trim()}
            >
              Add Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Stats Component
const DashboardStats = ({ stats, userRole }) => {
  if (userRole === 'admin') {
    return (
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalIssues}</div>
          <div className="stat-label">Total Issues</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pendingIssues}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.inProgressIssues}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.resolvedIssues}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.avgResolutionTime}</div>
          <div className="stat-label">Avg Days to Resolve</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-stats">
      <div className="stat-card">
        <div className="stat-number">{stats.totalReported}</div>
        <div className="stat-label">Issues Reported</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{stats.pending}</div>
        <div className="stat-label">Pending</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{stats.resolved}</div>
        <div className="stat-label">Resolved</div>
      </div>
    </div>
  );
};

// User Panel Component
const UserPanel = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('report');
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [allIssues, setAllIssues] = useState([]);

  useEffect(() => {
    loadDashboard();
    loadIssues();
    loadIIssues();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(''), 5000);
  };

  const loadDashboard = async () => {
    try {
      const response = await axios.get('/dashboard/stats');
      setStats(response.data.citizen || {});
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };
  const loadIIssues = async () => {
    try {
      const response = await axios.get('/allissues');
      setAllIssues(response.data.issues);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const loadIssues = async () => {
    try {
      const response = await axios.get('/issues');
      setIssues(response.data.issues);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const handleSubmitIssue = async (formData) => {
    setIsLoading(true);
    try {
      await axios.post('/issues', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      showNotification('Issue submitted successfully!');
      loadIssues();
      loadDashboard();
      setActiveTab('track');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to submit issue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (issueId, comment) => {
    try {
      await axios.post(`/issues/${issueId}/comments`, { message: comment });
      showNotification('Comment added successfully!');
      // Refresh the selected issue
      const response = await axios.get(`/issues/${issueId}`);
      setSelectedIssue(response.data);
      loadIssues();
    } catch (error) {
      showNotification('Failed to add comment', 'error');
    }
  };

  const handleUpvote = async (issueId, isUpvoting) => {
    try {
      if (isUpvoting) {
        await axios.post(`/issues/${issueId}/upvote`);
        showNotification('Issue upvoted successfully');
      } else {
        await axios.delete(`/issues/${issueId}/upvote`);
        showNotification('Upvote removed successfully');
      }
      loadIssues();
      loadIIssues();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error updating upvote', 'error');
    }
  };

  const handleReopen = async (issueId) => {
    try {
      await axios.post(`/issues/${issueId}/reopen`);
      showNotification('Issue reopened and reassigned');
      const response = await axios.get(`/issues/${issueId}`);
      setSelectedIssue(response.data);
      loadIssues();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to reopen issue', 'error');
    }
  };

  return (
    <div className="panel-container active">
      <div className="panel-header">
        <div className="panel-logo">
          🏛️ CivicConnect - Citizen Portal
        </div>
        <div className="user-info">
          <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">Citizen</div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {notification && (
        <div className={`notification notification-${notification.type} show`}>
          {notification.message}
        </div>
      )}

      <div className="tab-navigation">
        <button 
          className={activeTab === 'dashboard' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'report' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('report')}
        >
          📝 Report Issue
        </button>
        <button 
          className={activeTab === 'track' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('track')}
        >
          📋 My Issues
        </button>
        <button className={activeTab === 'allissues' ? 'tab-active' : 'tab'} 
          onClick={() => setActiveTab('allissues')}>
          🌐 All Issues
        </button>
          
      </div>

      {activeTab === 'dashboard' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">📊 Your Dashboard</h2>
            <DashboardStats stats={stats} userRole="citizen" />
            
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {issues.slice(0, 5).map(issue => (
                  <div key={issue._id} className="activity-item">
                    <div className="activity-icon">
                      {issue.status === 'resolved' ? '✅' : 
                       issue.status === 'in-progress' ? '🔄' : '⏳'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{issue.title}</div>
                      <div className="activity-meta">
                        Status: {issue.status.replace('-', ' ')} • 
                        {new Date(issue.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">📝 Report New Issue</h2>
            <IssueForm onSubmit={handleSubmitIssue} isLoading={isLoading} />
          </div>
        </div>
      )}

      {activeTab === 'track' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">📋 Your Reported Issues</h2>
            <IssuesList 
              issues={issues}
              onIssueClick={setSelectedIssue}
              userRole="citizen"
              onUpvote={handleUpvote}
              currentUser={user}
            />
          </div>
        </div>
      )}
     {activeTab === 'allissues' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">📋 Issue Management</h2>
          
            
            <IssuesList 
              issues={allIssues}
              onIssueClick={setSelectedIssue}
              userRole="citizen"
              onUpvote={handleUpvote}
              currentUser={user}
            />
          </div>
        </div>
      )}

      <IssueModal
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        userRole="citizen"
        onAddComment={handleAddComment}
        onReopen={handleReopen}
      />
    </div>
  );
};

// Admin Panel Component
const AdminPanel = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    department: ''
  });
  const [users, setUsers] = useState([]);
  const [notification, setNotification] = useState('');
  const [overdueIssues, setOverdueIssues] = useState([]);
  const [onlyAssigned, setOnlyAssigned] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadIssues();
    if (activeTab === 'users') {
      loadUsers();
    }
    if (activeTab === 'alerts') {
      loadOverdueIssues();
    }
  }, [activeTab, filters, onlyAssigned]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(''), 5000);
  };

  const loadDashboard = async () => {
    try {
      const response = await axios.get('/dashboard/stats');
      setStats(response.data.admin || {});
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadIssues = async () => {
    try {
      const params = Object.entries(filters)
        .filter(([key, value]) => value)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      if (user.role === 'authority' && onlyAssigned) {
        params.onlyAssigned = true;
      }
      const response = await axios.get('/issues', { params });
      setIssues(response.data.issues);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadOverdueIssues = async () => {
    try {
      const response = await axios.get('/alerts/overdue');
      setOverdueIssues(response.data.overdueIssues);
    } catch (error) {
      console.error('Error loading overdue issues:', error);
    }
  };

  const updateOverdueStatus = async () => {
    try {
      await axios.post('/issues/update-overdue');
      showNotification('Overdue status updated successfully');
      loadOverdueIssues();
      loadIssues();
    } catch (error) {
      showNotification('Error updating overdue status', 'error');
    }
  };

  const handleStatusUpdate = async (issueId, updateData) => {
    try {
      await axios.put(`/issues/${issueId}/status`, updateData);
      showNotification('Issue status updated successfully!');
      loadIssues();
      loadDashboard();
      // Refresh the selected issue
      const response = await axios.get(`/issues/${issueId}`);
      setSelectedIssue(response.data);
    } catch (error) {
      showNotification('Failed to update issue status', 'error');
    }
  };

  const handleAddComment = async (issueId, comment) => {
    try {
      await axios.post(`/issues/${issueId}/comments`, { message: comment });
      showNotification('Comment added successfully!');
      // Refresh the selected issue
      const response = await axios.get(`/issues/${issueId}`);
      setSelectedIssue(response.data);
      loadIssues();
    } catch (error) {
      showNotification('Failed to add comment', 'error');
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`/users/${userId}/role`, { role: newRole });
      showNotification('User role updated successfully!');
      loadUsers();
    } catch (error) {
      showNotification('Failed to update user role', 'error');
    }
  };

  return (
    <div className="panel-container active">
      <div className="panel-header">
        <div className="panel-logo">
          🏛️ CivicConnect - Admin Portal
        </div>
        <div className="user-info">
          <div className="user-avatar admin">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">Administrator</div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {notification && (
        <div className={`notification notification-${notification.type} show`}>
          {notification.message}
        </div>
      )}

      <div className="tab-navigation">
        <button 
          className={activeTab === 'dashboard' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'issues' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('issues')}
        >
          📋 Manage Issues
        </button>
        <button 
          className={activeTab === 'users' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        
        <button 
          className={activeTab === 'alerts' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('alerts')}
        >
          🚨 Alerts {overdueIssues.length > 0 && <span className="alert-badge">{overdueIssues.length}</span>}
        </button>
        <button 
          className={activeTab === 'analytics' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">📊 Admin Dashboard</h2>
            <DashboardStats stats={stats} userRole="admin" />
            
            <div className="dashboard-charts">
              <div className="chart-section">
                <h3>Issues by Category</h3>
                <div className="category-stats">
                  {stats.categoryStats?.map(cat => (
                    <div key={cat._id} className="category-item">
                      <span className="category-name">{cat._id}</span>
                      <span className="category-count">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="chart-section">
                <h3>Priority Distribution</h3>
                <div className="priority-stats">
                  {stats.priorityStats?.map(priority => (
                    <div key={priority._id} className={`priority-item priority-${priority._id}`}>
                      <span className="priority-name">{priority._id}</span>
                      <span className="priority-count">{priority.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">📋 Issue Management</h2>
            
            <div className="filters">
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <select 
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="filter-select"
              >
                <option value="">All Categories</option>
                <option value="pothole">Pothole</option>
                <option value="streetlight">Streetlight</option>
                <option value="trash">Trash</option>
                <option value="graffiti">Graffiti</option>
                <option value="traffic">Traffic</option>
                <option value="drainage">Drainage</option>
                <option value="water">Water</option>
                <option value="electricity">Electricity</option>
                <option value="other">Other</option>
              </select>
              
              <select 
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="filter-select"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <button 
                onClick={() => setFilters({ status: '', category: '', priority: '', department: '' })}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>

              {user.role === 'authority' && (
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={onlyAssigned}
                    onChange={(e) => setOnlyAssigned(e.target.checked)}
                  />
                  Only my assigned
                </label>
              )}
            </div>
            
            <IssuesList 
              issues={issues}
              onIssueClick={setSelectedIssue}
              userRole="admin"
              currentUser={user}
            />
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">👥 User Management</h2>
            
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user.phone}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        {user.role === 'authority' ? (
                          <span className="role-note">Authority role cannot be changed</span>
                        ) : (
                          <select 
                            value={user.role}
                            onChange={(e) => handleUpdateUserRole(user._id, e.target.value)}
                            className="role-select"
                          >
                            <option value="citizen">Citizen</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">🚨 Overdue Issues Alert</h2>
            
            <div className="alerts-header">
              <p className="alerts-description">
                Issues that have exceeded their target resolution time based on priority and upvotes.
              </p>
              <button 
                className="btn btn-primary"
                onClick={updateOverdueStatus}
              >
                🔄 Update Overdue Status
              </button>
            </div>
            
            {overdueIssues.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3>No Overdue Issues</h3>
                <p>All issues are being resolved within their target timeframes!</p>
              </div>
            ) : (
              <div className="overdue-issues-list">
                {overdueIssues.map((issue) => (
                  <div key={issue._id} className="overdue-issue-item">
                    <div className="overdue-issue-header">
                      <h4 className="overdue-issue-title">{issue.title}</h4>
                      <div className="overdue-badges">
                        <span className="priority-badge priority-{issue.priority}">
                          {issue.priority}
                        </span>
                        <span className="overdue-badge">OVERDUE</span>
                      </div>
                    </div>
                    
                    <div className="overdue-issue-meta">
                      <span>📍 {issue.location.address}</span>
                      <span>🗂️ {issue.category}</span>
                      <span>👤 {issue.reporter.name}</span>
                      <span>👍 {issue.upvotes} upvotes</span>
                    </div>
                    
                    <div className="overdue-issue-description">
                      {issue.description}
                    </div>
                    
                    <div className="overdue-issue-timing">
                      <div className="timing-info">
                        <span>Created: {new Date(issue.createdAt).toLocaleString()}</span>
                        <span>Target Resolution: {new Date(issue.targetResolutionTime).toLocaleString()}</span>
                        <span className="overdue-time">
                          Overdue by: {Math.floor((new Date() - new Date(issue.targetResolutionTime)) / (1000 * 60 * 60))} hours
                        </span>
                      </div>
                    </div>
                    
                    <div className="overdue-issue-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => setSelectedIssue(issue)}
                      >
                        View Details
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleStatusUpdate(issue._id, { status: 'in-progress' })}
                      >
                        Mark In Progress
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">📈 Analytics & Reports</h2>
            
            <div className="analytics-content">
              <div className="analytics-section">
                <h3>System Performance</h3>
                <div className="performance-metrics">
                  <div className="metric-item">
                    <span>Average Resolution Time</span>
                    <span className="metric-value">{stats.avgResolutionTime} days</span>
                  </div>
                  <div className="metric-item">
                    <span>Resolution Rate</span>
                    <span className="metric-value">
                      {stats.totalIssues > 0 
                        ? Math.round((stats.resolvedIssues / stats.totalIssues) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="metric-item">
                    <span>Active Issues</span>
                    <span className="metric-value">{stats.pendingIssues + stats.inProgressIssues}</span>
                  </div>
                </div>
              </div>
              
              <div className="analytics-section">
                <h3>Department Performance</h3>
                <div className="department-performance">
                  <div className="dept-item">
                    <span className="dept-name">Public Works</span>
                    <div className="dept-stats">
                      <span>85% Resolution Rate</span>
                      <span>2.1 days avg</span>
                    </div>
                  </div>
                  <div className="dept-item">
                    <span className="dept-name">Sanitation</span>
                    <div className="dept-stats">
                      <span>92% Resolution Rate</span>
                      <span>1.5 days avg</span>
                    </div>
                  </div>
                  <div className="dept-item">
                    <span className="dept-name">Traffic Management</span>
                    <div className="dept-stats">
                      <span>78% Resolution Rate</span>
                      <span>3.2 days avg</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="analytics-section">
                <h3>Export Reports</h3>
                <div className="export-buttons">
                  <button className="btn btn-secondary">📊 Export Issues CSV</button>
                  <button className="btn btn-secondary">📈 Generate Performance Report</button>
                  <button className="btn btn-secondary">📋 Monthly Summary</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <IssueModal
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        userRole="admin"
        onStatusUpdate={handleStatusUpdate}
        onAddComment={handleAddComment}
      />
    </div>
  );
};

// Authority Panel Component
const AuthorityPanel = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('assigned');
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    loadAssigned();
    loadNotifications();
  }, [activeTab]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(''), 5000);
  };

  const loadAssigned = async () => {
    try {
      const response = await axios.get('/issues', { params: { assignee: user.id } });
      setAssignedIssues(response.data.issues);
    } catch (error) {
      console.error('Error loading assigned issues:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await axios.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleStatusUpdate = async (issueId, updateData) => {
    try {
      await axios.put(`/issues/${issueId}/status`, updateData);
      showNotification('Issue status updated successfully!');
      loadAssigned();
      // Refresh the selected issue
      const response = await axios.get(`/issues/${issueId}`);
      setSelectedIssue(response.data);
    } catch (error) {
      showNotification('Failed to update issue status', 'error');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="panel-container active">
      <div className="panel-header">
        <div className="panel-logo">
          🏛️ CivicConnect - Authority Portal
        </div>
        <div className="user-info">
          <div className="user-avatar admin">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">Authority</div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {notification && (
        <div className={`notification notification-${notification.type} show`}>
          {notification.message}
        </div>
      )}

      <div className="tab-navigation">
        <button 
          className={activeTab === 'assigned' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('assigned')}
        >
          📌 My Assigned
        </button>
        <button 
          className={activeTab === 'notifications' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications {unreadCount > 0 && <span className="alert-badge">{unreadCount}</span>}
        </button>
      </div>

      {activeTab === 'assigned' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">📌 Issues Assigned to You</h2>
            <IssuesList 
              issues={assignedIssues}
              onIssueClick={setSelectedIssue}
              userRole="admin"
              currentUser={user}
            />
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="tab-content">
          <div className="panel">
            <h2 className="panel-title">🔔 Your Notifications</h2>
            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔕</div>
                <h3>No notifications</h3>
              </div>
            ) : (
              <ul className="notifications-list">
                {notifications.map(n => (
                  <li key={n._id} className={`notification-item ${n.read ? '' : 'unread'}`}>
                    <div>
                      <div className="notification-message">{n.message}</div>
                      <div className="notification-meta">
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        {n.issue && <span> • {n.issue.title} ({n.issue.category})</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <IssueModal
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        userRole="admin"
        onStatusUpdate={handleStatusUpdate}
        onAddComment={() => {}}
      />
    </div>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = getToken();
    if (token) {
      try {
        // Validate token by making a test request
        const response = await axios.get('/dashboard/stats');
        // If successful, decode user info from token
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name || payload.email.split('@')[0]
        });
      } catch (error) {
        // Token is invalid, remove it
        removeToken();
      }
    }
    setIsLoading(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setShowRegister(false);
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading CivicConnect...</p>
      </div>
    );
  }

  if (!user) {
    return showRegister ? (
      <RegisterForm 
        onRegister={handleRegister}
        switchToLogin={() => setShowRegister(false)}
      />
    ) : (
      <div className="auth-container">
        <LoginForm onLogin={handleLogin} />
        <div className="auth-footer">
          <p>Don't have an account? 
            <button 
              onClick={() => setShowRegister(true)}
              className="link-button"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {user.role === 'admin' || user.role === 'authority' ? (
        <AdminPanel user={user} onLogout={handleLogout} />
      ) : (
        <UserPanel user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;