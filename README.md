# AI-Powered Appointment Scheduler Assistant

## Problem Statement
Build a backend service that parses natural language or document-based appointment requests and converts them into structured scheduling data. The system handles both typed text and noisy image inputs (e.g., scanned notes, emails) through a 4-step pipeline: OCR → Entity Extraction → Normalization → Final JSON output with guardrails for ambiguity.

## Architecture

```
code/
├── config/
│   └── departments.json          # Department configuration with synonyms
├── controllers/
│   └── parseController.js        # Main controller handling 4-step pipeline
├── middleware/
│   └── rateLimiter.js           # Rate limiting middleware (API, Upload, Concurrent)
├── routes/
│   └── parseRoute.js            # Single route: POST /api/parse
├── services/
│   ├── entity.js                # Step 2: Entity extraction using chrono-node
│   ├── inputValidator.js        # Input validation and security checks
│   ├── multer.js               # File upload handling with error management
│   ├── normalize.js            # Step 3: Date/time normalization to Asia/Kolkata
│   ├── ocr.js                  # Step 1: OCR processing with Tesseract.js
│   └── textPreprocessor.js     # OCR error correction and text preprocessing
├── uploads/                     # Temporary file storage
├── .env                        # Environment configuration
├── .gitignore                  # Git ignore rules
├── index.js                    # Express server setup and initialization
├── package.json                # Dependencies and scripts
└── test-deployed-api.js        # Comprehensive API testing script
```

## File Functions & Components

### Core Files

**index.js**
- Express server initialization, OCR worker setup, route mounting

**package.json**
- Dependencies: express, tesseract.js, chrono-node, sharp, multer, etc.

### Controllers

**parseController.js**
- Main 4-step pipeline controller:
  - Step 0: Input validation
  - Step 1: OCR/Text extraction with preprocessing
  - Step 2: Entity extraction (date, time, department)
  - Step 3: Normalization to ISO format (Asia/Kolkata timezone)
  - Step 4: Final appointment JSON generation

### Services

**ocr.js**
- Tesseract.js OCR processing, image preprocessing with Sharp, confidence scoring

**entity.js**
- Chrono-node date/time parsing, department matching, confidence calculation

**normalize.js**
- Luxon DateTime normalization, timezone conversion, past date validation

**inputValidator.js**
- Input validation, file security checks, malicious content detection

**textPreprocessor.js**
- OCR error correction, missing space addition, text normalization

**multer.js**
- File upload configuration, size limits (10MB), format validation

### Configuration

**departments.json**
- Department definitions with synonyms (Dentistry, Cardiology, etc.)

**rateLimiter.js**
- Express rate limiting (100 API calls, 20 uploads per 15min)

### Routes

**parseRoute.js**
- Single POST endpoint with rate limiting and file upload middleware as it will be easier while handling with the frontend

## API Routes

### Single Endpoint: POST /api/parse

**Accepts:**
- `Content-Type: application/json` - Text input
- `Content-Type: multipart/form-data` - Text + Image upload

**Request Examples:**

```bash
# Text Input format
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "Book dentist next Friday at 3pm"}' \
  https://your-api-url/api/parse

# Image Upload format
curl -X POST \
  -F 'text=Check my appointment' \
  -F 'image=@appointment.jpg' \
  https://your-api-url/api/parse

# Demo Example - 1
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "Meeting with orthopedic doctor next Friday at 2pm"}' \
  https://ai-powered-assignment-scheduler-plumhq.onrender.com/api/parse

# Demo Example - 2
curl -X POST \
  -F 'text=Check my appointment details' \
  -F 'image=@utils/image_trail3.png' \
  https://ai-powered-assignment-scheduler-plumhq.onrender.com/api/parse

# Demo Example - 3
curl -X POST \
  -F 'image=@utils/image_trail3.png' \
  https://ai-powered-assignment-scheduler-plumhq.onrender.com/api/parse

```  
    
## Guradrails, Error Types & Edge Cases

### Implemented Edge Cases:

**1. Empty Input - EMPTY_INPUT**
```json
{"status": "error", "message": "No input provided", "errorCode": "EMPTY_INPUT"}
```

**2. File Too Large - FILE_TOO_LARGE**
```json
{"status": "error", "message": "File too large. Maximum size allowed is 10MB", "errorCode": "FILE_TOO_LARGE"}
```

