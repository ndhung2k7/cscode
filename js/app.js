// Thêm vào phần setupEventListeners() trong app.js:

setupEventListeners() {
  // ... existing event listeners ...
  
  // Run button
  document.getElementById('runButton').addEventListener('click', () => {
    this.preview.run();
    this.ui.showToast('Preview updated', 'success');
  });
  
  document.getElementById('runPreviewBtn').addEventListener('click', () => {
    this.preview.run();
    this.ui.showToast('Preview updated', 'success');
  });
  
  // Auto-run toggle
  document.getElementById('autoRunToggle').addEventListener('click', () => {
    this.preview.toggleAutoRun();
    const status = this.preview.isAutoRun() ? 'enabled' : 'disabled';
    this.ui.showToast(`Auto-run ${status}`, 'info');
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter: Run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.preview.run();
      this.ui.showToast('Running preview...', 'success');
    }
    
    // ... other shortcuts ...
  });
  
  // ... rest of event listeners ...
}

// Thêm method để cập nhật file count
updateFileCount() {
  let count = 0;
  for (const [_, item] of this.state.fileSystem) {
    if (item.type === 'file') count++;
  }
  const element = document.getElementById('fileCount');
  if (element) {
    element.textContent = `${count} file${count !== 1 ? 's' : ''}`;
  }
}
