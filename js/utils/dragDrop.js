/**
 * Drag & Drop Manager - Xử lý kéo thả files và folders
 */

export class DragDropManager {
  constructor(app) {
    this.app = app;
    this.dropOverlay = document.getElementById('dropOverlay');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.dropProgress = document.getElementById('dropProgress');
    
    this.isDragging = false;
    this.dragCounter = 0;
    this.uploadQueue = [];
    this.currentUploads = new Map();
    
    this.init();
  }
  
  init() {
    this.setupGlobalDragDrop();
    this.setupFileTreeDragDrop();
  }
  
  setupGlobalDragDrop() {
    const dropZones = [document.body, this.dropOverlay];
    
    dropZones.forEach(zone => {
      // Prevent default drag behaviors
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
    });
    
    // Track drag enter/leave for overlay
    document.body.addEventListener('dragenter', (e) => {
      this.dragCounter++;
      if (!this.isDragging) {
        this.showDropOverlay();
        this.isDragging = true;
      }
    });
    
    document.body.addEventListener('dragleave', (e) => {
      this.dragCounter--;
      if (this.dragCounter === 0) {
        this.hideDropOverlay();
        this.isDragging = false;
      }
    });
    
    // Handle drop
    document.body.addEventListener('drop', async (e) => {
      this.dragCounter = 0;
      this.hideDropOverlay();
      this.isDragging = false;
      
      const items = e.dataTransfer.items;
      if (items) {
        await this.handleDrop(items);
      }
    });
    
    // Also handle drop on overlay
    this.dropOverlay.addEventListener('drop', async (e) => {
      const items = e.dataTransfer.items;
      if (items) {
        await this.handleDrop(items);
      }
    });
  }
  
  setupFileTreeDragDrop() {
    // Allow dropping into specific folders
    document.addEventListener('dragover', (e) => {
      const folder = e.target.closest('.tree-item.folder');
      if (folder) {
        e.preventDefault();
        folder.classList.add('drag-over');
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      const folder = e.target.closest('.tree-item.folder');
      if (folder) {
        folder.classList.remove('drag-over');
      }
    });
    
    document.addEventListener('drop', async (e) => {
      const folder = e.target.closest('.tree-item.folder');
      if (folder) {
        e.preventDefault();
        e.stopPropagation();
        folder.classList.remove
