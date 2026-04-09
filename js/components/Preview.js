/**
 * Preview Manager với Run button
 */

export class PreviewManager {
  constructor(state) {
    this.state = state;
    this.iframe = document.getElementById('previewFrame');
    this.placeholder = document.getElementById('previewPlaceholder');
    this.updateTimer = null;
    this.autoRun = false;
    this.hasRun = false;
    
    // Bind methods
    this.run = this.run.bind(this);
    this.toggleAutoRun = this.toggleAutoRun.bind(this);
    
    // Subscribe to state changes
    this.state.subscribe('editorChanged', () => {
      if (this.autoRun) {
        this.run();
      } else {
        this.updateStatus('Changes detected - Click Run to preview', 'warning');
      }
    });
    
    this.state.subscribe('fileOpened', () => {
      if (this.autoRun) {
        this.run();
      }
    });
    
    this.state.subscribe('fileClosed', () => {
      if (this.autoRun) {
        this.run();
      }
    });
  }
  
  buildHTML() {
    const htmlFile = this.findFile('.html') || this.findFile('.htm');
    const cssFiles = this.findFiles('.css');
    const jsFiles = this.findFiles('.js');
    
    let html = htmlFile?.content || '<html><body><h1>No HTML file found</h1></body></html>';
    
    // Inject CSS
    const styles = cssFiles.map(f => f.content).join('\n');
    if (styles) {
      const styleTag = `<style>/* Injected CSS */\n${styles}\n</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', styleTag + '</head>');
      } else if (html.includes('<body>')) {
        html = html.replace('<body>', `<head>${styleTag}</head><body>`);
      } else {
        html = `<head>${styleTag}</head>${html}`;
      }
    }
    
    // Inject JS với error handling
    const scripts = jsFiles.map(f => f.content).join('\n');
    if (scripts) {
      const scriptTag = `
<script>
(function() {
  // Console capture
  const originalConsole = window.console;
  const methods = ['log', 'info', 'warn', 'error', 'debug'];
  
  methods.forEach(method => {
    const original = originalConsole[method];
    console[method] = function(...args) {
      original.apply(console, args);
      window.parent.postMessage({
        type: 'console',
        method: method,
        args: args.map(arg => {
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch {
            return String(arg);
          }
        })
      }, '*');
    };
  });
  
  // Error handling
  window.addEventListener('error', (e) => {
    window.parent.postMessage({
      type: 'error',
      error: {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack
      }
    }, '*');
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    window.parent.postMessage({
      type: 'error',
      error: {
        message: 'Unhandled Promise Rejection: ' + e.reason,
        stack: e.reason?.stack
      }
    }, '*');
  });
  
  // User script
  try {
    ${scripts}
  } catch (error) {
    console.error('JavaScript Error:', error);
    window.parent.postMessage({
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack
      }
    }, '*');
  }
})();
<\/script>`;
      
      if (html.includes('</body>')) {
        html = html.replace('</body>', scriptTag + '</body>');
      } else {
        html += scriptTag;
      }
    }
    
    return html;
  }
  
  findFile(ext) {
    for (const [path, item] of this.state.fileSystem) {
      if (item.type === 'file' && path.endsWith(ext)) {
        return { path, content: item.content };
      }
    }
    return null;
  }
  
  findFiles(ext) {
    const files = [];
    for (const [path, item] of this.state.fileSystem) {
      if (item.type === 'file' && path.endsWith(ext)) {
        files.push({ path, content: item.content });
      }
    }
    return files;
  }
  
  run() {
    clearTimeout(this.updateTimer);
    
    this.updateStatus('Running...', 'running');
    
    this.updateTimer = setTimeout(() => {
      try {
        const html = this.buildHTML();
        const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        
        // Ẩn placeholder, hiện iframe
        this.placeholder.classList.add('hidden');
        this.hasRun = true;
        
        this.updateStatus('Preview ready', 'success');
        
        // Clear console khi run mới
        if (window.app && window.app.console) {
          window.app.console.clear();
        }
        
      } catch (error) {
        console.error('Preview error:', error);
        this.updateStatus('Preview error', 'error');
      }
    }, 100);
  }
  
  refresh() {
    this.run();
  }
  
  openInNewTab() {
    const html = this.buildHTML();
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  }
  
  toggleAutoRun() {
    this.autoRun = !this.autoRun;
    
    const btn = document.getElementById('autoRunToggle');
    const status = document.getElementById('autoRunStatus');
    
    if (this.autoRun) {
      btn.classList.add('active');
      status.innerHTML = '<i class="fas fa-magic"></i><span>Auto-run ON</span>';
      this.run(); // Chạy ngay khi bật
    } else {
      btn.classList.remove('active');
      status.innerHTML = '<i class="fas fa-magic"></i><span>Auto-run OFF</span>';
    }
  }
  
  updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('previewStatus');
    if (!statusElement) return;
    
    const icons = {
      running: '<i class="fas fa-spinner fa-spin"></i>',
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-times-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-circle"></i>'
    };
    
    statusElement.className = `status-item ${type}`;
    statusElement.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  }
  
  isAutoRun() {
    return this.autoRun;
  }
}
