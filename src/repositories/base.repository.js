class BaseRepository {

  constructor(model) {
    this.model = model;
  }

  // ─── Read ─────────────────────────────────────────────────────────────────
  findById(id) {
    return this.model.findById(id);
  }

  findOne(filter) {
    return this.model.findOne(filter);
  }

  query() {
    return this.model.find();
  }

  // ─── Write ────────────────────────────────────────────────────────────────
  create(data) {
    return this.model.create(data);
  }

  update(id, data, options = { returnDocument: 'after', runValidators: true }) {
    return this.model.findByIdAndUpdate(id, data, options);
  }

  softDelete(id) {
    return this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedDate: new Date() },
      { returnDocument: 'after' },
    );
  }
}

module.exports = BaseRepository;