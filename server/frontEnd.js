const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

app.get("*", (req, res) => {
  const pathname = path.join(__dirname, "../client", req.url);
  console.log("🚀 ~ file: frontEnd.js ~ line 8 ~ app.get ~ pathname", pathname)
  res.sendFile(pathname);
});

app.listen(3000);
