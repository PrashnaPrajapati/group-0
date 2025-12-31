require('dotenv').config();
const mysql = require('mysql2');
const email = process.argv[2];
if (!email) {
  console.error('Usage: node check_user.js user@example.com');
  process.exit(1);
}
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) { console.error('DB connect error:', err); process.exit(1); }
  db.query('SELECT id, email, reset_token, reset_token_expires FROM users WHERE email = ?', [email], (err, results) => {
    if (err) { console.error('Query error:', err); process.exit(1); }
    if (results.length === 0) {
      console.log('No user found with email', email);
    } else {
      console.log('User row:', JSON.stringify(results[0], null, 2));
    }
    process.exit(0);
  });
});
