#!/usr/bin/env node
/**
 * CroweLM CLI Post-install Script
 * Makes the CLI executable after npm install
 */

const fs = require('fs');
const path = require('path');

const binPath = path.join(__dirname, '..', 'bin', 'crowelm');

try {
  // Make the CLI executable
  fs.chmodSync(binPath, '755');
  console.log('CroweLM CLI installed successfully!');
  console.log('Run "crowelm help" to get started.');
} catch (error) {
  console.warn('Warning: Could not set executable permissions:', error.message);
}
