/**
 * Text Preprocessing Service for OCR Error Correction
 * Handles common OCR misrecognitions and missing spaces
 */

// Common OCR character misrecognitions
const OCR_CORRECTIONS = {
    // Common character substitutions
    'nxt': 'next',
    'tmrw': 'tomorrow',
    'tdy': 'today',
    'appt': 'appointment',
    'dr': 'doctor',
    'dent': 'dentist',
    'cardio': 'cardiologist',
    'derm': 'dermatologist',
    'phys': 'physician',
    'clnc': 'clinic',
    'hosp': 'hospital',
    'med': 'medical',
    'chk': 'check',
    'chkup': 'checkup',
    'exam': 'examination',
    'consult': 'consultation',
    'followup': 'follow up',
    'follow-up': 'follow up',
    
    // Time-related corrections
    'am': 'am',
    'pm': 'pm',
    'AM': 'am',
    'PM': 'pm',
    'a.m.': 'am',
    'p.m.': 'pm',
    'A.M.': 'am',
    'P.M.': 'pm',
    
    // Number corrections
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'O': '0', 'l': '1', 'I': '1', 'S': '5', 'G': '6',
    
    // Day corrections
    'mon': 'monday',
    'tue': 'tuesday', 'tues': 'tuesday',
    'wed': 'wednesday',
    'thu': 'thursday', 'thur': 'thursday', 'thurs': 'thursday',
    'fri': 'friday',
    'sat': 'saturday',
    'sun': 'sunday',
    
    // Month corrections
    'jan': 'january',
    'feb': 'february',
    'mar': 'march',
    'apr': 'april',
    'may': 'may',
    'jun': 'june', 'june': 'june',
    'jul': 'july', 'july': 'july',
    'aug': 'august',
    'sep': 'september', 'sept': 'september',
    'oct': 'october',
    'nov': 'november',
    'dec': 'december'
};

// Patterns for adding missing spaces
const SPACE_PATTERNS = [
    // Time patterns: "3pm" -> "3 pm", "10am" -> "10 am"
    { pattern: /(\d+)(am|pm)/gi, replacement: '$1 $2' },
    
    // Date patterns: "nextfriday" -> "next friday"
    { pattern: /\b(next|last|this)(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, replacement: '$1 $2' },
    
    // Appointment patterns: "dentistappointment" -> "dentist appointment"
    { pattern: /\b(dentist|doctor|cardio|derm|physician)(appointment|appt)/gi, replacement: '$1 appointment' },
    
    // Time with colon: "3:30pm" -> "3:30 pm"
    { pattern: /(\d+:\d+)(am|pm)/gi, replacement: '$1 $2' },
    
    // At symbol: "friday@3pm" -> "friday at 3pm"
    { pattern: /([a-zA-Z])@(\d)/gi, replacement: '$1 at $2' },
    
    // Department + day: "dentistnext" -> "dentist next"
    { pattern: /\b(dentist|doctor|cardio|derm|physician)(next|last|this|tomorrow|today)/gi, replacement: '$1 $2' },
    
    // Book + department: "bookdentist" -> "book dentist"
    { pattern: /\b(book|schedule|make)(dentist|doctor|cardio|derm|physician|appointment)/gi, replacement: '$1 $2' },
    
    // Number + time unit: "3pmappointment" -> "3pm appointment"
    { pattern: /(\d+(?::\d+)?\s*(?:am|pm))(appointment|appt)/gi, replacement: '$1 appointment' },
    
    // Day + time: "friday3pm" -> "friday 3pm"
    { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(\d)/gi, replacement: '$1 $2' },
    
    // Missing space before "at": "3pmat" -> "3pm at"
    { pattern: /(\d+(?::\d+)?\s*(?:am|pm))at/gi, replacement: '$1 at' }
];

/**
 * Corrects common OCR character misrecognitions
 * @param {string} text - Input text with potential OCR errors
 * @returns {string} - Text with corrected characters
 */
function correctOCRErrors(text) {
    let correctedText = text.toLowerCase();
    
    // Apply word-level corrections
    const words = correctedText.split(/\s+/);
    const correctedWords = words.map(word => {
        // Remove punctuation for matching but preserve it
        const cleanWord = word.replace(/[^\w]/g, '');
        const punctuation = word.replace(/[\w]/g, '');
        
        if (OCR_CORRECTIONS[cleanWord]) {
            return OCR_CORRECTIONS[cleanWord] + punctuation;
        }
        return word;
    });
    
    return correctedWords.join(' ');
}

/**
 * Adds missing spaces using pattern matching
 * @param {string} text - Input text with potential missing spaces
 * @returns {string} - Text with spaces added
 */
function addMissingSpaces(text) {
    let processedText = text;
    
    // Apply each space pattern
    for (const { pattern, replacement } of SPACE_PATTERNS) {
        processedText = processedText.replace(pattern, replacement);
    }
    
    return processedText;
}

/**
 * Normalizes text formatting
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
    return text
        .trim()
        // Remove extra spaces
        .replace(/\s+/g, ' ')
        // Normalize punctuation
        .replace(/\s*@\s*/g, ' at ')
        .replace(/\s*&\s*/g, ' and ')
        // Ensure proper capitalization for common words
        .replace(/\bam\b/gi, 'am')
        .replace(/\bpm\b/gi, 'pm');
}

/**
 * Main preprocessing function that applies all corrections
 * @param {string} rawText - Raw text from OCR or user input
 * @returns {Object} - Processed text with metadata
 */
function preprocessText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return {
            originalText: rawText,
            processedText: rawText,
            corrections: [],
            confidence: 0
        };
    }
    
    const corrections = [];
    let currentText = rawText;
    
    // Step 1: Add missing spaces
    const spacedText = addMissingSpaces(currentText);
    if (spacedText !== currentText) {
        corrections.push({
            type: 'spacing',
            original: currentText,
            corrected: spacedText,
            description: 'Added missing spaces'
        });
        currentText = spacedText;
    }
    
    // Step 2: Correct OCR character errors
    const correctedText = correctOCRErrors(currentText);
    if (correctedText !== currentText) {
        corrections.push({
            type: 'ocr_correction',
            original: currentText,
            corrected: correctedText,
            description: 'Corrected OCR character misrecognitions'
        });
        currentText = correctedText;
    }
    
    // Step 3: Normalize formatting
    const normalizedText = normalizeText(currentText);
    if (normalizedText !== currentText) {
        corrections.push({
            type: 'normalization',
            original: currentText,
            corrected: normalizedText,
            description: 'Normalized text formatting'
        });
        currentText = normalizedText;
    }
    
    // Calculate confidence based on number of corrections needed
    const confidence = Math.max(0.6, 1 - (corrections.length * 0.1));
    
    return {
        originalText: rawText,
        processedText: currentText,
        corrections,
        confidence: Math.round(confidence * 100) / 100,
        hasCorrections: corrections.length > 0
    };
}

/**
 * Test function to validate preprocessing
 * @param {string} testText - Text to test
 */
function testPreprocessing(testText) {
    const result = preprocessText(testText);
    return result;
}

module.exports = {
    preprocessText,
    correctOCRErrors,
    addMissingSpaces,
    normalizeText,
    testPreprocessing,
    OCR_CORRECTIONS,
    SPACE_PATTERNS
};
