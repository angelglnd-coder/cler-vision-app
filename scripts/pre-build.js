#!/usr/bin/env node
/**
 * Pre-build validation script
 * Ensures production builds have proper version and metadata before building
 */

const fs = require('fs');
const path = require('path');

function validateBuild() {
  console.log('Running pre-build validation...\n');

  // Read package.json
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  let hasErrors = false;

  // Check version
  if (pkg.version === '0.0.0') {
    console.error('❌ ERROR: Version is still 0.0.0');
    console.error('   Update version in package.json before building\n');
    hasErrors = true;
  } else {
    console.log(`✓ Version: ${pkg.version}`);
  }

  // Check author
  if (pkg.author.toLowerCase().includes('example')) {
    console.error('❌ ERROR: Author still contains placeholder text');
    console.error('   Update author in package.json before building\n');
    hasErrors = true;
  } else {
    console.log(`✓ Author: ${pkg.author}`);
  }

  // Check description
  if (pkg.description.toLowerCase().includes('electron application with svelte')) {
    console.warn('⚠ WARNING: Description still contains boilerplate text');
    console.warn('   Consider updating description in package.json\n');
  } else {
    console.log(`✓ Description: ${pkg.description}`);
  }

  // Check environment mode
  const mode = process.env.NODE_ENV || 'development';
  console.log(`✓ Build mode: ${mode}`);

  // Verify .env file exists for production/staging
  if (mode === 'production' || mode === 'staging') {
    const envFile = path.join(__dirname, '..', `.env.${mode}`);
    if (!fs.existsSync(envFile)) {
      console.warn(`⚠ WARNING: ${path.basename(envFile)} not found`);
      console.warn(`   Create .env.${mode} with required environment variables\n`);
    } else {
      console.log(`✓ Environment file: .env.${mode} exists`);
    }
  }

  console.log();

  if (hasErrors) {
    console.error('Pre-build validation FAILED ❌\n');
    console.error('Fix the errors above before building for production.\n');
    process.exit(1);
  }

  console.log('Pre-build validation PASSED ✓\n');
}

validateBuild();
