require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

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

app.get('/', (req, res) => {
  res.json({ 
    app: 'HOTVID',
    version: '1.0.0',
    country: 'Uganda',
    status: 'running'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HOTVID running on port ${PORT}`);
});
