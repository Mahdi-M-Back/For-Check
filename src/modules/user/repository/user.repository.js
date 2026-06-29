const BaseRepository = require('./../../../repositories/base.repository');
const User = require('./../model/user.models');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  findByEmail(email) {
    return this.model.findOne({ email });
  }

  findByEmailWithPassword(email) {
    return this.model.findOne({ email }).select('+password');
  }

  findByIdWithPassword(id) {
    return this.model.findById(id).select('+password');
  }

  findByResetToken(hashedToken) {
    return this.model.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  }
}

module.exports = new UserRepository();
