const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const { connectRedis } = require('./config/redis');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err);
  process.exit(1);
});

dotenv.config({ path: path.join(__dirname, '../config/.env') });

const app = require('./app');

if (process.env.NODE_ENV === 'production') {
  const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD,
  );

  mongoose
    .connect(DB)
    .then(() => console.log('DATABASE connected'))
    .catch((err) => {
      console.error('DATABASE connection failed:', err.message);
      process.exit(1);
    });
} else {
  mongoose
    .connect(process.env.DATABASE_LOCAL)
    .then(() => console.log('DATABASE Connected successfully... 🚀'));
}

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
  console.log('***', process.env.NODE_ENV, '***');
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  mongoose.connection.close();
  server.close(() => {
    process.exit(1);
  });
});
