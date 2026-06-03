const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
  },
  userName: {
    type: String,
    unique: true,
    lowercase: true,
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'admin', 'owner'],
    default: 'user',
  },
  password: {
    type: String,
    minlength: 8,
    select: false,
  },
  passwordChangeAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

const User = mongoose.model('User', userSchema, 'Users');
module.exports = User;
