/*
 * PawPass UI runtime.
 * Renders the prototype's HTML template (<template id="pp-template">) with the same small
 * template language the prototype used, so the approved design ships unchanged:
 *   {{path}}                         value hole in text or attributes
 *   <sc-if value="{{path}}">         conditional block
 *   <sc-for list="{{path}}" as="x">  repeated block
 *   onClick / onChange / onKeyDown   event handlers ("{{H.fn}}")
 * State lives in a DCLogic subclass (js/app.js); every setState re-renders and patches the DOM
 * in place, so focus, caret position and running CSS animations survive updates.
 */
(function () {
  'use strict';

  var HTML_NS = 'http://www.w3.org/1999/xhtml';
  var BOOL_ATTRS = { disabled: 1, checked: 1, selected: 1, readonly: 1, required: 1, hidden: 1, multiple: 1 };
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var ONLY_HOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(scope, expr) {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    var parts = expr.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function text(v) { return v == null || v === false || v === true ? '' : String(v); }
  function interpolate(str, scope) { return str.replace(HOLE, function (_, e) { return text(lookup(scope, e)); }); }

  /* ---------- template → fresh DOM ---------- */
  function Renderer(templateEl) {
    this.tpl = templateEl.content;
    this.handlers = {};
    this.seq = 0;
  }
  Renderer.prototype.render = function (scope) {
    this.handlers = {}; this.seq = 0;
    var frag = document.createDocumentFragment();
    this.children(this.tpl, scope, frag);
    return frag;
  };
  Renderer.prototype.children = function (src, scope, out) {
    for (var n = src.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) out.appendChild(document.createTextNode(interpolate(n.nodeValue, scope)));
      else if (n.nodeType === 1) this.element(n, scope, out);
    }
  };
  Renderer.prototype.element = function (el, scope, out) {
    var tag = el.localName;
    if (tag === 'sc-if') {
      var m = ONLY_HOLE.exec(el.getAttribute('value') || '');
      if (m && lookup(scope, m[1])) this.children(el, scope, out);
      return;
    }
    if (tag === 'sc-for') {
      var lm = ONLY_HOLE.exec(el.getAttribute('list') || ''), as = el.getAttribute('as') || 'item';
      var list = lm ? lookup(scope, lm[1]) : null;
      if (list && list.length) {
        for (var i = 0; i < list.length; i++) {
          var s = Object.create(scope); s[as] = list[i];
          this.children(el, s, out);
        }
      }
      return;
    }
    var node = el.namespaceURI === HTML_NS ? document.createElement(tag) : document.createElementNS(el.namespaceURI, el.tagName);
    var formValue = null;
    for (var a = 0; a < el.attributes.length; a++) {
      var attr = el.attributes[a], name = attr.name, raw = attr.value;
      if (name.indexOf('hint-') === 0) continue;
      var only = ONLY_HOLE.exec(raw);
      if (/^on[a-z]+$/.test(name)) {
        var fn = only ? lookup(scope, only[1]) : null;
        if (typeof fn === 'function') {
          var id = 'h' + (++this.seq);
          this.handlers[id] = fn;
          node.setAttribute('data-on-' + name.slice(2), id);
        }
        continue;
      }
      if (only && BOOL_ATTRS[name]) { if (lookup(scope, only[1])) node.setAttribute(name, ''); continue; }
      var val = interpolate(raw, scope);
      if (name === 'value' && (tag === 'textarea' || tag === 'select')) { formValue = val; continue; }
      node.setAttribute(name, val);
    }
    if (tag === 'textarea') { node.textContent = formValue || ''; }
    else {
      this.children(el, scope, node);
      if (tag === 'select') {
        var opts = node.querySelectorAll('option');
        for (var o = 0; o < opts.length; o++) { if (opts[o].getAttribute('value') === (formValue || '')) opts[o].setAttribute('selected', ''); }
      }
    }
    out.appendChild(node);
  };

  /* ---------- patch live DOM to match fresh DOM ---------- */
  function sameKind(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType !== 1) return true;
    return a.nodeName === b.nodeName && (a.getAttribute('id') || '') === (b.getAttribute('id') || '') &&
      (a.nodeName !== 'INPUT' || a.type === b.type);
  }
  function syncAttrs(a, b) {
    var i, n;
    for (i = a.attributes.length - 1; i >= 0; i--) { n = a.attributes[i].name; if (!b.hasAttribute(n)) a.removeAttribute(n); }
    for (i = 0; i < b.attributes.length; i++) { n = b.attributes[i]; if (a.getAttribute(n.name) !== n.value) a.setAttribute(n.name, n.value); }
  }
  function patchNode(a, b) {
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    syncAttrs(a, b);
    var tag = a.nodeName;
    if (tag === 'TEXTAREA') { var tv = b.textContent; if (a.value !== tv) a.value = tv; return; }
    if (tag === 'INPUT') {
      if (a.type !== 'file') { var iv = b.getAttribute('value') || ''; if (a.value !== iv) a.value = iv; }
      a.checked = b.hasAttribute('checked');
      return;
    }
    patchChildren(a, b);
    if (tag === 'SELECT') {
      var sel = b.querySelector('option[selected]');
      var want = sel ? sel.getAttribute('value') : '';
      if (a.value !== want) a.value = want;
    }
  }
  function patchChildren(parent, next) {
    var cur = parent.firstChild;
    var incoming = Array.prototype.slice.call(next.childNodes);
    for (var i = 0; i < incoming.length; i++) {
      var nb = incoming[i];
      var id = nb.nodeType === 1 ? nb.getAttribute('id') : null;
      if (cur && sameKind(cur, nb)) { patchNode(cur, nb); cur = cur.nextSibling; continue; }
      if (id) { // keyed by id: reuse the same live element even if siblings appeared/disappeared
        var found = null;
        for (var s = cur; s; s = s.nextSibling) { if (s.nodeType === 1 && s.getAttribute('id') === id && s.nodeName === nb.nodeName) { found = s; break; } }
        if (found) { parent.insertBefore(found, cur); patchNode(found, nb); continue; }
      }
      parent.insertBefore(nb, cur);
    }
    while (cur) { var nx = cur.nextSibling; parent.removeChild(cur); cur = nx; }
  }

  /* ---------- component base (same surface the prototype used) ---------- */
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (update) {
    var patch = typeof update === 'function' ? update(this.state) : update;
    if (patch) this.state = Object.assign({}, this.state, patch);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__schedule) this.__schedule(); };

  /* ---------- mount ---------- */
  function mount(ComponentClass, rootEl, templateEl, props) {
    var app = new ComponentClass(props || {});
    var renderer = new Renderer(templateEl);
    var queued = false;

    function flush() {
      queued = false;
      var frag = renderer.render(app.renderVals());
      var shell = document.createElement('div');
      shell.appendChild(frag);
      patchChildren(rootEl, shell);
      if (app.componentDidUpdate) app.componentDidUpdate();
    }
    app.__schedule = function () { if (!queued) { queued = true; Promise.resolve().then(flush); } };

    function dispatch(type, e) {
      var t = e.target;
      while (t && t !== rootEl) {
        if (t.nodeType === 1) {
          var id = t.getAttribute('data-on-' + type);
          if (id && renderer.handlers[id]) { renderer.handlers[id].call(app, e); return; }
        }
        t = t.parentNode;
      }
    }
    var TEXT_INPUT = /^(text|email|password|search|tel|url|number|date|time|datetime-local|month|week)$/;
    function isTyping(el) { return el.nodeName === 'TEXTAREA' || (el.nodeName === 'INPUT' && TEXT_INPUT.test(el.type)); }

    rootEl.addEventListener('click', function (e) { dispatch('click', e); });
    rootEl.addEventListener('keydown', function (e) { dispatch('keydown', e); });
    // React-style onChange: fires on every keystroke for text fields, on change for selects/files.
    rootEl.addEventListener('input', function (e) { if (isTyping(e.target)) dispatch('change', e); });
    rootEl.addEventListener('change', function (e) { if (!isTyping(e.target)) dispatch('change', e); });

    flush();
    if (app.componentDidMount) app.componentDidMount();
    return app;
  }

  window.PawPassRuntime = { DCLogic: DCLogic, mount: mount };
})();
