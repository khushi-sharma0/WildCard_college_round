const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Admin\\Downloads\\NexBlyth\\Nexus';
const destDir = 'c:\\Users\\Admin\\Desktop\\Khushi\\Nexus';

function checkFile(relPath) {
  const pSrc = path.join(srcDir, relPath);
  const pDest = path.join(destDir, relPath);
  console.log(`Checking: ${relPath}`);
  console.log(`  Src: ${fs.existsSync(pSrc) ? fs.statSync(pSrc).size + ' bytes' : 'DOES NOT EXIST'}`);
  console.log(`  Dest: ${fs.existsSync(pDest) ? fs.statSync(pDest).size + ' bytes' : 'DOES NOT EXIST'}`);
}

const websiteBuilderFiles = [
  'components/sites/sites-view.tsx',
  'components/sites/page-renderer.tsx',
  'app/(dashboard)/sites/page.tsx',
  'app/api/sites/route.ts',
  'app/api/sites/themes/route.ts',
  'lib/site-themes.ts',
  'lib/site-validation.ts',
  'app/s/[slug]/page.tsx',
  'app/s/[slug]/registration-form.tsx'
];

const crmFiles = [
  'components/crm/crm-view.tsx',
  'app/(dashboard)/crm/page.tsx',
  'app/api/contacts/route.ts',
  'app/api/contacts/[id]/route.ts',
  'app/api/records/[kind]/[id]/route.ts'
];

const loginFiles = [
  'app/login/page.tsx',
  'components/auth/login-form.tsx',
  'components/auth/setup-incomplete.tsx',
  'app/setup-incomplete/page.tsx',
  'app/api/auth/login/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/auth/mode/route.ts',
  'app/auth/callback/route.ts',
  'lib/auth/local-session.ts',
  'lib/auth/local-store.ts',
  'lib/auth-client.ts',
  'lib/auth-config.ts',
  'lib/auth-middleware.ts',
  'lib/supabase/admin.ts',
  'lib/supabase/browser.ts',
  'lib/supabase/middleware.ts',
  'lib/supabase/server.ts'
];

console.log('\n--- 1. WEBSITE BUILDER FILES ---');
websiteBuilderFiles.forEach(checkFile);

console.log('\n--- 2. CRM FILES ---');
crmFiles.forEach(checkFile);

console.log('\n--- 3. LOGIN & AUTH FILES ---');
loginFiles.forEach(checkFile);
