#!/usr/bin/env node

/**
 * Run Database Migration using PostgreSQL Direct Connection
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envPath)) {
    log(colors.red, '❌ .env.local file not found!');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });

  return env;
}

async function runMigration() {
  log(colors.blue, '\n╔════════════════════════════════════════╗');
  log(colors.blue, '║   Run Database Migration             ║');
  log(colors.blue, '╚════════════════════════════════════════╝');

  const env = loadEnv();

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const dbUrl = env.DATABASE_URL;

  if (!url) {
    log(colors.red, '\n❌ NEXT_PUBLIC_SUPABASE_URL not found!');
    process.exit(1);
  }

  if (!dbUrl) {
    log(colors.yellow, '\n⚠️  DATABASE_URL not found in .env.local');
    log(colors.cyan, '\nPlease add your database connection string:');
    log(colors.cyan, '\n1. Go to your Supabase dashboard');
    log(colors.cyan, '2. Click Settings → Database');
    log(colors.cyan, '3. Scroll to "Connection string" → "URI"');
    log(colors.cyan, '4. Copy the connection string');
    log(colors.cyan, '5. Add to .env.local:');
    log(colors.blue, '   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@...');
    log(colors.yellow, '\n⚠️  Make sure to replace [YOUR-PASSWORD] with your actual database password!');
    process.exit(1);
  }

  log(colors.green, '\n✅ Configuration loaded');
  log(colors.cyan, `  Project: ${url}`);

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');

  if (!fs.existsSync(migrationPath)) {
    log(colors.red, '\n❌ Migration file not found!');
    log(colors.yellow, `  Expected: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  log(colors.green, '✅ Migration file loaded');
  log(colors.cyan, `  Size: ${(sql.length / 1024).toFixed(2)} KB`);

  log(colors.cyan, '\n🔌 Connecting to database...');

  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false, // Supabase uses SSL
    },
  });

  try {
    await client.connect();
    log(colors.green, '✅ Connected to database');

    log(colors.cyan, '\n📊 Executing migration...');
    await client.query(sql);

    log(colors.green, '\n✅ Migration executed successfully!');

    // Verify tables were created
    log(colors.cyan, '\n🔍 Verifying tables...');

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('hunts', 'queries', 'profiles')
      ORDER BY table_name;
    `);

    if (result.rows.length === 3) {
      log(colors.green, '\n✅ All tables created successfully:');
      result.rows.forEach(row => {
        log(colors.cyan, `  ✓ ${row.table_name}`);
      });
    } else {
      log(colors.yellow, `\n⚠️  Expected 3 tables, found ${result.rows.length}`);
    }

    log(colors.green, '\n🎉 Migration completed!');

  } catch (error) {
    log(colors.red, '\n❌ Migration failed!');
    log(colors.red, `Error: ${error.message}`);

    if (error.message.includes('already exists')) {
      log(colors.yellow, '\n⚠️  Tables may already exist. This is normal if you ran the migration before.');
    } else {
      console.error('\nFull error:', error);
    }

    process.exit(1);
  } finally {
    await client.end();
    log(colors.cyan, '\n🔌 Database connection closed');
  }
}

runMigration().catch(error => {
  log(colors.red, '\n💥 Fatal error:', error.message);
  console.error(error);
  process.exit(1);
});
