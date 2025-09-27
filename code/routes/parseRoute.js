const router  = require("express").Router();
const parseController = require("../controllers/parseController");
const upload = require("../services/multer");
const { handleMulterError } = require("../services/multer");
const { apiLimiter, uploadLimiter } = require("../middleware/rateLimiter");

// Apply both API rate limiting and upload rate limiting to the parse endpoint
router.post("/parse", apiLimiter, uploadLimiter, upload.single('image'), handleMulterError, parseController);

module.exports = router;