**3. Invalid File Format - INVALID_FILE_FORMAT**
```json
{"status": "error", "message": "Invalid file format. Only JPEG, JPG, PNG allowed", "errorCode": "INVALID_FILE_FORMAT"}
```

**4. Text Too Long - TEXT_TOO_LONG**
```json
{"status": "error", "message": "Text exceeds maximum length of 1000 characters", "errorCode": "TEXT_TOO_LONG"}
```

**5. OCR Confidence Low - LOW_OCR_CONFIDENCE**
```json
{"status": "error", "message": "OCR confidence too low", "errorCode": "LOW_OCR_CONFIDENCE"}
```

**6. Missing Entities - MISSING_ENTITIES**
```json
{"status": "error", "message": "Could not extract required appointment information", "errorCode": "MISSING_ENTITIES"}
```

**7. Normalization Failed - NORMALIZATION_ERROR**
```json
{"status": "needs_clarification", "message": "Unable to parse date/time", "errorCode": "NORMALIZATION_ERROR"}
```

**8. Rate Limiting - RATE_LIMIT_EXCEEDED**
```json
{"status": "error", "message": "Too many requests from this IP", "retryAfter": "15 minutes"}
```

**9. Malicious Content - MALICIOUS_CONTENT**
```json
{"status": "error", "message": "Text contains potentially malicious content", "errorCode": "MALICIOUS_CONTENT"}
```

**10. OCR Character Corrections - Automatic (transparent)**
- "nxt Friday" → "next Friday"
- "3pmappointment" → "3pm appointment"
- "dent" → "dentist"

## Response Examples

### Successful Processing:
```json
{
  "appointment": {
    "department": "Dentistry",
    "date": "2024-12-27",
    "time": "15:00",
    "tz": "Asia/Kolkata"
  },
  "status": "ok"
}
```

### Needs Clarification:
```json
{
  "status": "needs_clarification",
  "message": "Ambiguous date/time or department",
  "errorCode": "NORMALIZATION_ERROR"
}
```

## Local Setup

```bash
# Clone repository
git clone <repository-url>
cd plumhq-sde-assignment-ps5/code

# Install dependencies
npm install

# Set environment variables
echo "PORT=6001" > .env

# Start server
npm start
```

The server will start running on http://localhost:6001

### Testing Endpoints:

**Text Input:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "I have an appointment with Dr. Smith in Cardiology department on December 15th, 2024 at 3:30 PM"}' \
  http://localhost:6001/api/parse
```

**Image Upload:**
```bash
curl -X POST \
  -F 'text=Check my appointment details' \
  -F 'image=@/path/to/your/appointment-image.jpg' \
  http://localhost:6001/api/parse
```

## Deployment

**Deployed Link:** https://ai-powered-assignment-scheduler-plumhq.onrender.com/

### Testing Deployed API:

**Method 1: Node.js Test Script**
```bash
cd code
node test-deployed-api.js
```

**Method 2: Manual Testing**
```bash

# Test Appointment Parsing
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "Meeting with orthopedic doctor next Friday at 2pm"}' \
  https://ai-powered-assignment-scheduler-plumhq.onrender.com/api/parse
```

##  Testing

The project includes comprehensive testing tools:

**test-deployed-api.js**
- Automated test suite covering:
  - Text processing
  - Edge cases
  - Error handling

**Run Tests:**
```bash
node test-deployed-api.js
```

## Future Enhancements

### Other Improvements:
- **API Authentication** - JWT-based security system
- **Advanced OCR** - Support for handwritten text recognition
- **Database Integration** - Persistent appointment storage
- **Advanced NLP** - Better entity extraction with transformer models
- **Appointment Conflicts** - Scheduling conflict detection

### Additional Edge Cases:
- Duration of the appointment scheduling (like the appointment is schedueled on 24th August and the current month is September, but didn't mention the year, so do we need to consider this as past date or next year)
- Advanced image preprocessing for poor quality scans

## Performance Metrics

- **OCR Processing:** ~2-5 seconds for standard images
- **Text Processing:** ~100-200ms for typical inputs
- **Rate Limits:** 100 API calls, 20 uploads per 15 minutes
- **File Size Limit:** 10MB maximum
- **Text Length Limit:** 1000 characters maximum
- **Supported Formats:** JPEG, JPG, PNG

## Security Features

- Input validation and sanitization
- Malicious content detection
- File type and size validation
- Rate limiting protection
- Error message sanitization

---

**Built with:** Node.js, Express.js, Tesseract.js, Chrono-node, Sharp, Multer, Luxon
