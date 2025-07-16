const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/uploads');

// Registration flow
router.post(
  '/initiate-phone-verification',
  authController.initiatePhoneVerification
);
router.post('/verify-phone-otp', authController.verifyPhoneOTP);
router.post(
  '/initiate-email-verification',
  authController.initiateEmailVerification
);
router.post('/verify-email-otp', authController.verifyEmailOTP);
router.post(
  '/complete-profile',
  upload.single('selfie'),
  authController.completeProfile
);

// Login
router.post('/login', authController.login);

module.exports = router;
