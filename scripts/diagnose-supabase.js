#!/usr/bin/env node

/**
 * Diagnose Supabase Connection Issues
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

async function testWithDetails(url, key, keyName) {
  log(colors.cyan, `\n🧪 Testing with ${keyName}...`);
  log(colors.blue, `  Key: ${key.substring(0, 20)}...`);

  const isModernKey = key.startsWith('sb_publishable_') || key.startsWith('sb_secret_');
  const isLegacyKey = key.startsWith('eyJ');

  log(colors.blue, `  Type: ${isModernKey ? 'Modern' : isLegacyKey ? 'Legacy JWT' : 'Unknown'}`);

  // Test 1: Just apikey header
  log(colors.cyan, '\n  Test 1: apikey header only');
  try {
    const response1 = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
      },
    });

    log(colors.yellow, `    Status: ${response1.status} ${response1.statusText}`);

    if (response1.status === 401) {
      const body = await response1.text();
      log(colors.yellow, `    Response: ${body.substring(0, 200)}`);
    }
  } catch (error) {
    log(colors.red, `    Error: ${error.message}`);
  }

  // Test 2: Both apikey and Authorization headers (backward compatibility)
  log(colors.cyan, '\n  Test 2: apikey + Authorization headers (same value)');
  try {
    const response2 = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    log(colors.yellow, `    Status: ${response2.status} ${response2.statusText}`);

    if (response2.ok) {
      log(colors.green, '    ✅ Success!');
      return true;
    } else if (response2.status === 401) {
      const body = await response2.text();
      log(colors.yellow, `    Response: ${body.substring(0, 200)}`);
    }
  } catch (error) {
    log(colors.red, `    Error: ${error.message}`);
  }

  return false;
}

async function main() {
  log(colors.blue, '\n╔═══════════════════════════════════════════╗');
  log(colors.blue, '║   Supabase Connection Diagnostics       ║');
  log(colors.blue, '╚═══════════════════════════════════════════╝');

  const env = loadEnv();

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  log(colors.green, '\n✅ Environment loaded');
  log(colors.cyan, `  URL: ${url}`);

  if (!url) {
    log(colors.red, '\n❌ NEXT_PUBLIC_SUPABASE_URL is missing!');
    process.exit(1);
  }

  if (!publishableKey) {
    log(colors.red, '\n❌ No publishable/anon key found!');
    process.exit(1);
  }

  if (!secretKey) {
    log(colors.red, '\n❌ No secret/service role key found!');
    process.exit(1);
  }

  // Test publishable key
  const pubSuccess = await testWithDetails(url, publishableKey, 'Publishable Key');

  // Test secret key
  const secretSuccess = await testWithDetails(url, secretKey, 'Secret Key');

  log(colors.blue, '\n════════════════════════════════════════════');
  log(colors.yellow, '\n📋 Summary:');
  log(colors.cyan, `  Publishable Key: ${pubSuccess ? '✅ Working' : '❌ Failed'}`);
  log(colors.cyan, `  Secret Key: ${secretSuccess ? '✅ Working' : '❌ Failed'}`);

  if (!pubSuccess && !secretSuccess) {
    log(colors.yellow, '\n💡 Troubleshooting:');
    log(colors.cyan, '  1. Go to your Supabase dashboard');
    log(colors.cyan, '  2. Navigate to Settings → API');
    log(colors.cyan, '  3. Check if you need to opt-in to new API keys');
    log(colors.cyan, '  4. Verify the Project URL is correct');
    log(colors.cyan, '  5. Try using the legacy "anon" and "service_role" keys if available');
  }
}

main().catch(error => {
  log(colors.red, '\n💥 Fatal error:', error.message);
  process.exit(1);
});
