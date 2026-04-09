/**
 * Editor Manager - CodeMirror Wrapper
 */

import { CONSTANTS } from '../core/constants.js';

export class EditorManager {
  constructor(options) {
    this.element = options.element;
    this.onChange = options.onChange || (() => {});
    this.onCursorChange = options.onCursorChange || (() => {});
    
    this.instance = null;
    this.currentFile = '';
    
    this.init();
  }
  
  init() {
    this.instance = CodeMirror.fromTextArea(this.element, {
      mode: 'htmlmixed',
      theme: 'dracula',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentUnit: 2,
      autoCloseTags: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
      extraKeys: {
        'Tab': (cm) => {
          if (cm.somethingSelected()) {
            cm.indentSelection('add');
          } else {
            cm.replaceSelection('  ', 'end');
          }
        },
        'Shift-Tab': (cm) => cm.indentSelection('subtract')
      }
    });
    
    this.instance.setSize('100%', '100%');
    
    // Event listeners
    this.instance.on('change', () => {
      const content = this.instance.getValue();
      this.onChange(content);
    });
    
    this.instance.on('cursorActivity', () => {
      const cursor = this.instance.getCursor();
      this.onCursorChange(cursor);
    });
  }
  
  setContent(content, filename = '') {
    if (this.currentFile !== filename) {
      this.currentFile = filename;
      this.updateMode(filename);
    }
    
    this.instance.setValue(content);
    this.instance.clearHistory();
  }
  
  getContent() {
    return this.instance.getValue();
  }
  
  updateMode(filename) {
    const ext = '.' + filename.split('.').pop();
    const mode = CONSTANTS.EDITOR_MODES[ext] || 'text/plain';
    this.instance.setOption('mode', mode);
  }
  
  setTheme(theme) {
    this.instance.setOption('theme', theme);
  }
  
  format() {
    const mode = this.instance.getMode().name;
    
    if (mode === 'javascript' || mode === 'css' || mode === 'htmlmixed') {
      const formatted = js_beautify(this.instance.getValue(), {
        indent_size: 2,
        space_in_empty_paren: true
      });
      this.instance.setValue(formatted);
    }
  }
  
  undo() {
    this.instance.undo();
  }
  
  redo() {
    this.instance.redo();
  }
  
  search(query) {
    const cursor = this.instance.getSearchCursor(query);
    if (cursor.findNext()) {
      this.instance.setSelection(cursor.from(), cursor.to());
    }
  }
  
  replace(search, replace) {
    const cursor = this.instance.getSearchCursor(search);
    while (cursor.findNext()) {
      cursor.replace(replace);
    }
  }
}
