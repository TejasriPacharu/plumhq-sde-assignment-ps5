const { createWorker } = require("tesseract.js");
const sharp = require("sharp");
const { preprocessText } = require("./textPreprocessor");
const fs = require("fs").promises;

let worker;

async function initOcr() {
  // Initialize Tesseract worker once
}

async function extractText({ text, image_path }) {
  let rawText = "";
  let baseConfidence = 0.90; // Default high confidence for text input

  if (text) {
    // Direct text input - high confidence
    rawText = text.trim();
    baseConfidence = 0.92; // High confidence for direct text input
  } 
  else if (image_path) {
    // Image OCR processing
    try {
      // Preprocess image
      const processedImagePath = `${image_path}_processed.png`;
      await sharp(image_path)
        .resize(null, 800, { withoutEnlargement: true })
        .grayscale()
        .normalize()
        .png()
        .toFile(processedImagePath);

      // Initialize worker if not already done
      if (!worker) {
        worker = await createWorker("eng");
      }

      // Perform OCR
      const { data: { text: ocrText, words } } = await worker.recognize(processedImagePath);
      
      // Clean up processed image
      await fs.unlink(processedImagePath).catch(() => {});
      
      rawText = (ocrText || "").trim();
      
      // Calculate intelligent OCR confidence
      if (words && words.length > 0) {
        // Get average word confidence from Tesseract
        const avgWordConfidence = words.reduce((sum, word) => sum + word.confidence, 0) / words.length;
        
        // Normalize to 0-1 scale
        const normalizedConfidence = avgWordConfidence / 100;
        
        // Apply quality assessment
        const textLength = rawText.length;
        const wordCount = words.length;
        const avgWordLength = textLength / Math.max(wordCount, 1);
        
        // Quality factors
        let qualityMultiplier = 1.0;
        
        // Penalize very short extractions (likely poor OCR)
        if (textLength < 10) {
          qualityMultiplier *= 0.7;
        }
        
        // Penalize if average word length is too short (fragmented text)
        if (avgWordLength < 3) {
          qualityMultiplier *= 0.8;
        }
        
        // Reward longer, coherent text
        if (textLength > 20 && avgWordLength > 4) {
          qualityMultiplier *= 1.1;
        }
        
        // Calculate final confidence
        baseConfidence = Math.min(0.95, Math.max(0.3, normalizedConfidence * qualityMultiplier));
        
        // If text looks well-formed (contains common appointment words), boost confidence
        const appointmentKeywords = /\b(appointment|meeting|doctor|dentist|schedule|book|visit|consultation|pm|am|tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i;
        if (appointmentKeywords.test(rawText)) {
          baseConfidence = Math.min(0.90, baseConfidence * 1.1);
        }
        
      } else {
        baseConfidence = 0.3; // Low confidence if no words detected
      }
      
    } catch (error) {
      console.error("OCR processing error:", error);
      baseConfidence = 0.2;
    }
  } 
  else {
    throw new Error("No input text or image provided");
  }

  // If no text extracted, return early
  if (!rawText) {
    return {
      raw_text: "",
      confidence: 0.1,
      preprocessing: {
        applied: false,
        reason: "No text to process"
      }
    };
  }

  const preprocessingResult = preprocessText(rawText);
  
  // Adjust confidence based on preprocessing quality
  let finalConfidence = baseConfidence;
  
  if (preprocessingResult.hasCorrections) {
    // If preprocessing made corrections, slightly reduce confidence but not too much
    // since corrections often improve the text quality
    const correctionPenalty = Math.min(0.1, preprocessingResult.corrections.length * 0.02);
    finalConfidence = Math.max(0.3, baseConfidence - correctionPenalty);
  }
  
  // If the final processed text looks good, ensure minimum confidence
  const processedText = preprocessingResult.processedText;
  if (processedText.length > 15 && /\b(appointment|meeting|doctor|dentist|schedule|book)\b/i.test(processedText)) {
    finalConfidence = Math.max(0.75, finalConfidence);
  }

  return {
    raw_text: preprocessingResult.processedText,
    confidence: Math.round(finalConfidence * 100) / 100,
    preprocessing: {
      applied: preprocessingResult.hasCorrections,
      original_text: preprocessingResult.originalText,
      corrections: preprocessingResult.corrections,
      preprocessing_confidence: preprocessingResult.confidence
    }
  };
}

module.exports = {
  initOcr,
  extractText,
};