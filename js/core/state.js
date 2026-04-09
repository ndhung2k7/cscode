/**
 * Application State Management
 * Centralized state with observer pattern
 */

export class AppState {
  constructor() {
    this._state = {
      files: {},
      activeFile: '',
      theme: 'dark',
      layout: { editor: 50, preview: 50 },
      isDirty: false,
      consoleMessages: []
    };
    
    this._observers = new Map();
  }
  
  get files() {
    return this._state.files;
  }
  
  set files(value) {
    this._state.files = value;
    this.notify('files', value);
  }
  
  get activeFile() {
    return this._state.activeFile;
  }
  
  set activeFile(value) {
    this._state.activeFile = value;
    this.notify('activeFile', value);
  }
  
  get theme() {
    return this._state.theme;
  }
  
  set theme(value) {
    this._state.theme = value;
    this.notify('theme', value);
  }
  
  get layout() {
    return this._state.layout;
  }
  
  set layout(value) {
    this._state.layout = value;
    this.notify('layout', value);
  }
  
  get isDirty() {
    return this._state.isDirty;
  }
  
  set isDirty(value) {
    this._state.isDirty = value;
    this.notify('isDirty', value);
  }
  
  subscribe(key, callback) {
    if (!this._observers.has(key)) {
      this._observers.set(key, new Set());
    }
    this._observers.get(key).add(callback);
  }
  
  unsubscribe(key, callback) {
    if (this._observers.has(key)) {
      this._observers.get(key).delete(callback);
    }
  }
  
  notify(key, value) {
    if (this._observers.has(key)) {
      this._observers.get(key).forEach(callback => callback(value));
    }
  }
  
  export() {
    return JSON.parse(JSON.stringify(this._state));
  }
  
  import(state) {
    Object.assign(this._state, state);
  }
}
