#!/usr/bin/env node

/**
 * Rotate demo account password via Supabase Admin API.
 * Usage: node scripts/rotate-demo-password.js
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = 'https://oyklaglogmaniet.beget.app';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzM3OTIwMDAsImV4cCI6MTkzMTU1ODQwMH0.XJ4jz6bkCMcgrFlPil9TCjnjzkqtFMn3ti33cljRv-0';
const DEMO_EMAIL = 'demo@archflow.ru';

// ── Generate password ───────────────────────────────────
function generatePassword(length = 16) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  // Guarantee at least one of each category
  let pwd = '';
  pwd += upper[crypto.randomInt(upper.length)];
  pwd += lower[crypto.randomInt(lower.length)];
  pwd += digits[crypto.randomInt(digits.length)];
  pwd += special[crypto.randomInt(special.length)];

  for (let i = pwd.length; i < length; i++) {
    pwd += all[crypto.randomInt(all.length)];
  }

  // Shuffle (Fisher-Yates)
  const arr = pwd.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

// ── Main ────────────────────────────────────────────────
async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Find user by email
  const { data: listData, error: listErr } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }

  const user = listData.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) {
    console.error(`User ${DEMO_EMAIL} not found`);
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (id: ${user.id})`);

  // 2. Generate new password
  const newPassword = generatePassword(16);

  // 3. Update password
  const { error: updateErr } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword },
  );

  if (updateErr) {
    console.error('Failed to update password:', updateErr.message);
    process.exit(1);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`  Email:        ${DEMO_EMAIL}`);
  console.log(`  New password: ${newPassword}`);
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('Password rotated successfully.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
