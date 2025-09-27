const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (increased from 5MB)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/';
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and random suffix
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(sanitizedOriginalName));
    }
});
  
const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        // Additional check for file extension
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png'];
        
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`), false);
        }
    } else {
        cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
    }
}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // Only allow single file upload
        fields: 10, // Limit number of fields
        fieldSize: 1024 * 1024 // 1MB field size limit
    }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    status: 'error',
                    message: `File too large. Maximum size allowed is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
                    errorCode: 'FILE_TOO_LARGE'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    status: 'error',
                    message: 'Too many files. Only one file is allowed',
                    errorCode: 'TOO_MANY_FILES'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    status: 'error',
                    message: 'Unexpected file field. Use "image" field name',
                    errorCode: 'UNEXPECTED_FILE_FIELD'
                });
            default:
                return res.status(400).json({
                    status: 'error',
                    message: 'File upload error: ' + error.message,
                    errorCode: 'UPLOAD_ERROR'
                });
        }
    } else if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.message,
            errorCode: 'FILE_VALIDATION_ERROR'
        });
    }
    next();
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;
