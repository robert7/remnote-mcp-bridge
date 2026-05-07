#!/usr/bin/env node

const path = require('node:path');
const { version } = require('../package.json');
const { runCli } = require('../scripts/serve-dist');

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log(version);
} else {
  runCli(args, {
    commandName: 'remnote-mcp-bridge',
    defaultRoot: path.resolve(__dirname, '..', 'dist'),
    label: 'remnote-mcp-bridge',
  });
}
