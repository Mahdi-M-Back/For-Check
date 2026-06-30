const BaseRepository = require('../../../repositories/base.repository');
const Book           = require('../model/book.model');

const BOOK_POPULATE = [
  { path: 'user',    select: 'name email' },
  { path: 'product', select: 'name price' },
];

class BookRepository extends BaseRepository {
  constructor() {
    super(Book);
  }

  findByIdWithDetails(id) {
    return this.model.findById(id).populate(BOOK_POPULATE);
  }

  query() {
    return this.model.find().populate(BOOK_POPULATE);
  }

}

module.exports = new BookRepository();