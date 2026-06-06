require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

// Socket.io events
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // User joins a video room to get live comments
  socket.on('join_video', (videoId) => {
    socket.join(`video:${videoId}`);
    console.log(`Socket ${socket.id} joined video:${videoId}`);
  });

  // User leaves video room
  socket.on('leave_video', (videoId) => {
    socket.leave(`video:${videoId}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Serve uploaded videos
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

// Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/upload', require('./modules/videos/upload.routes'));
app.use('/api/videos', require('./modules/videos/videos.routes'));
app.use('/api/live', require('./modules/tv/live.routes'));
app.use('/api/search', require('./modules/feed/search.routes'));
app.use('/api/notifications', require('./modules/notifications/notifications.routes'));
app.use('/api/gifts', require('./modules/money/gifts.routes'));
app.use('/api/ads', require('./modules/money/ads.routes'));
app.use('/api/feed', require('./modules/feed/feed.routes'));
app.use('/api/trending', require('./modules/trending/trending.routes'));
app.use('/api/comments', require('./modules/comments/comments.routes'));

app.get('/', (req, res) => {
  res.json({
    app: 'HOTVID',
    version: '1.0.0',
    country: 'Uganda',
    status: 'running'
  });
});

const PORT = process.env.PORT || 3000;

// IMPORTANT: Use server.listen not app.listen (needed for Socket.io)
server.listen(PORT, () => {
  console.log(`HOTVID running on port ${PORT}`);
});
