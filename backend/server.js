// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const passport = require('passport');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const payment = require('./routes/payment');
const aiChatRoutes = require('./routes/aichat');


require('dotenv').config(); 
require('./config/passport');

const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// ================================
// ⚡ SOCKET.IO SETUP
// ================================
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// ✅ Middleware to make io available globally
app.set('io', io);

// ================================
// 🔐 SECURITY & GLOBAL MIDDLEWARES
// ================================
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173'
  ],
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_session_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

// ================================
// 🪵 Logging + JSON Error Guard
// ================================
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} body:`, req.body);
  next();
});

app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err))) {
    console.error('Invalid JSON payload:', err.message);
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }
  next(err);
});

// ================================
// 🚦 RATE LIMITER
// ================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ================================
// 💾 DATABASE CONNECTION
// ================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ================================
// 🧩 ROUTES
// ================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/artworks', require('./routes/artworks'));
app.use('/api/users', require('./routes/users'));
app.use('/api', require('./routes/reviews'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/contests', require('./routes/contests'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/push', require('./routes/pushSubscriptions'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/payments', require('./routes/payment'));
console.log('✅ /api/payments route mounted');
app.use('/api/ai-chat', require('./routes/aichat'));


app.get('/api/cors-test', (req, res) => res.json({ ok: true }));

// ================================
// ⚠️ GLOBAL ERROR HANDLER
// ================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ================================
// ⚡ SOCKET.IO AUTH & CONNECTION
// ================================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return next(new Error('User not found'));

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ ${socket.user.username} connected`);

  // Each user joins their own personal room for notifications
  socket.join(`user_${socket.userId}`);

  // 💬 Typing indicators
  socket.on('typing_start', (data) => {
    socket.to(`user_${data.recipientId}`).emit('user_typing', {
      userId: socket.userId,
      username: socket.user.username
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(`user_${data.recipientId}`).emit('user_stopped_typing', {
      userId: socket.userId
    });
  });

  // 🟢 User online status broadcast
  socket.broadcast.emit('user_status_change', {
    userId: socket.userId,
    status: 'online'
  });

  // 🛑 Disconnection
  socket.on('disconnect', () => {
    console.log(`❌ ${socket.user.username} disconnected`);
    socket.broadcast.emit('user_status_change', {
      userId: socket.userId,
      status: 'offline'
    });
  });
});

// ================================
// 🚀 SERVER START
// ================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`✅ Socket.IO enabled for real-time features`);
  console.log(`✅ Allowed client: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});
