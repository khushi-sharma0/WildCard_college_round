const fs = require('fs');
const path = require('path');

const srcRoot = 'C:\\Users\\Admin\\Downloads\\NexBlyth\\Nexus';
const destRoot = 'c:\\Users\\Admin\\Desktop\\Khushi\\Nexus';

const filesToCopy = [
  // 1. Visual Website Builder
  'components/sites/sites-view.tsx',
  'components/sites/page-renderer.tsx',
  'app/(dashboard)/sites/page.tsx',
  'app/api/sites/themes/route.ts',
  'lib/site-themes.ts',
  'lib/site-validation.ts',
  'app/s/[slug]/page.tsx',
  'app/s/[slug]/registration-form.tsx',

  // 2. Intelligent CRM
  'components/crm/crm-view.tsx',
  'app/(dashboard)/crm/page.tsx',
  'app/api/contacts/route.ts',
  'app/api/contacts/[id]/route.ts',
  'app/api/records/[kind]/[id]/route.ts',

  // 3. Login Page & Auth Infrastructure
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
  'lib/supabase/server.ts',
  'components/toast-viewport.tsx',
  'lib/toast.ts'
];

for (const relPath of filesToCopy) {
  const src = path.join(srcRoot, relPath);
  const dest = path.join(destRoot, relPath);
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${relPath}`);
}

console.log('All standalone feature files copied successfully.');
