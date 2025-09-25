const router  = require("express").Router();
const parseController = require("../controllers/parseController");

router.post("/parse", parseController);


module.exports = router;