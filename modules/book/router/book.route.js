const express = require("express");
const bookController = require('./../controller/book.controller')
const {protect} = require('./../../user/middleware/user.middleware')

const router =express.Router()
router.use(protect)

router.post('/',bookController.create)

module.exports = router