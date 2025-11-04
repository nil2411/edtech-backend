import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  process.env.NETLIFY_URL
].filter(Boolean);

// Add Netlify domain pattern support
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any Netlify domain (*.netlify.app)
    if (origin.endsWith('.netlify.app')) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Hello EdTech Platform!' });
});

// Health check for Kubernetes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mock tenant data
const tenants = [
  { id: 'stanford', name: 'Stanford University', students: 2156, courses: 12, instructors: 24 },
  { id: 'mit', name: 'Massachusetts Institute of Technology', students: 3200, courses: 15, instructors: 32 },
  { id: 'oxford', name: 'University of Oxford', students: 1890, courses: 10, instructors: 18 },
  { id: 'berkeley', name: 'UC Berkeley', students: 2800, courses: 14, instructors: 28 }
];

const tenantCourses = {
  'stanford': [
    { id: '1', title: 'Introduction to Computer Science', instructor: 'Prof. David Williams', students: 1250, duration: '12 weeks', description: 'Learn the fundamentals of computer science' },
    { id: '2', title: 'Advanced Algorithms', instructor: 'Prof. Sarah Chen', students: 890, duration: '10 weeks', description: 'Deep dive into algorithm design and analysis' },
    { id: '3', title: 'Database Systems', instructor: 'Prof. Michael Brown', students: 650, duration: '8 weeks', description: 'Comprehensive database design and management' }
  ],
  'mit': [
    { id: '1', title: 'MIT Introduction to Machine Learning', instructor: 'Dr. John Smith', students: 2100, duration: '14 weeks', description: 'Introduction to ML concepts and applications' },
    { id: '2', title: 'Robotics Fundamentals', instructor: 'Dr. Emily Johnson', students: 1560, duration: '12 weeks', description: 'Build and program robots' },
    { id: '3', title: 'Quantum Computing', instructor: 'Dr. Robert Chen', students: 980, duration: '10 weeks', description: 'Quantum algorithms and computing principles' }
  ],
  'oxford': [
    { id: '1', title: 'Classical Literature', instructor: 'Prof. James Wilson', students: 980, duration: '8 weeks', description: 'Study of classical literary works' },
    { id: '2', title: 'Modern Philosophy', instructor: 'Dr. Mary Brown', students: 750, duration: '10 weeks', description: 'Contemporary philosophical thought' },
    { id: '3', title: 'Medieval History', instructor: 'Prof. Elizabeth Taylor', students: 620, duration: '12 weeks', description: 'European history from 500-1500 AD' }
  ],
  'berkeley': [
    { id: '1', title: 'Data Science Fundamentals', instructor: 'Prof. Robert Lee', students: 3200, duration: '12 weeks', description: 'Data analysis and visualization techniques' },
    { id: '2', title: 'Cloud Computing', instructor: 'Dr. Lisa Anderson', students: 1890, duration: '10 weeks', description: 'AWS, Azure, and GCP cloud services' },
    { id: '3', title: 'Software Engineering', instructor: 'Prof. David Kim', students: 1450, duration: '14 weeks', description: 'Best practices in software development' }
  ]
};

// User enrollment tracking (in-memory)
const userEnrollments = new Map(); // userId -> { courseId -> progress }

// Live session storage (in-memory for demo)
const liveSessions = new Map();

// Announcements storage
const announcements = [
  {
    id: '1',
    title: 'Mid-term Exams Schedule Released',
    content: 'Check your dashboard for exam dates and timings. All exams will be conducted online.',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    tenantId: 'all'
  },
  {
    id: '2',
    title: 'New Course Materials Available',
    content: 'Week 5 materials for all courses are now accessible in your course dashboard.',
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    tenantId: 'all'
  },
  {
    id: '3',
    title: 'Live Session Recording Available',
    content: 'Recordings from last week\'s live sessions are now available for review.',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    priority: 'low',
    tenantId: 'all'
  }
];

// GET /api/tenants - Get all tenants
app.get('/api/tenants', (req, res) => {
  res.json({ tenants });
});

