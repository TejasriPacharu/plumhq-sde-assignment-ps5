const { createWorker } = require("tesseract.js");
const sharp = require("sharp");

let worker;

async function initOcr() {
  worker = await createWorker("eng");
}

async function extractText({ text, image_base64 }) {
  if (typeof text === "string" && text.trim()) {
    return { raw_text: text.trim(), confidence: 0.98 };
  }

  if (!image_base64) {
    throw new Error("No input text or image provided");
  }

  const buffer = Buffer.from(image_base64, "base64");
  const pre = await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .toBuffer();

  const {
    data: { text: raw, words },
  } = await worker.recognize(pre);

  const cleanText = (raw || "").trim();
  const average = words?.length
    ? words.reduce((s, w) => s + w.confidence, 0) / words.length / 100
    : 0.85;

  return {
    raw_text: cleanText,
    confidence: Math.max(0.2, Math.min(1, average)),
  };
}

module.exports = {
  initOcr,
  extractText,
};
