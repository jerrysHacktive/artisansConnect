const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['customer', 'service_provider'],
      required: [true, 'Role is required'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    dateOfBirth: {
      type: String,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: [true, 'Gender is required'],
    },
    phoneNumber: {
      type: String,
      //required: [true, 'Phone number is required'],
      unique: [true, 'Phone number already registered'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: [true, 'Email already registered'],
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    address: {
      country: {
        type: String,
        required: [true, 'Country is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      localGovernment: {
        type: String,
        required: [true, 'Local government is required'],
      },
      currentAddress: {
        type: String,
        required: [true, 'Current address is required'],
      },
    },
    verification: {
      identityType: {
        type: String,
        enum: ['NIN', 'international_passport', 'drivers_license'],
        required: [true, 'Identity type is required'],
      },
      identityNumber: {
        type: String,
        required: [true, 'Identity number is required'],
      },
      selfiePath: {
        type: String,
        required: true,
      },
    },
    isLegalToWork: {
      type: Boolean,
      required: [true, 'Legal to work status is required'],
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: { type: String, default: process.env.DEFAULT_OTP },
      expiresAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