// GET /api/tenant/:id - Get tenant details
app.get('/api/tenant/:id', (req, res) => {
  const tenant = tenants.find(t => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  res.json(tenant);
});

// GET /api/tenant/:id/courses
app.get('/api/tenant/:id/courses', (req, res) => {
  const tenantId = req.params.id;
  const courses = tenantCourses[tenantId] || [];
  res.json({ tenantId, courses, count: courses.length });
});

// POST /api/auth/login - User authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple mock authentication (in production, use proper auth)
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Generate mock user based on email
  const userId = email.split('@')[0].replace(/[^a-z0-9]/gi, '');
  const user = {
    id: userId,
    email,
    name: email.split('@')[0].replace(/[^a-z0-9]/gi, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    role: email.includes('admin') ? 'admin' : 'student',
    tenantId: 'stanford' // Default tenant
  };
  
  // Generate simple token (in production, use JWT)
  const token = `token_${userId}_${Date.now()}`;
  
  res.json({
    success: true,
    user,
    token
  });
});

// GET /api/announcements - Get announcements
app.get('/api/announcements', (req, res) => {
  const { tenantId } = req.query;
  let filteredAnnouncements = announcements;
  
  if (tenantId && tenantId !== 'all') {
    filteredAnnouncements = announcements.filter(a => 
      a.tenantId === tenantId || a.tenantId === 'all'
    );
  }
  
  // Format dates for frontend
  const formatted = filteredAnnouncements.map(a => ({
    ...a,
    date: formatTimeAgo(new Date(a.date))
  }));
  
  res.json(formatted);
});

// Helper function to format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

// GET /api/stats - Get platform statistics
app.get('/api/stats', (req, res) => {
  const totalTenants = tenants.length;
  const totalCourses = Object.values(tenantCourses).reduce((sum, courses) => sum + courses.length, 0);
  const totalStudents = tenants.reduce((sum, t) => sum + t.students, 0);
  const activeSessions = Array.from(liveSessions.values()).filter(s => s.status === 'active').length;
  
  res.json({
    totalTenants,
    totalCourses,
    totalStudents,
    activeLiveSessions: activeSessions
  });
});

// POST /api/courses/enroll - Enroll in a course
app.post('/api/courses/enroll', (req, res) => {
  const { userId, courseId, tenantId } = req.body;
  
  if (!userId || !courseId || !tenantId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const courses = tenantCourses[tenantId] || [];
  const course = courses.find(c => c.id === courseId);
  
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }
  
  if (!userEnrollments.has(userId)) {
    userEnrollments.set(userId, new Map());
  }
  
  const userCourses = userEnrollments.get(userId);
  if (!userCourses.has(courseId)) {
    userCourses.set(courseId, { progress: 0, enrolledAt: new Date().toISOString() });
  }
  
  res.json({ message: 'Enrolled successfully', course, progress: userCourses.get(courseId).progress });
});

// GET /api/courses/:courseId/progress - Get course progress
app.get('/api/courses/:courseId/progress', (req, res) => {
  const { courseId } = req.params;
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  const userCourses = userEnrollments.get(userId);
  if (!userCourses || !userCourses.has(courseId)) {
    return res.json({ progress: 0, enrolled: false });
  }
  
  res.json({ progress: userCourses.get(courseId).progress, enrolled: true });
});

// POST /api/courses/:courseId/progress - Update course progress
app.post('/api/courses/:courseId/progress', (req, res) => {
  const { courseId } = req.params;
  const { userId, progress } = req.body;
  
  if (!userId || progress === undefined) {
    return res.status(400).json({ error: 'userId and progress are required' });
  }
  
  if (!userEnrollments.has(userId)) {
    userEnrollments.set(userId, new Map());
  }
  
  const userCourses = userEnrollments.get(userId);
  if (!userCourses.has(courseId)) {
    userCourses.set(courseId, { progress: 0, enrolledAt: new Date().toISOString() });
  }
  
  const enrollment = userCourses.get(courseId);
  enrollment.progress = Math.max(0, Math.min(100, progress));
  enrollment.lastUpdated = new Date().toISOString();
  
  res.json({ message: 'Progress updated', progress: enrollment.progress });
});

