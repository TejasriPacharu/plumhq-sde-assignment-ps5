const fs = require('fs').promises;
const path = require('path');

// Configuration constants
const MAX_TEXT_LENGTH = 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * Validates text input
 * @param {string} text - The text t    o validate
 * @returns {Object} - Validation result
 */
function validateText(text) {
    const errors = [];
    
    if (typeof text !== 'string') {
        errors.push('Text must be a string');
        return { isValid: false, errors };
    }
    
    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
        errors.push('Text cannot be empty');
    }
    
    if (trimmedText.length > MAX_TEXT_LENGTH) {
        errors.push(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
    }
    
    // Check for potentially malicious content
    const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(trimmedText)) {
            errors.push('Text contains potentially malicious content');
            break;
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        cleanText: trimmedText
    };
}

/**
 * Validates uploaded file
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Validation result
 */
async function validateFile(file) {
    const errors = [];
    
    if (!file) {
        return { isValid: true, errors: [] }; // File is optional
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        errors.push(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }
    
    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        errors.push(`Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Check if file exists and is readable
    if (file.path) {
        try {
            await fs.access(file.path, fs.constants.R_OK);
            const stats = await fs.stat(file.path);
            
            if (stats.size === 0) {
                errors.push('File is empty');
            }
            
            if (stats.size !== file.size) {
                errors.push('File size mismatch - file may be corrupted');
            }
        } catch (error) {
            errors.push('File is not accessible or corrupted');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        fileInfo: {
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path
        }
    };
}

/**
 * Validates the complete request input
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Complete validation result
 */
async function validateInput(req) {
    const { text } = req.body;
    const file = req.file;
    
    // Check if both text and file are provided (not allowed)
    if (text && text.trim() && file) {
        return {
            isValid: false,
            errors: ['Cannot provide both text and image. Please provide either text or image, not both.'],
            errorCode: 'BOTH_INPUTS_PROVIDED'
        };
    }
    
    // Check if neither text nor file is provided
    if ((!text || !text.trim()) && !file) {
        return {
            isValid: false,
            errors: ['No input provided. Please provide either text or an image.'],
            errorCode: 'NO_INPUT_PROVIDED'
        };
    }
    
    const validationResults = {
        isValid: true,
        errors: [],
        textValidation: null,
        fileValidation: null,
        inputType: null
    };
    
    // Validate text if provided
    if (text && text.trim()) {
        validationResults.textValidation = validateText(text);
        validationResults.inputType = 'text';
        
        if (!validationResults.textValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors.push(...validationResults.textValidation.errors);
        }
    }
    
    // Validate file if provided
    if (file) {
        validationResults.fileValidation = await validateFile(file);
        validationResults.inputType = 'image';
        
        if (!validationResults.fileValidation.isValid) {
            validationResults.isValid = false;
            validationResults.errors.push(...validationResults.fileValidation.errors);
        }
    }
    
    return validationResults;
}

module.exports = {
    validateInput,
    validateText,
    validateFile,
    MAX_TEXT_LENGTH,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS
};
