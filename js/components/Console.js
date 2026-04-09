export class ConsoleManager {
  constructor(state) {
    this.state = state;
    this.container = document.getElementById('consoleOutput');
    this.messages = [];
  }
  
  log(method, args) {
    const message = {
      method,
      content: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' '),
      timestamp: new Date()
    };
    
    this.messages.push(message);
    this.renderMessage(message);
    
    // Limit messages
    if (this.messages.length > 500) {
      this.messages.shift();
      this.container.removeChild(this.container.firstChild);
    }
  }
  
  renderMessage(message) {
    const div = document.createElement('div');
    div.className = `console-line ${message.method}`;
    
    const time = message.timestamp.toLocaleTimeString();
    
    div.innerHTML = `
      <span class="console-time">${time}</span>
      <span class="console-message">${this.escape(message.content)}</span>
    `;
    
    this.container.appendChild(div);
    this.container.scrollTop = this.container.scrollHeight;
  }
  
  escape(text) {
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
}
