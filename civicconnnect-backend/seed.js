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
  role: { type: String, enum: ['citizen', 'admin'], default: 'citizen' },
  address: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

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

async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Issue.deleteMany({});
    
    console.log('🗑️ Cleared existing data');

    // Create demo users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await User.insertMany([
      {
        name: 'John Doe',
        email: 'citizen@demo.com',
        phone: '+1-555-0101',
        password: hashedPassword,
        role: 'citizen',
        address: '123 Main Street, Anytown, USA'
      },
      {
        name: 'Admin User',
        email: 'admin@demo.com',
        phone: '+1-555-0100',
        password: hashedPassword,
        role: 'admin',
        address: 'City Hall, Government District'
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
    ]);

    console.log('👥 Created demo users');

    // Create demo issues with timing features
    const citizenUsers = users.filter(user => user.role === 'citizen');
    
    // Create issues with different timing scenarios
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    
    const issues = [
      {
        title: 'Large pothole on Main Street causing traffic issues',
        description: 'There is a significant pothole at the intersection of Main Street and 5th Avenue. It\'s about 2 feet wide and causing cars to swerve dangerously. This has been an ongoing issue for the past month and is getting worse with recent rains.',
        category: 'pothole',
        priority: 'high',
        status: 'in-progress',
        upvotes: 15,
        upvotedBy: [citizenUsers[1]._id, citizenUsers[2]._id], // Some users upvoted
        location: {
          address: 'Main Street & 5th Avenue, Anytown, USA',
          coordinates: { latitude: 40.7589, longitude: -73.9851 }
        },
        reporter: citizenUsers[0]._id,
        assignedTo: { department: 'Public Works' },
        comments: [
          {
            user: users.find(u => u.role === 'admin')._id,
            message: 'We have received your report and dispatched a crew to assess the situation. Repair work is scheduled for next Tuesday.',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          }
        ],
        estimatedResolution: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: fiveDaysAgo
      },
      {
        title: 'Broken streetlight near Central Park',
        description: 'The streetlight at the north entrance of Central Park has been out for over a week. This area gets quite dark at night and poses a safety risk for pedestrians and joggers.',
        category: 'streetlight',
        priority: 'medium',
        status: 'pending',
        upvotes: 8,
        upvotedBy: [citizenUsers[0]._id, citizenUsers[2]._id],
        location: {
          address: 'Central Park North Entrance, Anytown, USA',
          coordinates: { latitude: 40.7831, longitude: -73.9712 }
        },
        reporter: citizenUsers[1]._id,
        assignedTo: { department: 'Public Works' },
        createdAt: threeDaysAgo
      },
      {
        title: 'Overflowing garbage bins on Oak Avenue',
        description: 'The garbage bins along Oak Avenue between 2nd and 3rd street have been overflowing for several days. Trash is scattered around the area and it\'s becoming unsanitary.',
        category: 'trash',
        priority: 'high',
        status: 'resolved',
        upvotes: 12,
        upvotedBy: [citizenUsers[0]._id, citizenUsers[1]._id],
        location: {
          address: 'Oak Avenue between 2nd & 3rd Street, Anytown, USA',
          coordinates: { latitude: 40.7505, longitude: -73.9934 }
        },
        reporter: citizenUsers[2]._id,
        assignedTo: { department: 'Sanitation' },
        resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: users.find(u => u.role === 'admin')._id,
            message: 'Sanitation crew has been dispatched to empty the bins and clean up the area.',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            user: users.find(u => u.role === 'admin')._id,
            message: 'Issue has been resolved. Bins emptied and area cleaned. We\'ve also scheduled more frequent pickups for this location.',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          }
        ],
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Graffiti on downtown bridge underpass',
        description: 'There\'s extensive graffiti vandalism on the walls of the bridge underpass on Commerce Street. While some of it might be artistic, much of it is inappropriate and detracts from the area.',
        category: 'graffiti',
        priority: 'low',
        status: 'pending',
        location: {
          address: 'Commerce Street Bridge Underpass, Anytown, USA',
          coordinates: { latitude: 40.7282, longitude: -74.0776 }
        },
        reporter: citizenUsers[0]._id,
        assignedTo: { department: 'Parks & Recreation' },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Malfunctioning traffic signal causing delays',
        description: 'The traffic light at the intersection of Broadway and 1st Street is stuck on red in all directions. This is causing significant traffic backups during rush hours.',
        category: 'traffic',
        priority: 'high',
        status: 'in-progress',
        location: {
          address: 'Broadway & 1st Street, Anytown, USA',
          coordinates: { latitude: 40.7614, longitude: -73.9776 }
        },
        reporter: citizenUsers[1]._id,
        assignedTo: { department: 'Traffic Management' },
        estimatedResolution: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: users.find(u => u.role === 'admin')._id,
            message: 'Traffic management team has been notified. We have a temporary traffic director on site and are working to fix the signal.',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
          }
        ],
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        title: 'Blocked storm drain causing flooding',
        description: 'The storm drain on Maple Street is completely blocked with leaves and debris. During the last rainfall, water backed up and flooded the sidewalk and part of the street.',
        category: 'drainage',
        priority: 'medium',
        status: 'pending',
        location: {
          address: '200 block of Maple Street, Anytown, USA',
          coordinates: { latitude: 40.7410, longitude: -73.9897 }
        },
        reporter: citizenUsers[2]._id,
        assignedTo: { department: 'Public Works' },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Dangerous tree branch hanging over sidewalk',
        description: 'There\'s a large tree branch that looks like it could fall at any moment on Elm Street. It\'s hanging directly over the sidewalk where children walk to school.',
        category: 'other',
        priority: 'high',
        status: 'resolved',
        location: {
          address: '150 Elm Street, Anytown, USA',
          coordinates: { latitude: 40.7350, longitude: -73.9950 }
        },
        reporter: citizenUsers[0]._id,
        assignedTo: { department: 'Parks & Recreation' },
        resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        comments: [
          {
            user: users.find(u => u.role === 'admin')._id,
            message: 'Tree service crew dispatched immediately due to safety concern.',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
          },
          {
            user: users.find(u => u.role === 'admin')._id,
            message: 'Dangerous branch has been safely removed. Thanks for reporting this safety hazard.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          }
        ],
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      // Add some overdue issues to showcase the timing feature
      {
        title: 'Dangerous sinkhole on Elm Street',
        description: 'A large sinkhole has appeared on Elm Street near the school. It\'s about 3 feet deep and poses a serious safety hazard to pedestrians and vehicles. This needs immediate attention.',
        category: 'pothole',
        priority: 'high',
        status: 'pending',
        upvotes: 25,
        upvotedBy: [citizenUsers[0]._id, citizenUsers[1]._id, citizenUsers[2]._id],
        location: {
          address: 'Elm Street near Elementary School, Anytown, USA',
          coordinates: { latitude: 40.7505, longitude: -73.9934 }
        },
        reporter: citizenUsers[0]._id,
        assignedTo: { department: 'Public Works' },
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        title: 'Blocked storm drain causing flooding',
        description: 'The storm drain on Maple Avenue is completely blocked with debris. During yesterday\'s rain, water was backing up and flooding the street. This will get worse with more rain.',
        category: 'drainage',
        priority: 'medium',
        status: 'pending',
        upvotes: 18,
        upvotedBy: [citizenUsers[1]._id, citizenUsers[2]._id],
        location: {
          address: 'Maple Avenue & 4th Street, Anytown, USA',
          coordinates: { latitude: 40.7282, longitude: -74.0776 }
        },
        reporter: citizenUsers[2]._id,
        assignedTo: { department: 'Public Works' },
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      },
      {
        title: 'Broken water main flooding residential area',
        description: 'A water main has burst on Pine Street and is flooding several residential properties. Water is running down the street and into basements. This is an emergency situation.',
        category: 'other',
        priority: 'high',
        status: 'in-progress',
        upvotes: 30,
        upvotedBy: [citizenUsers[0]._id, citizenUsers[1]._id, citizenUsers[2]._id],
        location: {
          address: 'Pine Street Residential Area, Anytown, USA',
          coordinates: { latitude: 40.7614, longitude: -73.9776 }
        },
        reporter: citizenUsers[1]._id,
        assignedTo: { department: 'Public Works' },
        comments: [
          {
            user: users.find(u => u.role === 'admin')._id,
            message: 'Emergency crew dispatched. Water shutoff valve located and being activated.',
            timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
          }
        ],
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
      }
    ];

    await Issue.insertMany(issues);
    console.log('🎯 Created demo issues');
    
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
    console.log('🔐 Admin: admin@demo.com / password123');
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