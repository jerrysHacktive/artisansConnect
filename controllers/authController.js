const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { setOTPExpiration } = require('../utils/otp-generator');
const cloudinary = require('cloudinary').v2;
const { sendOTPEmail } = require('../services/emailService');

//USERS REGISTRATION PROCESS

// PHONE VERIFICATION FUNCTION

const initiatePhoneVerification = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Create/update without full validation
    const user = await User.findOneAndUpdate(
      { phoneNumber },
      {
        $setOnInsert: { phoneNumber },
        $set: {
          otp: {
            code: process.env.DEFAULT_OTP,
            expiresAt: setOTPExpiration(),
          },
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: false,
      }
    );

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      otp: process.env.DEFAULT_OTP,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during phone verification',
    });
  }
};

const verifyPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.otp || user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }
    // this checks if the otp has expired
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired',
      });
    }

    // Update without running validation
    await User.findOneAndUpdate(
      { phoneNumber },
      {
        isPhoneVerified: true,
        $unset: { otp: 1 },
      },
      { runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
    });
  }
};

//EMAIL VERIFICATION FUNCTION

const initiateEmailVerification = async (req, res) => {
  try {
    const { phoneNumber, email } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user || !user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Verify phone number first',
      });
    }

    const otp = process.env.DEFAULT_OTP;
    const expiresAt = setOTPExpiration();

    await sendOTPEmail(email, otp);

    // Update without running validation
    await User.findOneAndUpdate(
      { phoneNumber },
      {
        email,
        otp: { code: otp, expiresAt },
      },
      { runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: 'OTP sent to email successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP email',
      error: error.message,
    });
  }
};

const verifyEmailOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.otp || user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired',
      });
    }

    // Update without running validation
    await User.findOneAndUpdate(
      { phoneNumber },
      {
        isEmailVerified: true,
        $unset: { otp: 1 }, //remove otp from db
      },
      { runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during email verification',
    });
  }
};

// PROFILE COMPLETION FUNCTION

const completeProfile = async (req, res) => {
  try {
    const {
      phoneNumber,
      // All other profile fields
      ...profileData
    } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isPhoneVerified || !user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Complete verification first',
      });
    }

    // Handle selfie upload
    let selfiePath = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'user_selfies',
        crop: 'fill',
      });
      selfiePath = result.secure_url;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(profileData.password, salt);

    // Update user with all profile data
    const updatedUser = await User.findOneAndUpdate(
      { phoneNumber },
      {
        ...profileData,
        password: hashedPassword,
        verification: {
          ...user.verification,
          selfiePath,
        },
        isProfileComplete: true,
      },
      { new: true, runValidators: true } // Now enforce validation
    );

    // Generate JWT
    const token = jwt.sign(
      { id: updatedUser._id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      token,
      user: {
        id: updatedUser._id,
        phoneNumber: updatedUser.phoneNumber,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profile completion failed',
    });
  }
};

// LOGIN FUNCTION

const login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Validate input
    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and password are required',
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user has completed profile setup
    if (!user.isProfileComplete) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile setup first',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

module.exports = {
  initiatePhoneVerification,
  verifyPhoneOTP,
  initiateEmailVerification,
  verifyEmailOTP,
  completeProfile,
  login,
};
