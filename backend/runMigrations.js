const fs = require("fs");
const path = require("path");
const db = require("./db");

const runMigrations = async () => {
  try {
    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith(".sql"));

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`Running migration: ${file}`);

      // Split SQL by semicolons and execute each statement
      const statements = sql.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (statement) {
          await db.promise().query(statement);
        }
      }

      console.log(`Migration ${file} completed successfully`);
    }

    console.log("All migrations completed");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
};

runMigrations();