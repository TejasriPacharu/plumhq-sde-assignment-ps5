const { extractText } = require("../services/ocr");
const extractEntities = require("../services/entity");
const normalizeEntities = require("../services/normalize");

async function parseController(req, res) {
  try {
    // STEP 1: OCR/Text Extraction
    const { raw_text, confidence: ocr_conf } = await extractText(req.body);

    const output1 = {
      raw_text,
      confidence: ocr_conf,
    };
    

    // STEP 2: Entity Extraction
    const ent = extractEntities(raw_text, new Date());

    if (ent.entities_confidence < 0.6 || !ent.entities.department) {
      return res.json({
        status: "needs_clarification",
        message: "Missing entity: department or low confidence",
        raw_text,
        ocr_conf,
        ent,
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


    // STEP 3: Normalization
    const norm = await normalizeEntities(ent.entities);
    if (norm.status === "needs_clarification") {
      return res.json({
        status: "needs_clarification",
        message: norm.message,
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

    // STEP 4: Final Appointment JSON
    const appointment = {
      department: ent.entities.department,
      date: norm.normalized.date,
      time: norm.normalized.time,
      tz: norm.normalized.tz,
    };
    return res.json({ appointment, status: "ok" });
  } catch (error) {
    console.error("Error in parseController:", error);
    return res.json({ status: "error", message: error.message });
  }
}

module.exports = parseController;
