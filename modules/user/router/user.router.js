const express = require('express');
const userController = require('../controller/user.controller');
const userMiddleware = require('../middleware/user.middleware');

const router = express.Router();

router.post('/signup', userMiddleware.signup, userController.signup);
router.post('/login', userMiddleware.login, userController.login);

router.use(userMiddleware.protect);

router
  .route('/me')
  .get(userController.getMe)
  .patch(userMiddleware.updateMe,userController.updateMe)
  .delete(userController.deleteMe);

// router
//   .route('/')
//   .get(userController.getAllUser)
//   .post(userController.createUser);
// router
//   .route('/:id')
//   .get(userController.getOneUser)
//   .patch(userController.updateUser)
//   .delete(userController.deleteUser);

module.exports = router;
