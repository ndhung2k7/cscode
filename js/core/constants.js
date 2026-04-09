/**
 * Application Constants
 */

export const CONSTANTS = {
  APP_NAME: 'Web IDE Pro',
  VERSION: '3.0.0',
  
  // File type configurations
  FILE_TYPES: {
    html: { icon: 'fab fa-html5', color: '#e44d26', mode: 'htmlmixed' },
    css: { icon: 'fab fa-css3-alt', color: '#264de4', mode: 'css' },
    js: { icon: 'fab fa-js', color: '#f7df1e', mode: 'javascript' },
    json: { icon: 'fas fa-brackets-curly', color: '#f0db4f', mode: 'application/json' },
    md: { icon: 'fab fa-markdown', color: '#083fa1', mode: 'markdown' },
    txt: { icon: 'fas fa-file-alt', color: '#6f6f9c', mode: 'text/plain' },
    default: { icon: 'fas fa-file', color: '#6f6f9c', mode: 'text/plain' }
  },
  
  // Preview settings
  PREVIEW_DEBOUNCE: 300,
  AUTO_SAVE_INTERVAL: 30000,
  MAX_CONSOLE_LINES: 500,
  
  // Default content for new files
  DEFAULT_CONTENT: {
    html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World</h1>\n  <script src="script.js"></script>\n</body>\n</html>',
    css: '/* Styles */\n\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n}\n',
    js: '// JavaScript\n\nconsole.log("Hello from Web IDE!");\n',
    json: '{\n  "name": "project",\n  "version": "1.0.0"\n}',
    md: '# Project\n\n## Description\n\nWrite your documentation here.\n',
    txt: ''
  },
  
  // Storage keys
  STORAGE_KEYS: {
    FILE_SYSTEM: 'webide_filesystem',
    SETTINGS: 'webide_settings',
    STATE: 'webide_state'
  }
};

export const DEFAULT_FILESYSTEM = {
  'index.html': {
    type: 'file',
    content: CONSTANTS.DEFAULT_CONTENT.html
  },
  'style.css': {
    type: 'file',
    content: CONSTANTS.DEFAULT_CONTENT.css
  },
  'script.js': {
    type: 'file',
    content: CONSTANTS.DEFAULT_CONTENT.js
  },
  'README.md': {
    type: 'file',
    content: CONSTANTS.DEFAULT_CONTENT.md
  }
};
