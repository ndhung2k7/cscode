/**
 * Storage Manager - localStorage wrapper with compression
 */

export class StorageManager {
  constructor(prefix = 'codesnap_') {
    this.prefix = prefix;
  }
  
  save(key, data) {
    try {
      const serialized = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        data: data
      });
      
      localStorage.setItem(this.prefix + key, serialized);
      return true;
    } catch (error) {
      console.error('Storage save error:', error);
      
      // Try to clear old data
      if (error.name === 'QuotaExceededError') {
        this.cleanup();
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify({ data }));
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    }
  }
  
  load(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      // Handle versioned data
      if (parsed.version) {
        return parsed.data;
      }
      
      return parsed;
    } catch (error) {
      console.error('Storage load error:', error);
      return null;
    }
  }
  
  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }
  
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
  
  cleanup() {
    // Remove oldest items
    const items = [];
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          items.push({
            key,
            timestamp: data.timestamp || 0
          });
        } catch (e) {}
      }
    });
    
    // Sort by timestamp and remove oldest 50%
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = items.slice(0, Math.floor(items.length / 2));
    
    toRemove.forEach(item => {
      localStorage.removeItem(item.key);
    });
  }
  
  getSize() {
    let total = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        total += localStorage.getItem(key).length;
      }
    });
    
    return total;
  }
}
