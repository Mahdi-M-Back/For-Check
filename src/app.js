const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const globalErrorHandler = require('./utilities/errorHandler');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

app.set('query parser', 'extended');

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  max: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many auth attempts. Please try again in 1 hour.',
});

app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users/signup', authLimiter);
app.use('/api/v1/users/forgotPassword', authLimiter);


app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

const swaggerDocument = YAML.load('./src/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/v1', require('./router'));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use(globalErrorHandler);

module.exports = app;
