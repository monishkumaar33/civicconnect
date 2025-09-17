const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/civicconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import models (assuming they're in separate files)
// For this example, we'll define them inline

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'admin', 'authority'], default: 'citizen' },
  address: { type: String },
  isActive: { type: Boolean, default: true },
  department: { type: String },
  location: {
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  createdAt: { type: Date, default: Date.now }
});

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['pothole', 'streetlight', 'trash', 'graffiti', 'traffic', 'drainage', 'water', 'electricity', 'other']
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
  images: [{ type: String }],
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

const User = mongoose.model('User', userSchema);
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

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const departmentMapping = {
  pothole: 'Public Works',
  streetlight: 'Public Works',
  trash: 'Sanitation',
  graffiti: 'Parks & Recreation',
  traffic: 'Traffic Management',
  drainage: 'Public Works',
  water: 'Water Works',
  electricity: 'Electricity Board',
  other: 'General Services'
};

async function findNearestAuthority(department, latitude, longitude) {
  const filter = { role: 'authority', isActive: true };
  if (department) filter.department = department;
  const authorities = await User.find(filter).select('department location.coordinates');
  let nearest = null;
  let best = Infinity;
  for (const auth of authorities) {
    const coords = auth.location && auth.location.coordinates;
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') continue;
    const d = haversineDistance(latitude, longitude, coords.latitude, coords.longitude);
    if (d < best) { best = d; nearest = auth; }
  }
  return nearest;
}

