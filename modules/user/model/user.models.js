const mongoose = require('mongoose');
const abstractSchema = require('./../../../schema/abstract.schema')

const userSchema = new abstractSchema({
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
    enum: ['user', 'owner', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    minlength: 6,
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

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangeAt) {
    const changedTimestamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

module.exports = mongoose.model('User', userSchema, 'Users');
