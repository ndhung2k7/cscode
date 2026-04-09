/**
 * Application Constants
 */

export const CONSTANTS = {
  APP_NAME: 'CodeSnap Pro',
  VERSION: '2.0.0',
  
  PREVIEW_EXTENSIONS: ['.html', '.css', '.js'],
  
  EDITOR_MODES: {
    '.html': 'htmlmixed',
    '.htm': 'htmlmixed',
    '.css': 'css',
    '.js': 'javascript',
    '.json': 'application/json',
    '.md': 'markdown'
  },
  
  DEFAULT_CONTENT: {
    'html': '<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
    'css': '/* New Styles */\n\n',
    'js': '// New Script\n\n',
    'json': '{\n  \n}',
    'md': '# New Document\n\n'
  },
  
  FILE_ICONS: {
    '.html': 'fab fa-html5',
    '.css': 'fab fa-css3-alt',
    '.js': 'fab fa-js',
    '.json': 'fas fa-brackets-curly',
    '.md': 'fas fa-book',
    'default': 'fas fa-file'
  },
  
  MAX_CONSOLE_LINES: 100,
  AUTO_SAVE_INTERVAL: 30000,
  PREVIEW_DEBOUNCE: 300
};

export const DEFAULT_FILES = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeSnap Pro</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>✨ CodeSnap Pro</h1>
    <p>Professional Web IDE with live preview</p>
    <button id="demoBtn">Click Me</button>
    <div id="output"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,

  'style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center;
  max-width: 500px;
  animation: slideUp 0.5s ease;
}

h1 {
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 2.5em;
  margin-bottom: 16px;
}

p {
  color: #666;
  margin: 16px 0;
  font-size: 1.1em;
}

button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 20px 0;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

#output {
  margin-top: 20px;
  padding: 12px;
  border-radius: 8px;
  background: #f7f9fc;
  min-height: 40px;
  color: #333;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,

  'script.js': `// CodeSnap Pro Demo
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('demoBtn');
  const output = document.getElementById('output');
  
  let clickCount = 0;
  
  btn.addEventListener('click', () => {
    clickCount++;
    output.innerHTML = \`
      <strong>Button clicked!</strong><br>
      Count: \${clickCount}<br>
      Time: \${new Date().toLocaleTimeString()}
    \`;
    
    console.log(\`Button clicked \${clickCount} times\`);
  });
  
  console.log('✨ CodeSnap Pro ready!');
});`
};