async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Issue.deleteMany({});
    
    console.log('🗑️ Cleared existing data');

    // Create demo users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const baseUsers = [
      {
        name: 'John Doe',
        email: 'citizen@demo.com',
        phone: '+1-555-0101',
        password: hashedPassword,
        role: 'citizen',
        address: '123 Main Street, Anytown, USA'
      },
      {
        name: 'Admin One',
        email: 'admin1@demo.com',
        phone: '+1-555-0100',
        password: hashedPassword,
        role: 'admin',
        address: 'City Hall, Government District'
      },
      {
        name: 'Admin Two',
        email: 'admin2@demo.com',
        phone: '+1-555-0104',
        password: hashedPassword,
        role: 'admin',
        address: 'City Hall Annex'
      },
      {
        name: 'Jane Smith',
        email: 'jane@demo.com',
        phone: '+1-555-0102',
        password: hashedPassword,
        role: 'citizen',
        address: '456 Oak Avenue, Anytown, USA'
      },
      {
        name: 'Mike Johnson',
        email: 'mike@demo.com',
        phone: '+1-555-0103',
        password: hashedPassword,
        role: 'citizen',
        address: '789 Pine Street, Anytown, USA'
      }
    ];

    const authorityUsers = [
      // Public Works
      { name: 'PW - Alice', email: 'alice.pw@demo.com', phone: '+1-555-0201', password: hashedPassword, role: 'authority', department: 'Public Works', location: { coordinates: { latitude: 40.7580, longitude: -73.9855 } } },
      { name: 'PW - Bob', email: 'bob.pw@demo.com', phone: '+1-555-0202', password: hashedPassword, role: 'authority', department: 'Public Works', location: { coordinates: { latitude: 40.7400, longitude: -73.9900 } } },
      // Sanitation
      { name: 'SAN - Carla', email: 'carla.san@demo.com', phone: '+1-555-0203', password: hashedPassword, role: 'authority', department: 'Sanitation', location: { coordinates: { latitude: 40.7484, longitude: -73.9857 } } },
      // Parks & Recreation
      { name: 'PARK - Dan', email: 'dan.park@demo.com', phone: '+1-555-0204', password: hashedPassword, role: 'authority', department: 'Parks & Recreation', location: { coordinates: { latitude: 40.7308, longitude: -73.9973 } } },
      // Traffic Management
      { name: 'TRF - Eva', email: 'eva.trf@demo.com', phone: '+1-555-0205', password: hashedPassword, role: 'authority', department: 'Traffic Management', location: { coordinates: { latitude: 40.7615, longitude: -73.9777 } } },
      // Water Works
      { name: 'WATER - Frank', email: 'frank.water@demo.com', phone: '+1-555-0206', password: hashedPassword, role: 'authority', department: 'Water Works', location: { coordinates: { latitude: 40.7510, longitude: -73.9905 } } },
      // Electricity Board
      { name: 'ELEC - Gina', email: 'gina.elec@demo.com', phone: '+1-555-0207', password: hashedPassword, role: 'authority', department: 'Electricity Board', location: { coordinates: { latitude: 40.7830, longitude: -73.9710 } } },
      // General Services
      { name: 'GEN - Hank', email: 'hank.gen@demo.com', phone: '+1-555-0208', password: hashedPassword, role: 'authority', department: 'General Services', location: { coordinates: { latitude: 40.7359, longitude: -74.0031 } } }
    ];

    const users = await User.insertMany([...baseUsers, ...authorityUsers]);

    console.log('👥 Created demo users (citizens, admins, authorities)');

    // Create demo issues with timing features
    const citizenUsers = users.filter(user => user.role === 'citizen');
    
    const issues = [
      // Public Works - pothole near Alice
      {
        title: 'Large pothole on Main Street causing traffic issues',
        description: 'Significant pothole at Main & 5th.',
        category: 'pothole',
        priority: 'high',
        status: 'pending',
        upvotes: 10,
        location: { address: 'Main & 5th', coordinates: { latitude: 40.7589, longitude: -73.9851 } },
        reporter: citizenUsers[0]._id,
        assignedTo: { department: departmentMapping['pothole'] }
      },
      // Sanitation - trash near Carla
      {
        title: 'Overflowing garbage bins on Oak Avenue',
        description: 'Bins overflowing along Oak Ave.',
        category: 'trash',
        priority: 'medium',
        status: 'pending',
        location: { address: 'Oak Ave', coordinates: { latitude: 40.7505, longitude: -73.9934 } },
        reporter: citizenUsers[1]._id,
        assignedTo: { department: departmentMapping['trash'] }
      },
      // Water - broken main near Frank
      {
        title: 'Broken water main flooding residential area',
        description: 'Water main burst on Pine St.',
        category: 'water',
        priority: 'high',
        status: 'pending',
        location: { address: 'Pine St', coordinates: { latitude: 40.7512, longitude: -73.9906 } },
        reporter: citizenUsers[2]._id,
        assignedTo: { department: departmentMapping['water'] }
      },
      // Electricity - outage near Gina
      {
        title: 'Power outage on Central Park North',
        description: 'Area blackout affecting several blocks.',
        category: 'electricity',
        priority: 'high',
        status: 'pending',
        location: { address: 'Central Park North', coordinates: { latitude: 40.7831, longitude: -73.9712 } },
        reporter: citizenUsers[0]._id,
        assignedTo: { department: departmentMapping['electricity'] }
      }
    ];

    // Insert and auto-assign nearest authority in seed
    const createdIssues = await Issue.insertMany(issues);

    for (const issue of createdIssues) {
      const dept = issue.assignedTo && issue.assignedTo.department;
      const { latitude, longitude } = issue.location.coordinates;
      const nearest = await findNearestAuthority(dept, latitude, longitude);
      if (nearest) {
        issue.assignedTo.assignee = nearest._id;
      }
      issue.targetResolutionTime = calculateTargetResolutionTime(issue.upvotes, issue.priority, issue.createdAt);
      issue.isOverdue = new Date() > issue.targetResolutionTime && !['resolved', 'rejected'].includes(issue.status);
      await issue.save();
    }

    console.log('🎯 Created demo issues with nearest authority assignment');
    
    // Calculate target resolution times for all issues
    const allIssues = await Issue.find({});
    for (const issue of allIssues) {
      issue.targetResolutionTime = calculateTargetResolutionTime(issue.upvotes, issue.priority, issue.createdAt);
      issue.isOverdue = new Date() > issue.targetResolutionTime && !['resolved', 'rejected'].includes(issue.status);
      await issue.save();
    }
    console.log('⏰ Calculated target resolution times and overdue status');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📧 Demo Login Credentials:');
    console.log('👤 Citizen: citizen@demo.com / password123');
    console.log('🔐 Admins: admin1@demo.com, admin2@demo.com / password123');
    console.log('🏛️ Authorities:');
    console.log('  alice.pw@demo.com, bob.pw@demo.com, carla.san@demo.com');
    console.log('  dan.park@demo.com, eva.trf@demo.com, frank.water@demo.com');
    console.log('  gina.elec@demo.com, hank.gen@demo.com  (password123)');
    console.log('\n🚀 Start the application with:');
    console.log('Backend: npm run dev');
    console.log('Frontend: npm start');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedDatabase();