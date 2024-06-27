const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000', // Client URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Database connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
});

// Routes
app.use('/api/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Help Web App API');
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('a user connected');
  
  // WebRTC signaling messages
  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  socket.on('candidate', (candidate) => {
    socket.broadcast.emit('candidate', candidate);
  });

  socket.on('comment', (comment) => {
    socket.emit('comment', comment);
    if (comment.length > 0) {
      console.log('Comment received');
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).send('404: Route not found');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('500: Internal Server Error');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
