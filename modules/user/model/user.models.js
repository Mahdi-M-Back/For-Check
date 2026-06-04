const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");
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

userSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('User', userSchema, 'Users');
