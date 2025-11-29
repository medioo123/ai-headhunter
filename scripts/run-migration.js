#!/usr/bin/env node

/**
 * Run Database Migration via Supabase Management API
 */

const fs = require('fs');
const path = require('path');

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

async function executeSqlStatements(url, secretKey, sqlStatements) {
  log(colors.cyan, '\n📊 Executing SQL statements...');

  const isModernKey = secretKey.startsWith('sb_secret_');

  const headers = {
    'apikey': secretKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  if (!isModernKey) {
    headers['Authorization'] = `Bearer ${secretKey}`;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < sqlStatements.length; i++) {
    const statement = sqlStatements[i].trim();

    if (!statement || statement.startsWith('--')) {
      continue; // Skip empty lines and comments
    }

    try {
      log(colors.blue, `\n[${i + 1}/${sqlStatements.length}] Executing...`);
      log(colors.yellow, statement.substring(0, 80) + (statement.length > 80 ? '...' : ''));

      // Use the SQL endpoint
      const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: statement }),
      });

      if (response.ok || response.status === 204) {
        log(colors.green, '  ✅ Success');
        successCount++;
      } else {
        const errorText = await response.text();
        log(colors.red, `  ❌ Failed: ${response.status} ${response.statusText}`);
        log(colors.yellow, `  ${errorText.substring(0, 200)}`);
        failCount++;
      }
    } catch (error) {
      log(colors.red, `  ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  return { successCount, failCount };
}

async function runMigrationDirectly(url, secretKey, sqlContent) {
  log(colors.cyan, '\n📊 Running migration via SQL query endpoint...');

  const isModernKey = secretKey.startsWith('sb_secret_');

  // Try using PostgREST's raw SQL endpoint (if available)
  // Note: This may not work as PostgREST doesn't expose raw SQL by default

  const headers = {
    'apikey': secretKey,
    'Content-Type': 'text/plain',
  };

  if (!isModernKey) {
    headers['Authorization'] = `Bearer ${secretKey}`;
  }

  try {
    // First, let's try to create a simple function to check if we can execute SQL
    const testFunction = `
      CREATE OR REPLACE FUNCTION run_migration(sql_text text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
      END;
      $$;
    `;

    const response = await fetch(`${url}/rest/v1/rpc/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sqlContent }),
    });

    if (response.ok) {
      log(colors.green, '✅ Migration executed successfully!');
      return true;
    } else {
      const errorText = await response.text();
      log(colors.yellow, `⚠️  Direct SQL execution not available: ${response.status}`);
      log(colors.yellow, errorText.substring(0, 300));
      return false;
    }
  } catch (error) {
    log(colors.yellow, `⚠️  Could not execute SQL directly: ${error.message}`);
    return false;
  }
}

async function createTablesViaRestAPI(url, secretKey) {
  log(colors.cyan, '\n🛠️  Creating tables via Supabase Management API...');

  // Extract project ref from URL
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    log(colors.red, '❌ Could not extract project reference from URL');
    return false;
  }

  log(colors.blue, `  Project ref: ${projectRef}`);

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Try using Supabase Management API
  const headers = {
    'apikey': secretKey,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        ...headers,
        'Authorization': `Bearer ${secretKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.ok) {
      log(colors.green, '✅ Migration executed successfully!');
      return true;
    } else {
      const errorText = await response.text();
      log(colors.yellow, `  Status: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    log(colors.yellow, `  Error: ${error.message}`);
    return false;
  }
}

async function main() {
  log(colors.blue, '\n╔════════════════════════════════════════╗');
  log(colors.blue, '║   Run Supabase Migration             ║');
  log(colors.blue, '╚════════════════════════════════════════╝');

  const env = loadEnv();

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    log(colors.red, '\n❌ Missing configuration!');
    process.exit(1);
  }

  log(colors.green, '\n✅ Configuration loaded');
  log(colors.cyan, `  URL: ${url}`);

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');

  if (!fs.existsSync(migrationPath)) {
    log(colors.red, '\n❌ Migration file not found!');
    log(colors.yellow, `  Expected: ${migrationPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  log(colors.green, '\n✅ Migration file loaded');
  log(colors.cyan, `  Path: ${migrationPath}`);
  log(colors.cyan, `  Size: ${sqlContent.length} characters`);

  // Try different approaches
  log(colors.yellow, '\n⚠️  Note: Supabase REST API does not support raw SQL execution.');
  log(colors.yellow, 'This is by design for security reasons.');
  log(colors.yellow, '\nAttempting alternative approaches...\n');

  // Approach 1: Try Management API
  const success1 = await createTablesViaRestAPI(url, secretKey);

  if (success1) {
    log(colors.green, '\n🎉 Migration completed successfully!');
    return;
  }

  // Approach 2: Try direct SQL endpoint
  const success2 = await runMigrationDirectly(url, secretKey, sqlContent);

  if (success2) {
    log(colors.green, '\n🎉 Migration completed successfully!');
    return;
  }

  // If all approaches failed, provide manual instructions
  log(colors.yellow, '\n═══════════════════════════════════════');
  log(colors.yellow, '\n⚠️  Automatic migration not available');
  log(colors.cyan, '\n📋 Please run the migration manually:');
  log(colors.cyan, '\n  1. Open your Supabase dashboard:');
  log(colors.blue, `     ${url.replace('//', '//app.')}/project/_/sql`);
  log(colors.cyan, '\n  2. Click "New Query"');
  log(colors.cyan, '  3. Copy the contents of:');
  log(colors.blue, `     ${migrationPath}`);
  log(colors.cyan, '  4. Paste into SQL Editor and click "Run"');
  log(colors.cyan, '\n  OR use the Supabase CLI:');
  log(colors.blue, '     npx supabase db push');
}

main().catch(error => {
  log(colors.red, '\n💥 Fatal error:', error.message);
  console.error(error);
  process.exit(1);
});
