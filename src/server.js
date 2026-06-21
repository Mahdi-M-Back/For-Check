const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(process.env.NODE_ENV);
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config/.env' });
const app = require('./app');

//**PRODUCTION**
if (process.env.NODE_ENV === 'production') {
  const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
  );
  console.log(DB);
  mongoose
    .connect(DB)
    .then(() => {
      console.log('DATABASE Connected successfuly...🚀');
    })
    .catch(err => {
      console.log(err);
      console.log('ERROR connecting to DATABASE...💥');
    });
} else {
  const DB = process.env.DATABASE_LOCAL;

  mongoose.connect(DB).then(() => {
    console.log('DATABASE Connected successfuly...🚀');
  });
}

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
  console.log('***', process.env.NODE_ENV, '***');
});

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
