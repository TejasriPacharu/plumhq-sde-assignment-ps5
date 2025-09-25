const express = require("express");
const dotenv = require("dotenv");
const parseRoute = require("./routes/parseRoute");
const { initOcr } = require("./services/ocr");
dotenv.config();

const PORT = process.env.PORT;

const app = express();
app.use(express.json());

async function startServer() {
  await initOcr();

  // routes
  app.use("/api", parseRoute);

  app.get("/", (req, res) => {
    res.send("The API is running");
  });

  app.listen(PORT, () => {
    console.log(`The server is listening on PORT: ${PORT}`);
  });
}

startServer();
