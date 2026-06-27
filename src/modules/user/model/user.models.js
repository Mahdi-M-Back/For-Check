const mongoose = require('mongoose');
const abstractSchema = require('./../../../schema/abstract.schema');

const userSchema = new abstractSchema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: true,
  },
  userName: {
    type: String,
    unique: true,
    lowercase: true,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'owner', 'admin'],
    default: 'user',
    required: true,
  },
  password: {
    type: String,
    minlength: 6,
    select: false,
    required: true,
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

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangeAt) {
    const changedTimestamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

module.exports = mongoose.model('User', userSchema, 'Users');
