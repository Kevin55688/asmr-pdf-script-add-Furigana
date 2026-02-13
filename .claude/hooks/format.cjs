#!/usr/bin/env node
const { execSync } = require('child_process');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path;

    if (filePath && /\.(ts|tsx|js|jsx|json)$/.test(filePath)) {
      execSync(`npx prettier --write "${filePath}"`, {
        cwd: data.cwd,
        stdio: 'inherit',
      });
    }
  } catch (e) {
    // Silently ignore errors
  }
});
