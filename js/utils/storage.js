export class StorageManager {
  constructor(prefix = 'webide_') {
    this.prefix = prefix;
  }
  
  save(key, data) {
    try {
      const serialized = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        data
      });
      localStorage.setItem(this.prefix + key, serialized);
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      return false;
    }
  }
  
  load(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      return parsed.data;
    } catch (error) {
      console.error('Load error:', error);
      return null;
    }
  }
  
  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }
}
