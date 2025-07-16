const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage - this tells multer to upload to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'selfie', // Creates a folder in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'], // Only allow image formats
    transformation: [
      { width: 300, height: 300, crop: 'fill' }, // Resize to 300x300
    ],
  },
});

// Create multer upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // We're limiting file size to 5MB
  },
});

module.exports = { cloudinary, upload };
