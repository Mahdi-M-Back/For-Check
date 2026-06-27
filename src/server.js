const path   = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose    = require('mongoose');
const redisClient = require('./config/redis');
const app         = require('./app');


const startServer = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('REDIS CONNECTION FAILED:', err.message);
    process.exit(1);
  }

  // 2) Connect MongoDB.
  const DB = process.env.NODE_ENV === 'production'
    ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
    : process.env.DATABASE_LOCAL;

  try {
    await mongoose.connect(DB);
    console.log('DATABASE connected');
  } catch (err) {
    console.error('DATABASE CONNECTION FAILED:', err.message);
    await redisClient.quit();
    process.exit(1);
  }

  // 3) Start the HTTP server only after both connections are ready.
  const port   = process.env.PORT || 3000;
  const server = app.listen(port, () =>
    console.log(`App running on port ${port} [${process.env.NODE_ENV}]`),
  );

  process.on('unhandledRejection', async (err) => {
    console.error('UNHANDLED REJECTION :', err.name, err.message);
    await mongoose.connection.close();
    await redisClient.quit();
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', async (err) => {
    console.error('UNCAUGHT EXCEPTION :', err.name, err.message);
    await mongoose.connection.close();
    await redisClient.quit();
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received — shutting down gracefully');
    await mongoose.connection.close();
    await redisClient.quit();
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
};

startServer();