const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { setOTPExpiration } = require('../utils/otp-generator');
const cloudinary = require('cloudinary').v2;
const { sendOTPEmail } = require('../services/emailService');

// Helper function to generate a JWT token
const generateAuthToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

// USERS REGISTRATION PROCESS

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
    console.error('Error in initiatePhoneVerification:', error);
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
// this checks if otp field is epmty or otp is does not match when user is sending inputed data
    if (!user.otp || user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // this checks if the otp is expired
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired',
      });
    }

    // Update the user's phone verification status
    await User.findOneAndUpdate(
      { phoneNumber },
      {
        isPhoneVerified: true,
        $unset: { otp: 1 },// this does not allowed otp field in response to client
      },
      { runValidators: false }
    );

    //
    res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
      userId: user._id,
    });
  } catch (error) {
    console.error('Error in verifyPhoneOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
    });
  }
};

// EMAIL VERIFICATION FUNCTION

const initiateEmailVerification = async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to initiate email verification.',
      });
    }
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to initiate email verification.',
      });
    }

    // Find the user by their ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this ID.',
      });
    }

    // Check if phone number is verified for the found user
    if (!user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        message:
          'Phone number must be verified before initiating email verification.',
      });
    }

    // If phone is verified, proceed to send OTP and update user's email and OTP
    const otp = process.env.DEFAULT_OTP;
    const expiresAt = setOTPExpiration();

    await sendOTPEmail(email, otp);

    // Update the user document found by ID with the new email and OTP details.
    await User.findByIdAndUpdate(
      userId, // Filter by user ID
      {
        email,
        otp: { code: otp, expiresAt },
      },
      { new: true, runValidators: false } //
    );

    res.status(200).json({
      success: true,
      message: 'OTP sent to email successfully',
    });
  } catch (error) {
    console.error('Error in initiateEmailVerification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP email',
      error: error.message,
    });
  }
};

const verifyEmailOTP = async (req, res) => {
  try {
    // IMPORTANT CHANGE: Now expects userId in the request body
    const { userId, otp } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to verify email OTP.',
      });
    }

    // Find user by ID
    const user = await User.findById(userId);
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

    // Update user by ID, setting isEmailVerified to true and unsetting OTP
    await User.findByIdAndUpdate(
      userId,
      {
        isEmailVerified: true,
        $unset: { otp: 1 }, // remove otp from db
      },
      { runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Error in verifyEmailOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification',
    });
  }
};

// PROFILE COMPLETION FUNCTION
const completeProfile = async (req, res) => {
  try {
    // IMPORTANT CHANGE: Now expects userId in the request body
    const {
      userId, // <--- Now using userId for identification
      ...profileData
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to complete profile.',
      });
    }

    // Find user by ID
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('User found in completeProfile:', user);
    console.log('isPhoneVerified from user object:', user.isPhoneVerified);
    console.log('isEmailVerified from user object:', user.isEmailVerified);

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

    const updatedUser = await User.findByIdAndUpdate(
      userId, // Filter by user ID
      {
        ...profileData,
        password: hashedPassword,
        verification: {
          ...user.verification,
          selfiePath,
        },
        isProfileComplete: true,
      },
      { new: true, runValidators: true }
    );

    //  helper function to generate the token
    const token = generateAuthToken(updatedUser);

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
    console.error('Error in completeProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Profile completion failed',
      error: error.message,
    });
  }
};

// LOGIN FUNCTION

const login = async (req, res) => {
  try {
    const { phoneNumber, email, password } = req.body; // Destructure both phoneNumber and email

    // Validate input: ensure at least one identifier (phoneNumber or email) and password are provided
    if ((!phoneNumber && !email) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Either phone number or email, and password are required',
      });
    }

    let user;
    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
    } else if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials', // Use a generic message for security
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
        message: 'Invalid credentials', // Use a generic message for security
      });
    }

    //helper function to generate the token
    const token = generateAuthToken(user);

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
    console.error('Error in login:', error);
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
