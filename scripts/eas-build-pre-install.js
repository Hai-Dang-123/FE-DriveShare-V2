#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Decode and create google-services.json from environment variable
const base64Content = process.env.GOOGLE_SERVICES_JSON_BASE64;

if (base64Content) {
  console.log('Creating google-services.json from environment variable...');
  
  const googleServicesPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');
  const decodedContent = Buffer.from(base64Content, 'base64').toString('utf-8');
  
  // Ensure directory exists
  const dir = path.dirname(googleServicesPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(googleServicesPath, decodedContent);
  console.log('✓ google-services.json created successfully at:', googleServicesPath);
} else {
  console.warn('⚠ Warning: GOOGLE_SERVICES_JSON_BASE64 environment variable not found');
  console.log('Continuing build without google-services.json');
}
