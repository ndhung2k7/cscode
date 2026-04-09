/**
 * Preview Manager - Handles iframe preview with console capture
 */

export class PreviewManager {
  constructor(options) {
    this.iframe = options.iframe;
    this.onError = options.onError || (() => {});
    this.updateTimeout = null;
    
    this.setupIframe();
  }
  
  setupIframe() {
    // Inject console capture script
    this.iframe.addEventListener('load', () => {
      this.injectConsoleCapture();
    });
  }
  
  injectConsoleCapture() {
    const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
    
    const script = doc.createElement('script');
    script.textContent = `
      (function() {
        const methods = ['log', 'info', 'warn', 'error', 'debug'];
        
        methods.forEach(method => {
          const original = console[method];
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
        
        window.addEventListener('error', (e) => {
          window.parent.postMessage({
            type: 'error',
            error: {
              message: e.message,
              filename: e.filename,
              lineno: e.lineno,
              colno: e.colno
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
      })();
    `;
    
    doc.head.appendChild(script);
  }
  
  buildPreviewHTML(html, css, js) {
    // Parse HTML and inject CSS/JS
    let finalHTML = html;
    
    // Inject CSS
    const styleTag = `<style>/* Injected CSS */\n${css}\n</style>`;
    if (finalHTML.includes('</head>')) {
      finalHTML = finalHTML.replace('</head>', `${styleTag}\n</head>`);
    } else if (finalHTML.includes('<body>')) {
      finalHTML = finalHTML.replace('<body>', `<head>${styleTag}</head>\n<body>`);
    } else {
      finalHTML = `<head>${styleTag}</head>\n${finalHTML}`;
    }
    
    // Inject JS with error handling wrapper
    const scriptTag = `
<script>
  (function() {
    try {
      ${js}
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
    
    if (finalHTML.includes('</body>')) {
      finalHTML = finalHTML.replace('</body>', `${scriptTag}\n</body>`);
    } else {
      finalHTML += `\n${scriptTag}`;
    }
    
    return finalHTML;
  }
  
  update(html) {
    clearTimeout(this.updateTimeout);
    
    this.updateTimeout = setTimeout(() => {
      const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    }, 300);
  }
  
  refresh() {
    this.iframe.contentWindow.location.reload();
  }
  
  getPreviewWindow() {
    return this.iframe.contentWindow;
  }
}
