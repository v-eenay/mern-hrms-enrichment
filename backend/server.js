const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const colors = require('colors');

// Load environment variables (suppress promotional messages)
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  if (!message.includes('dotenv') && !message.includes('dotenvx')) {
    originalConsoleLog(...args);
  }
};
dotenv.config();
console.log = originalConsoleLog;

// Import database connection
const connectDB = require('./config/database');

// Import models to ensure they are registered
require('./models');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Library Management System Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/books', require('./routes/books'));
app.use('/api/borrows', require('./routes/borrows'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/reviews', require('./routes/reviews'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.log('✗'.red, 'Error:'.red, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.log(err.stack.gray);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

// Enhanced startup display function
const displayStartupInfo = () => {
  const env = process.env.NODE_ENV || 'development';
  const serverUrl = `http://localhost:${PORT}`;

  console.log('\n' + '═'.repeat(80).cyan);
  console.log('║'.cyan + '                    📚 LIBRARY MANAGEMENT SYSTEM                    '.bold.white + '║'.cyan);
  console.log('║'.cyan + '                          Backend API Server                          '.white + '║'.cyan);
  console.log('═'.repeat(80).cyan);
  console.log('');

  // Server Status
  console.log('✓'.green, 'Server Status:'.bold, 'Running'.green);
  console.log('✓'.green, 'Environment:'.bold, env.toUpperCase().yellow);
  console.log('✓'.green, 'Port:'.bold, PORT.toString().cyan);
  console.log('✓'.green, 'URL:'.bold, serverUrl.blue.underline);
  console.log('');

  // API Endpoints Summary
  console.log('📋 Available API Endpoints:'.magenta);
  console.log('   ├─'.gray, 'GET  /health'.cyan, '- Server health check'.gray);
  console.log('   ├─'.gray, 'POST /api/auth/*'.cyan, '- Authentication routes'.gray);
  console.log('   ├─'.gray, 'GET  /api/books/*'.cyan, '- Book management'.gray);
  console.log('   ├─'.gray, 'POST /api/borrows/*'.cyan, '- Borrowing system'.gray);
  console.log('   ├─'.gray, 'GET  /api/categories/*'.cyan, '- Category management'.gray);
  console.log('   ├─'.gray, 'POST /api/contact'.cyan, '- Contact messages'.gray);
  console.log('   ├─'.gray, 'GET  /api/reviews/*'.cyan, '- Review system'.gray);
  console.log('   └─'.gray, 'GET  /api/users/*'.cyan, '- User management (Librarian)'.gray);
  console.log('');

  // Development Info
  if (env === 'development') {
    console.log('🔧 Development Mode:'.yellow);
    console.log('   ├─'.gray, 'Hot reload enabled'.yellow);
    console.log('   ├─'.gray, 'Detailed logging active'.yellow);
    console.log('   └─'.gray, 'CORS enabled for'.yellow, (process.env.CLIENT_URL || 'http://localhost:3000').cyan);
    console.log('');
  }

  console.log('🚀 Ready to accept connections!'.green);
  console.log('═'.repeat(80).cyan + '\n');
};

app.listen(PORT, () => {
  displayStartupInfo();
});
