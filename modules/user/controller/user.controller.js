const User = require('../models/user.models')
const factory = require('../../../utilities/handlerfactory')


exports.getAllUser = factory.getAll(User)
exports.getOneUser = factory.getOne(User)
exports.deleteUser = factory.deleteOne(User)
//Don't update password with this 
exports.updateUser = factory.updateOne(User)
