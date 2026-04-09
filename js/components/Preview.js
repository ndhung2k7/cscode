export class PreviewManager {
  constructor(state) {
    this.state = state;
    this.iframe = document.getElementById('previewFrame');
    this.updateTimer = null;
    
    this.state.subscribe('editorChanged', () => {
      if (this.state._state.autoPreview) {
        this.update();
      }
    });
    
    this.state.subscribe('fileOpened', () => this.update());
    this.state.subscribe('fileClosed', () => this.update());
  }
  
  buildHTML() {
    const htmlFile = this.findFile('.html') || this.findFile('.htm');
    const cssFiles = this.findFiles('.css');
    const jsFiles = this.findFiles('.js');
    
    let html = htmlFile?.content || '<html><body></body></html>';
    
    // Inject CSS
    const styles = cssFiles.map(f => f.content).join('\n');
    if (styles) {
      const styleTag = `<style>${styles}</style>`;
      html = html.replace('</head>', styleTag + '</head>');
    }
    
    // Inject JS
    const scripts = jsFiles.map(f => f.content).join('\n');
    if (scripts) {
      const scriptTag = `<script>${scripts}</script>`;
      html = html.replace('</body>', scriptTag + '</body>');
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
  
  update() {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      const html = this.buildHTML();
      const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    }, 300);
  }
  
  refresh() {
    this.update();
  }
  
  openInNewTab() {
    const win = window.open('', '_blank');
    win.document.write(this.buildHTML());
    win.document.close();
  }
}
