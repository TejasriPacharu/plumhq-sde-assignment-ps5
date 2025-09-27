const { extractText } = require("../services/ocr");
const extractEntities = require("../services/entity");
const normalizeEntities = require("../services/normalize");
const { validateInput } = require("../services/inputValidator");
const fs = require("fs").promises;

async function parseController(req, res) {
  try {
    // STEP 0: Input Validation
    console.log("=====================================================");
    console.log("STEP 0: PERFORMIN INPUT VALIDATION")
    const validationResult = await validateInput(req);
    
    if (!validationResult.isValid) {
      // Clean up uploaded file if validation fails
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up uploaded file:", cleanupError);
        }
      }
      
      return res.status(400).json({
        status: "error",
        message: "Input validation failed",
        errors: validationResult.errors,
        errorCode: validationResult.errorCode || 'VALIDATION_ERROR'
      });
    }
    
    console.log(`INPUT VALIDATION IS PASSED . INPUT TYPE: ${validationResult.inputType}`);
    console.log("=====================================================");
    // Prepare data for OCR - either text or image file path
    const ocrData = {
      text: validationResult.textValidation ? validationResult.textValidation.cleanText : req.body.text
    };

    // If a file was uploaded, use its path
    if (req.file) {
      ocrData.image_path = req.file.path;
    }

    // STEP 1: OCR/Text Extraction with Preprocessing
    console.log("STEP 1:STARTING OCR/TEXT EXTRACTION:");
    const ocrResult = await extractText(ocrData);
    
    const { raw_text, confidence: ocr_conf, preprocessing } = ocrResult;

    const output1 = {
      raw_text,
      confidence: ocr_conf,
    };
    
    console.log("OCR RESULT:", output1);
    console.log("STEP 1 IS DONE");
    console.log("=====================================================");

    // STEP 2: Entity Extraction
    console.log("STEP 2: ENTITY EXTRACTION");
    const ent = extractEntities(output1.raw_text, new Date());

    if (ent.entities_confidence < 0.6 || !ent.entities.department) {
      // Clean up uploaded file before returning error
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up uploaded file:", cleanupError);
        }
      }
      
      return res.status(422).json({
        status: "needs_clarification",
        message: "Missing entity: department or low confidence",
        raw_text,
        ocr_confidence: ocr_conf,
        entities: ent.entities,
        entities_confidence: ent.entities_confidence,
        preprocessing_info: preprocessing,
        errorCode: 'INSUFFICIENT_ENTITIES'
      });
    }
    
    const output2 = {
      entities: {
        date_phrase: ent.entities.date,
        time_phrase: ent.entities.time,
        department: ent.entities.department,
      },
      entities_confidence: ent.entities_confidence,
    };
    
    console.log("ENTITY EXTRACTION RESULT:", output2);
    console.log("STEP 2 IS DONE");
    console.log("=====================================================");
    // STEP 3: Normalization
    console.log("STEP 3: NORMALIZATION");
    const norm = await normalizeEntities({
      date: ent.entities.date,
      time: ent.entities.time
    });
    
    if (norm.status === "needs_clarification") {
      // Clean up uploaded file before returning error
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up uploaded file:", cleanupError);
        }
      }
      
      return res.status(422).json({
        status: "needs_clarification",
        message: norm.message,
        preprocessing_info: preprocessing,
        errorCode: 'NORMALIZATION_ERROR'
      });
    }

    const output3 = {
      normalized: {
        date: norm.normalized.date,
        time: norm.normalized.time,
        tz: norm.normalized.tz,
      },
      normalized_confidence: norm.normalized_confidence,
    };
    
    console.log("NORMALIZATION RESULT:", output3);
    console.log("STEP 3 IS DONE");

    console.log("=====================================================");
    console.log("STEP 4: FINAL APPOINTMENT JSON");
    // STEP 4: Final Appointment JSON
    const appointment = {
      department: ent.entities.department,
      date: norm.normalized.date,
      time: norm.normalized.time,
      tz: norm.normalized.tz,
    };
    
    // Clean up uploaded file after successful processing
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
        console.log("Successfully cleaned up uploaded file");
      } catch (cleanupError) {
        console.error("Error cleaning up uploaded file:", cleanupError);
      }
    }

    console.log("FINAL APPOINTMENT JSON:", appointment);
    console.log("STEP 4 IS DONE");
    console.log("=====================================================");
    console.log("STEP 5: RETURNING RESPONSE");
    console.log("=====================================================");
    return res.status(200).json({ 
      appointment, 
      status: "ok"
    });
    
  } catch (error) {
    console.error("Error in parseController:", error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up uploaded file:", cleanupError);
      }
    }

    return res.status(500).json({ 
      status: "error", 
      message: "Internal server error during processing",
      errorCode: 'INTERNAL_ERROR'
    });
  }
}

module.exports = parseController;
