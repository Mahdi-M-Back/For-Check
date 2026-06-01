const User = require('../models/user.models')
const factory = require('../../../utilities/handlerfactory')

// These function not for user for another role like admin owner, ...
exports.createUser = factory.createOne(Review);
exports.getAllUser = factory.getAll(User)
exports.getOneUser = factory.getOne(User)
exports.deleteUser = factory.deleteOne(User)
//Don't update password with this 
exports.updateUser = factory.updateOne(User)

// These function exactully for user

exports.getMe = (req,res,next)=>{
  req.params.id = req.user.id
}