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
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL || 'https://your-cloudfront-domain.cloudfront.net'
  ].filter(Boolean),
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
const tenantCourses = {
  'stanford': [
    { id: '1', title: 'Introduction to Computer Science', instructor: 'Prof. David Williams', students: 1250 },
    { id: '2', title: 'Advanced Algorithms', instructor: 'Prof. Sarah Chen', students: 890 }
  ],
  'mit': [
    { id: '1', title: 'MIT Introduction to Machine Learning', instructor: 'Dr. John Smith', students: 2100 },
    { id: '2', title: 'Robotics Fundamentals', instructor: 'Dr. Emily Johnson', students: 1560 }
  ],
  'oxford': [
    { id: '1', title: 'Classical Literature', instructor: 'Prof. James Wilson', students: 980 },
    { id: '2', title: 'Modern Philosophy', instructor: 'Dr. Mary Brown', students: 750 }
  ],
  'berkeley': [
    { id: '1', title: 'Data Science Fundamentals', instructor: 'Prof. Robert Lee', students: 3200 },
    { id: '2', title: 'Cloud Computing', instructor: 'Dr. Lisa Anderson', students: 1890 }
  ]
};

// Live session storage (in-memory for demo)
const liveSessions = new Map();

// GET /api/tenant/:id/courses
app.get('/api/tenant/:id/courses', (req, res) => {
  const tenantId = req.params.id;
  const courses = tenantCourses[tenantId] || [];
  res.json({ tenantId, courses, count: courses.length });
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


