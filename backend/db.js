const mysql = require("mysql2");

// Create a single connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Root@1234",  // Your MySQL root password
  database: "group0",     // or "singarglow" if you renamed it
});

// Connect and print message
db.connect((err) => {
  if (err) {
    console.error("DB connection error:", err);
    return;
  }
  console.log("MySQL connected");
});

module.exports = db;
