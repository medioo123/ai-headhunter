#!/usr/bin/env node

/**
 * Supabase Setup Script
 *
 * This script will:
 * 1. Test your Supabase connection
 * 2. Run database migrations
 * 3. Insert test data
 *
 * Usage:
 *   node scripts/setup-supabase.js
 */

const fs = require('fs');
const path = require('path');

// Color output helpers
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
    log(colors.yellow, '\n📝 Please create .env.local with:');
    console.log(`
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
    `);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      value = value.replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });

  return env;
}

async function testConnection(url, key) {
  log(colors.cyan, '\n🧪 Testing Supabase connection...');

  try {
    // Modern keys (sb_publishable_*) should NOT be used in Authorization header
    // Only use apikey header for modern keys
    const isModernKey = key.startsWith('sb_publishable_') || key.startsWith('sb_secret_');

    const headers = {
      'apikey': key,
    };

    // Legacy JWT keys need Authorization header
    if (!isModernKey) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const response = await fetch(`${url}/rest/v1/`, {
      headers,
    });

    if (response.ok) {
      log(colors.green, '✅ Connection successful!');
      return true;
    } else {
      log(colors.red, '❌ Connection failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    log(colors.red, '❌ Connection error:', error.message);
    return false;
  }
}

async function runMigration(url, serviceKey) {
  log(colors.cyan, '\n📊 Running database migration...');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');

  if (!fs.existsSync(migrationPath)) {
    log(colors.red, '❌ Migration file not found!');
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Note: Supabase REST API doesn't support raw SQL execution
    // This needs to be done via the Supabase dashboard SQL editor
    log(colors.yellow, '⚠️  SQL migrations must be run manually in Supabase SQL Editor');
    log(colors.blue, '\n📝 Copy this file to SQL Editor:');
    log(colors.cyan, migrationPath);

    return null; // null means manual step required
  } catch (error) {
    log(colors.red, '❌ Migration error:', error.message);
    return false;
  }
}

async function checkTables(url, key) {
  log(colors.cyan, '\n🔍 Checking if tables exist...');

  const tables = ['hunts', 'queries', 'profiles'];
  const results = {};
  const isModernKey = key.startsWith('sb_publishable_') || key.startsWith('sb_secret_');

  for (const table of tables) {
    try {
      const headers = {
        'apikey': key,
      };

      // Legacy JWT keys need Authorization header
      if (!isModernKey) {
        headers['Authorization'] = `Bearer ${key}`;
      }

      const response = await fetch(`${url}/rest/v1/${table}?limit=0`, {
        headers,
      });

      results[table] = response.ok;

      if (response.ok) {
        log(colors.green, `  ✅ ${table} table exists`);
      } else {
        log(colors.red, `  ❌ ${table} table not found`);
      }
    } catch (error) {
      results[table] = false;
      log(colors.red, `  ❌ ${table} error:`, error.message);
    }
  }

  return Object.values(results).every(v => v);
}

async function main() {
  log(colors.blue, '\n╔════════════════════════════════════════╗');
  log(colors.blue, '║   Supabase Setup for AI Headhunter   ║');
  log(colors.blue, '╚════════════════════════════════════════╝');

  // Load environment variables
  const env = loadEnv();

  const url = env.NEXT_PUBLIC_SUPABASE_URL;

  // Support both modern and legacy key naming
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  // Validate keys
  if (!url || !publishableKey || !secretKey) {
    log(colors.red, '\n❌ Missing Supabase configuration!');
    log(colors.yellow, '\nRequired in .env.local:');
    log(colors.cyan, '  - NEXT_PUBLIC_SUPABASE_URL');
    log(colors.cyan, '  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY for legacy)');
    log(colors.cyan, '  - SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY for legacy)');
    process.exit(1);
  }

  // Validate URL format
  if (!url.startsWith('https://') || !url.includes('supabase.co')) {
    log(colors.red, '\n❌ Invalid Supabase URL format!');
    log(colors.yellow, 'Expected: https://xxxxx.supabase.co');
    log(colors.yellow, 'Got:', url);
    process.exit(1);
  }

  // Validate keys format (support both modern and legacy)
  const isModernPublishable = publishableKey.startsWith('sb_publishable_');
  const isModernSecret = secretKey.startsWith('sb_secret_');
  const isLegacyPublishable = publishableKey.startsWith('eyJ');
  const isLegacySecret = secretKey.startsWith('eyJ');

  if (!isModernPublishable && !isLegacyPublishable) {
    log(colors.red, '\n❌ Invalid publishable key format!');
    log(colors.yellow, 'Expected format: sb_publishable_... (modern) or eyJ... (legacy JWT)');
    log(colors.yellow, '\nGet your keys from:');
    log(colors.cyan, '  Settings → API in your Supabase dashboard');
    process.exit(1);
  }

  if (!isModernSecret && !isLegacySecret) {
    log(colors.red, '\n❌ Invalid secret key format!');
    log(colors.yellow, 'Expected format: sb_secret_... (modern) or eyJ... (legacy JWT)');
    log(colors.yellow, '\nGet your keys from:');
    log(colors.cyan, '  Settings → API in your Supabase dashboard');
    process.exit(1);
  }

  const keyType = isModernPublishable ? 'Modern' : 'Legacy JWT';
  log(colors.green, '\n✅ Configuration loaded');
  log(colors.cyan, `  URL: ${url}`);
  log(colors.cyan, `  Key Type: ${keyType}`);
  log(colors.cyan, `  Publishable Key: ${publishableKey.substring(0, 20)}...`);
  log(colors.cyan, `  Secret Key: ${secretKey.substring(0, 20)}...`);

  // Test connection using secret key (required for schema access)
  const connected = await testConnection(url, secretKey);
  if (!connected) {
    process.exit(1);
  }

  // Check tables using secret key (publishable key can't access schema directly)
  const tablesExist = await checkTables(url, secretKey);

  if (!tablesExist) {
    log(colors.yellow, '\n⚠️  Tables not found. Please run the migration:');
    log(colors.cyan, '\n  1. Go to your Supabase dashboard');
    log(colors.cyan, '  2. Open SQL Editor');
    log(colors.cyan, '  3. Copy and run: supabase/migrations/001_initial_schema.sql');
    process.exit(1);
  }

  log(colors.green, '\n🎉 Supabase is ready!');
  log(colors.cyan, '\nNext steps:');
  log(colors.cyan, '  1. npm install (if not done)');
  log(colors.cyan, '  2. npm run dev (start Next.js app)');
}

main().catch(error => {
  log(colors.red, '\n💥 Fatal error:', error.message);
  process.exit(1);
});
