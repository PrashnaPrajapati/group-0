const db = require("../db");

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/check_user.js user@example.com');
  process.exit(1);
}

db.query('SELECT id, email, reset_token, reset_token_expires FROM users WHERE email = ?', [email], (err, results) => {
  if (err) { console.error('Query error:', err); process.exit(1); }
  if (results.length === 0) {
    console.log('No user found with email', email);
  } else {
    console.log('User row:', JSON.stringify(results[0], null, 2));
  }
  process.exit(0);
});

