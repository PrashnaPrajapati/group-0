const path = require("path");
const fs = require("fs");
const mysql = require("mysql2");

const envPath = [
  path.resolve(__dirname, ".env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../backend/.env"),
].find((candidate) => fs.existsSync(candidate));

require("dotenv").config({ path: envPath, quiet: true });
 
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "group0",
});
 
db.connect((err) => {
  if (err) {
    console.error("DB connection error:", err);
    return;
  }
  console.log("MySQL connected");
});

module.exports = db;
