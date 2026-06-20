const express = require('express');
const userController = require('../controller/user.controller');
const adminController = require('../controller/admin.controller');
const userMiddleware = require('../middleware/user.middleware');

const router = express.Router();

router.post('/signup', userMiddleware.signup, userController.signup);
router.post('/login', userMiddleware.login, userController.login);
router.post('/forgotPassword',userMiddleware.forgotPassword,userController.forgotPassword)
router.patch('/resetPassword/:token',userMiddleware.resetPassword,userController.resetPassword)

router.use(userMiddleware.protect);

router.patch('/updatePassword',userMiddleware.resetPassword,userController.updatePassword)
router
  .route('/me')
  .get(userController.getMe)
  .patch(userMiddleware.updateMe, userController.updateMe)
  .delete(userController.deleteMe);

router.patch(
  '/:id',
  userMiddleware.restrictTo('owner'),
  userMiddleware.updateRoleAndEmail,
  adminController.update,
);

router.use(userMiddleware.restrictTo('admin', 'owner'));

router.route('/').get(adminController.getAll);
// .post(userController.createUser);

router
  .route('/:id')
  .get(adminController.getOne)
  // HARD DELETE
  .delete(adminController.delete);

module.exports = router;
