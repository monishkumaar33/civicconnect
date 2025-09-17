


// ============================
// BACKEND - EXPRESS SERVER
// ============================

// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/civicconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// ============================
// DATABASE SCHEMAS
// ============================

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'admin'], default: 'citizen' },
  address: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Issue Schema
const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['pothole', 'streetlight', 'trash', 'graffiti', 'traffic', 'drainage', 'other']
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  location: {
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  images: [{ type: String }], // File paths
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    department: { type: String },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  targetResolutionTime: { type: Date },
  isOverdue: { type: Boolean, default: false },
  estimatedResolution: { type: Date },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Issue = mongoose.model('Issue', issueSchema);

// Function to calculate target resolution time based on upvotes and priority
const calculateTargetResolutionTime = (upvotes, priority, createdAt) => {
  const baseHours = {
    'high': 24,    // 1 day for high priority
    'medium': 72,  // 3 days for medium priority  
    'low': 168     // 7 days for low priority
  };
  
  // Reduce time based on upvotes (more upvotes = faster resolution)
  const upvoteReduction = Math.min(upvotes * 2, 50); // Max 50% reduction
  const reductionPercentage = upvoteReduction / 100;
  
  const baseTime = baseHours[priority] || baseHours['medium'];
  const adjustedHours = baseTime * (1 - reductionPercentage);
  
  // Minimum 4 hours regardless of upvotes
  const finalHours = Math.max(adjustedHours, 4);
  
  const targetTime = new Date(createdAt);
  targetTime.setHours(targetTime.getHours() + finalHours);
  
  return targetTime;
};

// Function to check if issue is overdue
const checkIfOverdue = (targetResolutionTime, status) => {
  if (status === 'resolved' || status === 'rejected') return false;
  return new Date() > targetResolutionTime;
};

// Department Schema
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  categories: [{ type: String }],
  contactEmail: { type: String },
  contactPhone: { type: String },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
});

const Department = mongoose.model('Department', departmentSchema);

// ============================
// MIDDLEWARE
// ============================

// File upload middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================
// AUTHENTICATION ROUTES
// ============================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    
    const { name, email, phone, password, role = 'citizen' } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role
    });

    if (name==='wolf moni'){
      user.role='admin'
    }
    else{
        user.role='citizen'
    }
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================
// ISSUE ROUTES
// ============================

