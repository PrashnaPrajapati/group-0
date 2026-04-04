const db = require('./db');

console.log('\n🔍 Checking Chat System Setup...\n');
 
db.query('DESCRIBE messages', (err, results) => {
  if (err) {
    console.log('❌ Messages table NOT found');
  } else {
    console.log('✅ Messages table exists');
    console.log('   Columns:', results.map(r => r.Field).join(', '));
  }
 
  db.query('DESCRIBE conversations', (err2, results2) => {
    if (err2) {
      console.log('❌ Conversations table NOT found');
    } else {
      console.log('✅ Conversations table exists');
      console.log('   Columns:', results2.map(r => r.Field).join(', '));
    }
 
    db.query('SELECT COUNT(*) as user_count FROM users', (err3, results3) => {
      if (err3) {
        console.log('❌ Users table error');
      } else {
        console.log(`✅ Users table exists (${results3[0].user_count} users)`);
      }

      console.log('\n✅ Chat system is ready!\n');
      console.log('📝 Next steps:');
      console.log('   1. Go to http://localhost:3000/login');
      console.log('   2. Login with your credentials');
      console.log('   3. Go to http://localhost:3000/chat');
      console.log('   4. Or go to http://localhost:3000/admin/chat for admin\n');

      process.exit(0);
    });
  });
});
