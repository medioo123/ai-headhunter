#!/usr/bin/env node

/**
 * Guide to get the correct Supabase connection string
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

log(colors.blue, '\n╔═══════════════════════════════════════════════╗');
log(colors.blue, '║   Get Supabase Connection String           ║');
log(colors.blue, '╚═══════════════════════════════════════════════╝');

log(colors.cyan, '\n📋 Follow these steps to get your DATABASE_URL:\n');

log(colors.yellow, '1. Open your Supabase dashboard:');
log(colors.blue, '   https://supabase.com/dashboard/project/fcttnpwjawnveqieuffi\n');

log(colors.yellow, '2. Click "Connect" button (top-right)\n');

log(colors.yellow, '3. In the modal, select:');
log(colors.cyan, '   → App Frameworks');
log(colors.cyan, '   → Or "Database" → "Connection string"\n');

log(colors.yellow, '4. Copy the connection string that looks like:');
log(colors.magenta, '   postgresql://postgres:[YOUR-PASSWORD]@[HOST]:[PORT]/postgres\n');

log(colors.yellow, '5. Common formats:');
log(colors.cyan, '   Direct:');
log(colors.blue, '   postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres');
log(colors.cyan, '\n   Pooler (Session):');
log(colors.blue, '   postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres');
log(colors.cyan, '\n   Pooler (Transaction):');
log(colors.blue, '   postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres\n');

log(colors.yellow, '6. Replace [YOUR-PASSWORD] with your database password');
log(colors.cyan, '   (The password you set when creating the project)\n');

log(colors.yellow, '7. Add to .env.local:');
log(colors.blue, '   DATABASE_URL=<the connection string from step 4>\n');

log(colors.green, '✅ Once added, run:');
log(colors.cyan, '   node scripts/migrate-db.js\n');