// POST /api/live/join - Join a live session
app.post('/api/live/join', (req, res) => {
  const { sessionId, userId } = req.body;
  
  if (!sessionId || !userId) {
    return res.status(400).json({ error: 'sessionId and userId are required' });
  }
  
  const session = liveSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (session.status !== 'active') {
    return res.status(400).json({ error: 'Session is not active' });
  }
  
  session.attendees = (session.attendees || 0) + 1;
  liveSessions.set(sessionId, session);
  
  res.json({ message: 'Joined session successfully', session });
});

// POST /api/live/reminder - Set reminder for live session
app.post('/api/live/reminder', (req, res) => {
  const { sessionId, userId } = req.body;
  
  if (!sessionId || !userId) {
    return res.status(400).json({ error: 'sessionId and userId are required' });
  }
  
  res.json({ message: 'Reminder set successfully', sessionId });
});

// Admin endpoints
// POST /api/admin/courses - Create a new course
app.post('/api/admin/courses', (req, res) => {
  const { title, instructor, tenantId, duration, description } = req.body;
  
  if (!title || !instructor || !tenantId) {
    return res.status(400).json({ error: 'Missing required fields: title, instructor, tenantId' });
  }
  
  const courses = tenantCourses[tenantId] || [];
  const newCourse = {
    id: String(courses.length + 1),
    title,
    instructor,
    students: 0,
    duration: duration || '12 weeks',
    description: description || ''
  };
  
  courses.push(newCourse);
  tenantCourses[tenantId] = courses;
  
  res.status(201).json({ message: 'Course created successfully', course: newCourse });
});

// PUT /api/admin/courses/:courseId - Update a course
app.put('/api/admin/courses/:courseId', (req, res) => {
  const { courseId } = req.params;
  const { title, instructor, tenantId, duration, description } = req.body;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }
  
  const courses = tenantCourses[tenantId] || [];
  const courseIndex = courses.findIndex(c => c.id === courseId);
  
  if (courseIndex === -1) {
    return res.status(404).json({ error: 'Course not found' });
  }
  
  const course = courses[courseIndex];
  if (title) course.title = title;
  if (instructor) course.instructor = instructor;
  if (duration) course.duration = duration;
  if (description !== undefined) course.description = description;
  
  res.json({ message: 'Course updated successfully', course });
});

// DELETE /api/admin/courses/:courseId - Delete a course
app.delete('/api/admin/courses/:courseId', (req, res) => {
  const { courseId } = req.params;
  const { tenantId } = req.query;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }
  
  const courses = tenantCourses[tenantId] || [];
  const courseIndex = courses.findIndex(c => c.id === courseId);
  
  if (courseIndex === -1) {
    return res.status(404).json({ error: 'Course not found' });
  }
  
  courses.splice(courseIndex, 1);
  tenantCourses[tenantId] = courses;
  
  res.json({ message: 'Course deleted successfully' });
});

// POST /api/live/start
app.post('/api/live/start', (req, res) => {
  const { sessionId, title, instructor, tenantId } = req.body;
  if (!sessionId || !title || !instructor || !tenantId) {
    return res.status(400).json({ error: 'Missing required fields: sessionId, title, instructor, tenantId' });
  }
  const session = {
    sessionId,
    title,
    instructor,
    tenantId,
    status: 'active',
    startTime: new Date().toISOString(),
    attendees: 0
  };
  liveSessions.set(sessionId, session);
  res.status(201).json({ message: 'Live session started successfully', session });
});

// POST /api/live/stop
app.post('/api/live/stop', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing required field: sessionId' });
  }
  const session = liveSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  session.status = 'stopped';
  session.endTime = new Date().toISOString();
  liveSessions.set(sessionId, session);
  res.json({ message: 'Live session stopped successfully', session });
});

// GET /api/live/sessions
app.get('/api/live/sessions', (req, res) => {
  const sessions = Array.from(liveSessions.values());
  res.json({
    activeSessions: sessions.filter(s => s.status === 'active'),
    allSessions: sessions
  });
});

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  // Avoid noisy logs in tests; real apps would use a logger
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;


