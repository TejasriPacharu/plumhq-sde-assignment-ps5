const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const PORT=process.env.PORT;

const app = express();

app.listen(() => {
   console.log(`The server is listening from PORT: ${PORT}`);
});