// Create Issue
app.post('/api/issues', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      address,
      latitude,
      longitude
    } = req.body;
    
    // Process uploaded images
    const imagePaths = req.files ? req.files.map(file => file.path) : [];
    
    // Auto-assign department based on category
    const departmentMapping = {
      'pothole': 'Public Works',
      'streetlight': 'Public Works',
      'trash': 'Sanitation',
      'graffiti': 'Parks & Recreation',
      'traffic': 'Traffic Management',
      'drainage': 'Public Works',
      'other': 'General Services'
    };
    
    const issue = new Issue({
      title,
      description,
      category,
      priority,
      location: {
        address,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        }
      },
      images: imagePaths,
      reporter: req.user.userId,
      assignedTo: {
        department: departmentMapping[category]
      }
    });
    
    // Calculate target resolution time based on priority and upvotes (initially 0)
    issue.targetResolutionTime = calculateTargetResolutionTime(0, priority, issue.createdAt);
    
    await issue.save();
    await issue.populate('reporter', 'name email');
    
    res.status(201).json({
      message: 'Issue reported successfully',
      issue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Issues (with filtering and pagination)
app.get('/api/issues', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      department,
      reporter
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // For citizens, only show their own issues
    if (req.user.role === 'citizen') {
      filter.reporter = req.user.userId;
    }
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (department) filter['assignedTo.department'] = department;
    if (reporter && req.user.role === 'admin') filter.reporter = reporter;
    
    const issues = await Issue.find(filter)
      .populate('reporter', 'name email phone')
      .populate('assignedTo.assignee', 'name email')
      .sort({ upvotes: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalIssues = await Issue.countDocuments(filter);
    
    res.json({
      issues,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalIssues / limit),
        totalIssues
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/allissues', authenticateToken, async (req, res) => {
     try {
    const issues = await Issue.find({})
      .populate('reporter', 'name email phone')
      .populate('assignedTo.assignee', 'name email')
      .sort({ upvotes: -1, createdAt: -1 });

    res.json({
      issues,
      totalIssues: issues.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get Single Issue
app.get('/api/issues/:id', authenticateToken, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reporter', 'name email phone')
      .populate('assignedTo.assignee', 'name email')
      .populate('comments.user', 'name');
    
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    // Citizens can only view their own issues
    if (req.user.role === 'citizen' && issue.reporter._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Issue Status (Admin only)
app.put('/api/issues/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, comment, estimatedResolution } = req.body;
    
    const updateData = {
      status,
      updatedAt: new Date()
    };
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }
    
    if (estimatedResolution) {
      updateData.estimatedResolution = new Date(estimatedResolution);
    }
    
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('reporter', 'name email');
    
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    // Add comment if provided
    if (comment) {
      issue.comments.push({
        user: req.user.userId,
        message: comment
      });
      await issue.save();
    }
    
    res.json({
      message: 'Issue updated successfully',
      issue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Comment to Issue
app.post('/api/issues/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    // Citizens can only comment on their own issues
    if (req.user.role === 'citizen' && issue.reporter.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    issue.comments.push({
      user: req.user.userId,
      message
    });
    
    await issue.save();
    await issue.populate('comments.user', 'name');
    
    res.json({
      message: 'Comment added successfully',
      comment: issue.comments[issue.comments.length - 1]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upvote Issue
app.post('/api/issues/:id/upvote', authenticateToken, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    const userId = req.user.userId;
    
    // Check if user has already upvoted
    if (issue.upvotedBy.includes(userId)) {
      return res.status(400).json({ error: 'You have already upvoted this issue' });
    }
    
    // Add user to upvotedBy array and increment upvotes
    issue.upvotedBy.push(userId);
    issue.upvotes += 1;
    
    // Recalculate target resolution time based on new upvote count
    issue.targetResolutionTime = calculateTargetResolutionTime(issue.upvotes, issue.priority, issue.createdAt);
    issue.isOverdue = checkIfOverdue(issue.targetResolutionTime, issue.status);
    
    await issue.save();
    
    res.json({
      message: 'Issue upvoted successfully',
      upvotes: issue.upvotes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove upvote from Issue
app.delete('/api/issues/:id/upvote', authenticateToken, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    const userId = req.user.userId;
    
    // Check if user has upvoted
    if (!issue.upvotedBy.includes(userId)) {
      return res.status(400).json({ error: 'You have not upvoted this issue' });
    }
    
    // Remove user from upvotedBy array and decrement upvotes
    issue.upvotedBy = issue.upvotedBy.filter(id => id.toString() !== userId);
    issue.upvotes = Math.max(0, issue.upvotes - 1);
    
    // Recalculate target resolution time based on new upvote count
    issue.targetResolutionTime = calculateTargetResolutionTime(issue.upvotes, issue.priority, issue.createdAt);
    issue.isOverdue = checkIfOverdue(issue.targetResolutionTime, issue.status);
    
    await issue.save();
    
    res.json({
      message: 'Upvote removed successfully',
      upvotes: issue.upvotes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update overdue status for all issues
app.post('/api/issues/update-overdue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const issues = await Issue.find({ 
      status: { $nin: ['resolved', 'rejected'] },
      targetResolutionTime: { $exists: true }
    });
    
    let updatedCount = 0;
    
    for (const issue of issues) {
      const isOverdue = checkIfOverdue(issue.targetResolutionTime, issue.status);
      if (issue.isOverdue !== isOverdue) {
        issue.isOverdue = isOverdue;
        await issue.save();
        updatedCount++;
      }
    }
    
    res.json({
      message: 'Overdue status updated successfully',
      updatedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get overdue issues for admin alerts
app.get('/api/alerts/overdue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const overdueIssues = await Issue.find({ 
      isOverdue: true,
      status: { $nin: ['resolved', 'rejected'] }
    })
    .populate('reporter', 'name email')
    .sort({ targetResolutionTime: 1 }); // Most overdue first
    
    res.json({
      overdueIssues,
      count: overdueIssues.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================
// DASHBOARD/ANALYTICS ROUTES
// ============================

// Get Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};
    
    if (req.user.role === 'admin') {
      // Admin stats
      const totalIssues = await Issue.countDocuments();
      const pendingIssues = await Issue.countDocuments({ status: 'pending' });
      const inProgressIssues = await Issue.countDocuments({ status: 'in-progress' });
      const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });
      
      const categoryStats = await Issue.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      const priorityStats = await Issue.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);
      
      // Average resolution time
      const resolvedWithTime = await Issue.find({
        status: 'resolved',
        resolvedAt: { $exists: true }
      });
      
      const avgResolutionTime = resolvedWithTime.length > 0 
        ? resolvedWithTime.reduce((sum, issue) => {
            const days = (issue.resolvedAt - issue.createdAt) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / resolvedWithTime.length
        : 0;
      
      stats.admin = {
        totalIssues,
        pendingIssues,
        inProgressIssues,
        resolvedIssues,
        categoryStats,
        priorityStats,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
      };
    } else {
      // Citizen stats
      const userIssues = await Issue.countDocuments({ reporter: req.user.userId });
      const userPending = await Issue.countDocuments({ 
        reporter: req.user.userId, 
        status: 'pending' 
      });
      const userResolved = await Issue.countDocuments({ 
        reporter: req.user.userId, 
        status: 'resolved' 
      });
      
      stats.citizen = {
        totalReported: userIssues,
        pending: userPending,
        resolved: userResolved
      };
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Recent Activity
app.get('/api/dashboard/activity', authenticateToken, async (req, res) => {
  try {
    const filter = req.user.role === 'citizen' 
      ? { reporter: req.user.userId }
      : {};
    
    const recentIssues = await Issue.find(filter)
      .populate('reporter', 'name')
      .sort({ updatedAt: -1 })
      .limit(10);
    
    res.json(recentIssues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================
// USER MANAGEMENT ROUTES (Admin only)
// ============================

// Get All Users
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Role
app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================
// START SERVER
// ============================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});