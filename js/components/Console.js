/**
 * Console Manager - DevTools-like console panel
 */

import { CONSTANTS } from '../core/constants.js';

export class ConsoleManager {
  constructor(options) {
    this.container = options.container;
    this.maxLines = options.maxLines || CONSTANTS.MAX_CONSOLE_LINES;
    this.messages = [];
  }
  
  log(args, method = 'log') {
    const message = this.formatMessage(args, method);
    this.messages.push({ method, message, timestamp: Date.now() });
    
    // Limit messages
    if (this.messages.length > this.maxLines) {
      this.messages.shift();
    }
    
    this.renderMessage(message, method);
  }
  
  formatMessage(args, method) {
    if (Array.isArray(args)) {
      return args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
    }
    
    return String(args);
  }
  
  renderMessage(message, method) {
    const line = document.createElement('div');
    line.className = `console-line ${method}`;
    
    const icon = this.getIcon(method);
    const time = new Date().toLocaleTimeString();
    
    line.innerHTML = `
      <span class="console-time">${time}</span>
      <i class="${icon}"></i>
      <span class="console-message">${this.escapeHtml(message)}</span>
    `;
    
    this.container.appendChild(line);
    this.container.scrollTop = this.container.scrollHeight;
  }
  
  getIcon(method) {
    const icons = {
      log: 'fas fa-circle',
      info: 'fas fa-info-circle',
      warn: 'fas fa-exclamation-triangle',
      error: 'fas fa-times-circle',
      debug: 'fas fa-bug'
    };
    return icons[method] || 'fas fa-terminal';
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  clear() {
    this.messages = [];
    this.container.innerHTML = '';
  }
  
  filter(method) {
    const lines = this.container.children;
    for (const line of lines) {
      if (method === 'all' || line.classList.contains(method)) {
        line.style.display = 'flex';
      } else {
        line.style.display = 'none';
      }
    }
  }
  
  export() {
    return this.messages.map(m => `[${new Date(m.timestamp).toISOString()}] [${m.method}] ${m.message}`).join('\n');
  }
}
