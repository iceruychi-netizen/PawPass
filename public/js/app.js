/*
 * PawPass frontend — application state and behaviour.
 * Ported from the approved Step 1 prototype: same screens, flows and copy. The prototype's
 * in-browser mock backend is replaced by the real REST API (/api), with a JWT kept in localStorage.
 */
(function () {
  'use strict';

  var VAL = window.PawPassValidators;
  var PP_V = VAL.V;
  var PP_MB = VAL.MB;
  var PP_SPECIES = VAL.SPECIES;
  var PP_SP = { 'Chó': '#FDE3BC', 'Mèo': '#D9E8F5', 'Chim': '#DDF0D6', 'Thỏ': '#FCE3E8', 'Hamster': '#F6E4C6', 'Khác': '#EDE6DC' };
  var PP_KEYS = ['name', 'email', 'password', 'confirm', 'current_password', 'new_password', 'species', 'breed', 'gender', 'date_of_birth', 'weight', 'color', 'description', 'notes', 'examination_date', 'reason', 'diagnosis', 'treatment', 'medication', 'vaccine_name', 'vaccination_date', 'dose'];
  var PP_ERRKEYS = PP_KEYS.concat(['photo', 'avatar', 'file']);
  var PP_LINES = {
    c1: ['Meo~', 'Rừ rừ…', 'Xoa đầu nữa đi!', 'Có cá không?'],
    c2: ['Meo.', 'Hừm, ai gọi đó?', 'Đang tuần tra…', 'Meo meo!'],
    d1: ['Gâu!', 'Gâu gâu!', 'Đi dạo không?', 'Vẫy đuôi nè!']
  };
  var ILLUS_DOG = '/assets/135b8c70f4e0c9457eab939c2e37a6c3.png';
  var ILLUS_CATS = ['/assets/6f21ee961c0b8ff919470721e02b6978.png', '/assets/5383fa76424f1e45f5e44ebe5d2a4b5a.png', '/assets/53e6244e58e71b47e1522d69400b0e07.png'];
  var TOKEN_KEY = 'pawpass.token';
  var TAB_SLUG = { health: 'health', vacc: 'vaccinations', docs: 'documents' };
  var SLUG_TAB = { health: 'health', vaccinations: 'vacc', documents: 'docs' };

  function ppIso(d) { return VAL.isoLocal(d); }
  function ppToday() { return ppIso(new Date()); }
  function ppFmt(s) { if (!s) return '—'; var p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function ppDD(s) { return String(s).slice(8, 10); }
  function ppMMYY(s) { return 'TH' + String(s).slice(5, 7) + '/' + String(s).slice(2, 4); }
  function ppFmtTime(iso) { if (!iso) return '—'; return ppFmt(ppIso(new Date(iso))); }
  function ppDays(s) { var a = new Date(String(s).slice(0, 10) + 'T00:00:00'), b = new Date(ppToday() + 'T00:00:00'); return Math.round((b - a) / 86400000); }
  function ppAgo(s) { var n = ppDays(s); if (n <= 0) return 'hôm nay'; if (n === 1) return 'hôm qua'; if (n < 30) return n + ' ngày trước'; if (n < 365) return Math.floor(n / 30) + ' tháng trước'; return Math.floor(n / 365) + ' năm trước'; }
  function ppRel(iso) { var m = (Date.now() - new Date(iso).getTime()) / 60000; if (m < 1) return 'vừa xong'; if (m < 60) return Math.floor(m) + ' phút trước'; if (m < 1440) return Math.floor(m / 60) + ' giờ trước'; return ppAgo(ppIso(new Date(iso))); }
  function ppAge(dob) { if (!dob) return '—'; var a = new Date(dob + 'T00:00:00'), b = new Date(); var mo = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); if (b.getDate() < a.getDate()) mo--; if (mo < 1) return 'Dưới 1 tháng'; var y = Math.floor(mo / 12), r = mo % 12; if (y === 0) return r + ' tháng'; return y + ' tuổi' + (r ? ' ' + r + ' th' : ''); }
  function ppNum(n) { return Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 2 }); }
  function ppCode(prefix, id) { return prefix + '-' + String(id).padStart(4, '0'); }
  var ppHasErr = VAL.hasErr;
  var ppExt = VAL.ext;
  function ppMatch(q, arr) { if (!q) return true; for (var i = 0; i < arr.length; i++) { if (arr[i] && String(arr[i]).toLowerCase().indexOf(q) >= 0) return true; } return false; }
  function ppClone(o) { return JSON.parse(JSON.stringify(o)); }
  function storeGet() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function storeSet(v) { try { if (v) localStorage.setItem(TOKEN_KEY, v); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* private mode: session-only */ } }

  class Component extends window.PawPassRuntime.DCLogic {
    constructor(props) {
      super(props);
      this.token = null;
      this.files = {};        // document id → object URL (fetched through the authorised download endpoint)
      this.filePending = {};
      this.toastSeq = 0;
      this.pokeIdx = { c1: 0, c2: 0, d1: 0 };
      this.pokeTimers = {};
      this.state = {
        screen: 'login', page: 'dashboard', petId: null, tab: 'health', me: null, loaded: false, booting: true,
        pets: [], health: [], vacc: [], docs: [],
        form: {}, errors: {}, formError: '',
        modal: null, editingId: null, viewId: null, confirm: null, saving: false,
        petQuery: '', petSpecies: '', tabQuery: '', docType: '', searchQuery: '', searchType: 'all',
        toasts: [], busy: 0, arriving: false,
        poke: { c1: '', c2: '', d1: '' }, cheer: false, sleeperAwake: false, sleeperLine: ''
      };
    }

    componentDidMount() {
      var self = this;
      window.addEventListener('popstate', function () { self.applyRoute(); });
      var saved = storeGet();
      if (!saved) { this.setState({ booting: false }); return; }
      this.token = saved;
      this.api('GET', '/auth/me').then(function (r) {
        if (r.status === 200) self.enter({ user: r.data, token: saved }, { restore: true });
        else { self.token = null; storeSet(null); self.setState({ booting: false }); }
      });
    }

    /* ---------------- REST API client (/api) ---------------- */
    api(method, path, body) {
      var self = this;
      self.setState(function (s) { return { busy: s.busy + 1 }; });
      var headers = {};
      if (this.token) headers.Authorization = 'Bearer ' + this.token;
      var payload;
      if (body instanceof FormData) payload = body;
      else if (body !== undefined && method !== 'GET' && method !== 'DELETE') { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      return fetch('/api' + path, { method: method, headers: headers, body: payload })
        .then(function (res) {
          if (res.status === 204) return { status: 204 };
          return res.json().catch(function () { return {}; }).then(function (j) {
            if (res.ok) return { status: res.status, data: j };
            var msg = j.error || (res.status === 413 ? 'Tệp vượt quá giới hạn 4 MB.' : 'Có lỗi xảy ra (mã ' + res.status + ').');
            var errs = j.errors || (res.status === 413 ? { file: 'Tệp vượt quá giới hạn 4 MB.' } : {});
            return { status: res.status, error: msg, errors: errs };
          });
        })
        .catch(function () { return { status: 0, error: 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.', errors: {} }; })
        .then(function (r) { self.setState(function (s) { return { busy: Math.max(0, s.busy - 1) }; }); return r; });
    }

    /* ---------------- routing (hash URLs: #/pets/3/vaccinations …) ---------------- */
    go(hash, replace) {
      if (location.hash !== hash) { if (replace) history.replaceState(null, '', hash); else history.pushState(null, '', hash); }
      this.applyRoute();
    }
    applyRoute() {
      if (this.state.screen !== 'app') return;
      var parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
      var page = parts[0] || 'dashboard';
      if (page === 'pets' && parts[1]) {
        var id = Number(parts[1]), tab = SLUG_TAB[parts[2]] || 'health';
        if (!id) { this.go('#/pets', true); return; }
        var samePet = this.state.page === 'pet' && this.state.petId === id;
        this.setState(samePet ? { tab: tab, tabQuery: '', docType: '' } : { page: 'pet', petId: id, tab: tab, tabQuery: '', docType: '', photoErr: '' });
        if (!samePet) this.fetchPet(id);
        return;
      }
      if (['dashboard', 'pets', 'search', 'account'].indexOf(page) < 0) { this.go('#/dashboard', true); return; }
      this.setState({ page: page, tabQuery: '', modal: null });
    }
    fetchPet(id) {
      var self = this;
      this.api('GET', '/pets/' + id).then(function (r) {
        if (r.status === 200) self.upsert('pets', r.data);
        else { self.failed(r); if (r.status !== 401) self.nav('pets'); }
      });
    }
    nav(page) { this.go(page === 'dashboard' ? '#/dashboard' : '#/' + page); }
    openPet(id, tab) { if (!tab || tab === 'profile') tab = 'health'; this.go('#/pets/' + id + '/' + TAB_SLUG[tab]); }
    setTab(t) { this.go('#/pets/' + this.state.petId + '/' + TAB_SLUG[t]); }

    /* ---------------- documents: fetch file bytes with the token ---------------- */
    docUrl(id) {
      var self = this;
      if (this.files[id] || this.filePending[id]) return this.files[id] || null;
      this.filePending[id] = true;
      setTimeout(function () {
        fetch('/api/documents/' + id + '/download?inline=1', { headers: { Authorization: 'Bearer ' + self.token } })
          .then(function (res) { if (!res.ok) throw new Error(String(res.status)); return res.blob(); })
          .then(function (b) { self.files[id] = URL.createObjectURL(b); self.forceUpdate(); })
          .catch(function () { /* stays pending: the card shows without preview */ });
      }, 0);
      return null;
    }
    dropFile(id) { if (this.files[id]) URL.revokeObjectURL(this.files[id]); delete this.files[id]; delete this.filePending[id]; }

    /* ---------------- the yard ---------------- */
    poke(id){
      var self=this, lines=PP_LINES[id], line=lines[this.pokeIdx[id]%lines.length]; this.pokeIdx[id]++;
      this.setState(function(s){ var p=Object.assign({},s.poke); p[id]=line; return {poke:p}; });
      clearTimeout(this.pokeTimers[id]);
      this.pokeTimers[id]=setTimeout(function(){ self.setState(function(s){ var p=Object.assign({},s.poke); p[id]=''; return {poke:p}; }); }, 1700);
    }
    cheer(){
      var self=this; this.setState({cheer:true});
      clearTimeout(this.cheerTimer); this.cheerTimer=setTimeout(function(){ self.setState({cheer:false}); }, 1600);
    }
    pokeSleeper(){
      var self=this, lines=['Meo? Đang ngủ mà…','Ngáp~ năm phút nữa thôi','Rừ… đừng lo, mình canh sổ cho'];
      this.sleepIdx=(this.sleepIdx||0)+1;
      this.setState({sleeperAwake:true, sleeperLine:lines[this.sleepIdx%lines.length]});
      clearTimeout(this.sleepTimer); this.sleepTimer=setTimeout(function(){ self.setState({sleeperAwake:false}); }, 2200);
    }

    /* ---------------- CLIENT ---------------- */
    toast(kind, text) {
      var self = this, id = ++this.toastSeq;
      this.setState(function (s) { return { toasts: s.toasts.concat([{ id: id, text: text, cls: kind === 'ok' ? 'toast to-ok' : 'toast to-err' }]) }; });
      if (kind === 'ok') this.cheer();
      setTimeout(function () { self.setState(function (s) { return { toasts: s.toasts.filter(function (t) { return t.id !== id; }) }; }); }, 3200);
    }
    setField(k, v) { this.setState(function (s) { var f = Object.assign({}, s.form); f[k] = v; var e = Object.assign({}, s.errors); e[k] = ''; return { form: f, errors: e, formError: '' }; }); }
    setErr(k, msg) { this.setState(function (s) { var e = Object.assign({}, s.errors); e[k] = msg; return { errors: e }; }); }
    failed(r) {
      if (r.status === 422 || r.status === 409 || r.status === 413) { this.setState({ errors: r.errors || {} }); this.toast('err', r.error); }
      else if (r.status === 401) { this.toast('err', r.error); this.resetSession(); }
      else this.toast('err', r.error || 'Có lỗi xảy ra.');
    }

    enter(data, opts) {
      var self = this, restore = opts && opts.restore;
      this.token = data.token; storeSet(data.token);
      this.setState({ booting: false, arriving: !restore, screen: 'app', page: 'dashboard', me: data.user, form: {}, errors: {}, formError: '', pets: [], health: [], vacc: [], docs: [], loaded: false, modal: null });
      clearTimeout(this.arriveTimer);
      if (!restore) {
        this.arriveTimer = setTimeout(function () { self.setState({ arriving: false }); self.toast('ok', 'Xin chào, ' + data.user.name + '!'); }, 5000);
        this.go('#/dashboard', true);
      } else {
        this.applyRoute();
      }
      this.loadAll();
    }
    loadAll() {
      var self = this;
      return this.api('GET', '/pets').then(function (r) {
        if (r.status !== 200) { self.failed(r); return; }
        var pets = r.data; self.setState({ pets: pets });
        return Promise.all(pets.map(function (p) {
          return Promise.all([self.api('GET', '/pets/' + p.id + '/health-records'), self.api('GET', '/pets/' + p.id + '/vaccinations'), self.api('GET', '/pets/' + p.id + '/documents')]);
        })).then(function (rs) {
          var h = [], v = [], d = [], bad = null;
          rs.forEach(function (x) { x.forEach(function (y) { if (y.status !== 200) bad = bad || y; }); h = h.concat(x[0].data || []); v = v.concat(x[1].data || []); d = d.concat(x[2].data || []); });
          self.setState({ health: h, vacc: v, docs: d, loaded: true });
          if (bad) self.failed(bad);
        });
      });
    }
    doLogin() {
      var self = this, f = this.state.form, body = { email: (f.email || '').trim(), password: f.password || '' };
      var e = PP_V.login(body); if (ppHasErr(e)) { this.setState({ errors: e, formError: '' }); return; }
      this.setState({ saving: true, formError: '' });
      this.api('POST', '/auth/login', body).then(function (r) {
        self.setState({ saving: false });
        if (r.status === 200) self.enter(r.data); else self.setState({ formError: r.error, errors: r.errors || {} });
      });
    }
    doRegister() {
      var self = this, f = this.state.form, body = { name: f.name || '', email: (f.email || '').trim(), password: f.password || '', confirm: f.confirm || '' };
      var e = PP_V.register(body); if (ppHasErr(e)) { this.setState({ errors: e, formError: '' }); return; }
      this.setState({ saving: true, formError: '' });
      this.api('POST', '/auth/register', { name: body.name, email: body.email, password: body.password }).then(function (r) {
        self.setState({ saving: false });
        if (r.status === 201) self.enter(r.data); else self.setState({ formError: r.error, errors: r.errors || {} });
      });
    }
    resetSession() {
      var self = this;
      this.token = null; storeSet(null);
      Object.keys(this.files).forEach(function (id) { self.dropFile(id); });
      this.filePending = {};
      clearTimeout(this.arriveTimer);
      if (location.hash) history.replaceState(null, '', location.pathname);
      this.setState({ screen: 'login', page: 'dashboard', me: null, pets: [], health: [], vacc: [], docs: [], loaded: false, modal: null, form: {}, errors: {}, formError: '', petQuery: '', petSpecies: '', searchQuery: '', tabQuery: '', arriving: false, booting: false });
    }
    doLogout() { var self = this; this.api('POST', '/auth/logout').then(function () { self.resetSession(); self.toast('ok', 'Bạn đã đăng xuất.'); }); }

    savePetPhoto(photo, msg) {
      var self = this, s = this.state, p = s.pets.find(function (x) { return x.id === s.petId; }); if (!p) return;
      var body = { name: p.name, photo: photo, species: p.species, breed: p.breed || '', gender: p.gender, date_of_birth: p.date_of_birth || '', weight: p.weight == null ? '' : String(p.weight), color: p.color || '', description: p.description || '', notes: p.notes || '' };
      this.setState({ saving: true, photoErr: '' });
      this.api('PUT', '/pets/' + p.id, body).then(function (r) {
        self.setState({ saving: false });
        if (r.status === 200) { self.upsert('pets', r.data); self.toast('ok', msg); }
        else if (r.status === 422 && r.errors && r.errors.photo) self.setState({ photoErr: r.errors.photo });
        else self.failed(r);
      });
    }
    quickPhoto(e) {
      var self = this, file = e.target.files && e.target.files[0]; if (!file) return;
      var err = VAL.image(file);
      if (err) { this.setState({ photoErr: err }); e.target.value = ''; return; }
      var rd = new FileReader(); rd.onload = function () { self.savePetPhoto(rd.result, 'Đã đổi ảnh của bé.'); e.target.value = ''; }; rd.readAsDataURL(file);
    }

    openModal(type, id) {
      var s = this.state, f = {}, src;
      if (type === 'pet') {
        src = id ? s.pets.find(function (p) { return p.id === id; }) : null;
        f = src ? { name: src.name, photo: src.photo || '', species: src.species, breed: src.breed || '', gender: src.gender, date_of_birth: src.date_of_birth || '', weight: src.weight == null ? '' : String(src.weight), color: src.color || '', description: src.description || '', notes: src.notes || '' } : { species: '', gender: '', photo: '' };
      }
      else if (type === 'health') { src = id ? s.health.find(function (h) { return h.id === id; }) : null; f = src ? ppClone(src) : { examination_date: ppToday() }; }
      else if (type === 'vacc') { src = id ? s.vacc.find(function (v) { return v.id === id; }) : null; f = src ? ppClone(src) : { vaccination_date: ppToday() }; }
      else if (type === 'doc') { f = { file: null, description: '' }; }
      else if (type === 'account') { f = { name: s.me.name, email: s.me.email, avatar: s.me.avatar || '' }; }
      else if (type === 'password') { f = {}; }
      Object.keys(f).forEach(function (k) { if (f[k] === null && k !== 'file') f[k] = ''; });
      this.setState({ modal: type, editingId: id || null, form: f, errors: {}, formError: '' });
    }
    closeModal() { this.setState({ modal: null, editingId: null, viewId: null, errors: {}, form: {} }); }

    pickImage(e, key) {
      var self = this, file = e.target.files && e.target.files[0]; if (!file) return;
      var err = VAL.image(file);
      if (err) { this.setErr(key, err); e.target.value = ''; return; }
      var rd = new FileReader(); rd.onload = function () { self.setField(key, rd.result); }; rd.readAsDataURL(file);
    }
    pickDoc(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) { this.setField('file', null); return; }
      var meta = { name: file.name, type: file.type, size: file.size, blob: file };
      var err = PP_V.doc({ file: meta }).file;
      if (err) { this.setState(function (s) { var f = Object.assign({}, s.form, { file: null }); var ee = Object.assign({}, s.errors, { file: err }); return { form: f, errors: ee }; }); e.target.value = ''; return; }
      this.setField('file', meta);
    }

    save(validator, body, method, path, done, payload) {
      var self = this, errs = validator(body);
      if (ppHasErr(errs)) { this.setState({ errors: errs }); this.toast('err', 'Vui lòng kiểm tra lại các ô được đánh dấu.'); return; }
      this.setState({ saving: true });
      this.api(method, path, payload || body).then(function (r) {
        self.setState({ saving: false });
        if (r.status === 200 || r.status === 201) done(r.data, r.status); else self.failed(r);
      });
    }
    upsert(key, item) { this.setState(function (s) { var arr = s[key], found = false; var next = arr.map(function (x) { if (x.id === item.id) { found = true; return item; } return x; }); if (!found) next = next.concat([item]); var o = {}; o[key] = next; return o; }); }

    submitModal() {
      var self = this, s = this.state, m = s.modal, f = s.form, id = s.editingId, pid = s.petId;
      function txt(k) { return f[k] == null ? '' : String(f[k]); }
      if (s.saving) return;
      if (m === 'pet') {
        var pb = { name: txt('name'), photo: f.photo || '', species: txt('species'), breed: txt('breed'), gender: txt('gender'), date_of_birth: txt('date_of_birth'), weight: txt('weight').trim(), color: txt('color'), description: txt('description'), notes: txt('notes') };
        this.save(PP_V.pet, pb, id ? 'PUT' : 'POST', id ? '/pets/' + id : '/pets', function (d, st) {
          self.upsert('pets', d); self.closeModal();
          if (st === 201) { self.toast('ok', 'Chào mừng ' + d.name + ' về nhà!'); self.setState({ loaded: true }); self.openPet(d.id, 'health'); } else self.toast('ok', 'Đã cập nhật hồ sơ ' + d.name + '.');
        });
      } else if (m === 'health') {
        var hb = { examination_date: txt('examination_date'), reason: txt('reason'), diagnosis: txt('diagnosis'), treatment: txt('treatment'), medication: txt('medication'), notes: txt('notes') };
        this.save(PP_V.health, hb, id ? 'PUT' : 'POST', id ? '/health-records/' + id : '/pets/' + pid + '/health-records', function (d, st) {
          self.upsert('health', d); self.closeModal(); self.toast('ok', st === 201 ? 'Đã thêm lần khám.' : 'Đã cập nhật lần khám.');
        });
      } else if (m === 'vacc') {
        var vb = { vaccine_name: txt('vaccine_name'), vaccination_date: txt('vaccination_date'), dose: txt('dose'), notes: txt('notes') };
        this.save(PP_V.vacc, vb, id ? 'PUT' : 'POST', id ? '/vaccinations/' + id : '/pets/' + pid + '/vaccinations', function (d, st) {
          self.upsert('vacc', d); self.closeModal(); self.toast('ok', st === 201 ? 'Đã đóng dấu mũi tiêm mới.' : 'Đã cập nhật mũi tiêm.');
        });
      } else if (m === 'doc') {
        var fd = new FormData();
        if (f.file) fd.append('file', f.file.blob, f.file.name);
        fd.append('description', txt('description'));
        this.save(PP_V.doc, { file: f.file, description: txt('description') }, 'POST', '/pets/' + pid + '/documents', function (d) {
          self.upsert('docs', d); self.closeModal(); self.toast('ok', 'Đã cất ' + d.file_name + ' vào sổ.');
        }, fd);
      } else if (m === 'account') {
        this.save(PP_V.account, { name: txt('name'), email: txt('email'), avatar: f.avatar || '' }, 'PUT', '/auth/me', function (d) {
          self.setState({ me: d }); self.closeModal(); self.toast('ok', 'Đã cập nhật tài khoản.');
        });
      } else if (m === 'password') {
        var body = { current_password: txt('current_password'), new_password: txt('new_password'), confirm: txt('confirm') };
        var errs = PP_V.password(body); if (ppHasErr(errs)) { this.setState({ errors: errs }); return; }
        this.save(PP_V.password, body, 'PUT', '/auth/me', function () {
          self.closeModal(); self.toast('ok', 'Đã đổi mật khẩu.');
        }, { current_password: body.current_password, new_password: body.new_password });
      }
    }

    askDelete(kind, id) {
      var s = this.state, t;
      if (kind === 'pet') { var p = s.pets.find(function (x) { return x.id === id; }); if (!p) return; t = { title: 'Xóa ' + p.name + '?', text: 'Sổ của ' + p.name + ' cùng toàn bộ lần khám, mũi tiêm và tài liệu sẽ bị xóa vĩnh viễn.' }; }
      if (kind === 'health') { var h = s.health.find(function (x) { return x.id === id; }); if (!h) return; t = { title: 'Xóa lần khám?', text: 'Lần khám “' + h.reason + '” ngày ' + ppFmt(h.examination_date) + ' sẽ bị xóa.' }; }
      if (kind === 'vacc') { var v = s.vacc.find(function (x) { return x.id === id; }); if (!v) return; t = { title: 'Xóa mũi tiêm?', text: 'Mũi “' + v.vaccine_name + '” ngày ' + ppFmt(v.vaccination_date) + ' sẽ bị xóa.' }; }
      if (kind === 'doc') { var d = s.docs.find(function (x) { return x.id === id; }); if (!d) return; t = { title: 'Xóa tài liệu?', text: 'Tệp “' + d.file_name + '” sẽ bị xóa khỏi bộ lưu trữ.' }; }
      this.setState({ modal: 'confirm', confirm: Object.assign(t, { kind: kind, id: id }) });
    }
    runConfirm() {
      var self = this, c = this.state.confirm; if (!c || this.state.saving) return;
      var paths = { pet: '/pets/', health: '/health-records/', vacc: '/vaccinations/', doc: '/documents/' };
      this.setState({ saving: true });
      this.api('DELETE', paths[c.kind] + c.id).then(function (r) {
        self.setState({ saving: false });
        if (r.status !== 204) { self.failed(r); return; }
        if (c.kind === 'pet') {
          self.state.docs.forEach(function (d) { if (d.pet_id === c.id) self.dropFile(d.id); });
          self.setState(function (s) { return { pets: s.pets.filter(function (x) { return x.id !== c.id; }), health: s.health.filter(function (x) { return x.pet_id !== c.id; }), vacc: s.vacc.filter(function (x) { return x.pet_id !== c.id; }), docs: s.docs.filter(function (x) { return x.pet_id !== c.id; }) }; });
          if (self.state.page === 'pet') self.nav('pets');
          self.toast('ok', 'Đã xóa thú cưng.');
        } else {
          if (c.kind === 'doc') self.dropFile(c.id);
          var key = { health: 'health', vacc: 'vacc', doc: 'docs' }[c.kind];
          self.setState(function (s) { var o = {}; o[key] = s[key].filter(function (x) { return x.id !== c.id; }); return o; });
          self.toast('ok', 'Đã xóa.');
        }
        self.setState({ modal: null, confirm: null });
      });
    }
    openView(kind, id) {
      var self = this, map = { health: ['viewHealth', '/health-records/', 'health'], vacc: ['viewVacc', '/vaccinations/', 'vacc'], doc: ['viewDoc', '/documents/', 'docs'] }[kind];
      this.setState({ modal: map[0], viewId: id });
      this.api('GET', map[1] + id).then(function (r) { if (r.status === 200) self.upsert(map[2], r.data); else { self.failed(r); self.closeModal(); } });
    }

    h(){
      if(this._h) return this._h;
      var self=this, on={};
      PP_KEYS.forEach(function(k){ on[k]=function(e){ self.setField(k, e.target.value); }; });
      this._h = {
        on:on,
        goLogin:function(){ self.setState({screen:'login',form:{},errors:{},formError:''}); },
        goRegister:function(){ self.setState({screen:'register',form:{},errors:{},formError:''}); },
        submitLogin:function(e){ if(e && e.preventDefault) e.preventDefault(); self.doLogin(); },
        submitRegister:function(e){ if(e && e.preventDefault) e.preventDefault(); self.doRegister(); },
        keyLogin:function(e){ if(e.key==='Enter' && e.target && e.target.tagName==='INPUT'){ e.preventDefault(); self.doLogin(); } },
        keyRegister:function(e){ if(e.key==='Enter' && e.target && e.target.tagName==='INPUT'){ e.preventDefault(); self.doRegister(); } },
        logout:function(){ self.doLogout(); },
        navDash:function(){ self.nav('dashboard'); }, navPets:function(){ self.nav('pets'); },
        navSearch:function(){ self.nav('search'); }, navAccount:function(){ self.nav('account'); },
        addPet:function(){ self.openModal('pet',null); },
        addHealth:function(){ self.openModal('health',null); }, addVacc:function(){ self.openModal('vacc',null); }, addDoc:function(){ self.openModal('doc',null); },
        editCurrent:function(){ self.openModal('pet',self.state.petId); }, delCurrent:function(){ self.askDelete('pet',self.state.petId); },
        tabHealth:function(){ self.setTab('health'); }, tabVacc:function(){ self.setTab('vacc'); }, tabDocs:function(){ self.setTab('docs'); },
        onPetQuery:function(e){ self.setState({petQuery:e.target.value}); },
        onTabQuery:function(e){ self.setState({tabQuery:e.target.value}); }, onSearch:function(e){ self.setState({searchQuery:e.target.value}); },
        onPhoto:function(e){ self.pickImage(e,'photo'); }, onAvatar:function(e){ self.pickImage(e,'avatar'); },
        clearPhoto:function(){ self.setField('photo',''); }, clearAvatar:function(){ self.setField('avatar',''); },
        onDocFile:function(e){ self.pickDoc(e); },
        submitModal:function(e){ if(e && e.preventDefault) e.preventDefault(); self.submitModal(); },
        close:function(){ self.closeModal(); },
        confirmYes:function(){ self.runConfirm(); },
        editAccount:function(){ self.openModal('account'); }, changePassword:function(){ self.openModal('password'); },
        editViewed:function(){ var s=self.state, k=s.modal==='viewHealth'?'health':'vacc'; self.openModal(k, s.viewId); },
        pokeC1:function(){ self.poke('c1'); }, pokeC2:function(){ self.poke('c2'); }, pokeD1:function(){ self.poke('d1'); },
        pokeSleeper:function(){ self.pokeSleeper(); },
        quickPhoto:function(e){ self.quickPhoto(e); },
        removePhoto:function(){ self.savePetPhoto('','Đã gỡ ảnh, bé dùng hình minh hoạ.'); },
        skipArrive:function(){ clearTimeout(self.arriveTimer); self.setState({arriving:false}); self.toast('ok','Xin chào, '+((self.state.me||{}).name||'')+'!'); }
      };
      return this._h;
    }

    renderVals(){
      var s=this.state, self=this, H=this.h();
      var me=s.me||{name:'',email:'',avatar:''};
      var f={}; PP_KEYS.forEach(function(k){ f[k]=s.form[k]==null?'':s.form[k]; });
      f.photo=s.form.photo||''; f.avatar=s.form.avatar||''; f.file=s.form.file||null;
      var err={}, noErr={}, cls={};
      PP_ERRKEYS.forEach(function(k){ err[k]=s.errors[k]||''; noErr[k]=!err[k]; cls[k]=err[k]?'inp bad':'inp'; });

      var byId={}; s.pets.forEach(function(p){ byId[p.id]=p; });
      function count(arr,id){ var n=0; arr.forEach(function(x){ if(x.pet_id===id) n++; }); return n; }
      function latest(arr,id,key){ var b=null; arr.forEach(function(x){ if(x.pet_id===id && (!b || x[key]>b[key])) b=x; }); return b; }
      var watch=[];
      var pv=s.pets.slice().sort(function(a,b){ return a.created_at<b.created_at?-1:1; }).map(function(p){
        var lv=latest(s.vacc,p.id,'vaccination_date'), lh=latest(s.health,p.id,'examination_date'), nV=count(s.vacc,p.id);
        var il=p.photo?'':(p.species==='Chó'?ILLUS_DOG:(p.species==='Mèo'?ILLUS_CATS[p.id%3]:''));
        var open=function(){ self.openPet(p.id,'health'); };
        if(!lv) watch.push({pet:p.name, kind:'Tiêm chủng', kcls:'np-kind k-red', text:'Chưa có mũi tiêm nào được ghi lại.', go:function(){ self.openPet(p.id,'vacc'); }});
        if(lh && lh.medication && ppDays(lh.examination_date)<=30) watch.push({pet:p.name, kind:'Đang dùng thuốc', kcls:'np-kind k-green', text:lh.medication+' — khám '+ppAgo(lh.examination_date), go:open});
        if(p.notes) watch.push({pet:p.name, kind:'Ghi chú', kcls:'np-kind k-orange', text:p.notes, go:open});
        return Object.assign({},p,{
          code:ppCode('PET',p.id), initials:(p.name||'?').charAt(0).toUpperCase(), bg:PP_SP[p.species]||PP_SP['Khác'],
          hasPhoto:!!p.photo, hasIllus:!!il, illus:il, noPhoto:!p.photo && !il, ageText:ppAge(p.date_of_birth),
          weightText:(p.weight!=null && p.weight!=='')?ppNum(p.weight)+' kg':'—', breedText:p.breed||'Chưa rõ giống', colorText:p.color||'—',
          nHealth:count(s.health,p.id), nVacc:nV, nDocs:count(s.docs,p.id),
          stampText: nV ? nV+' mũi tiêm' : 'chưa tiêm', stampCls: nV ? 'pstamp' : 'pstamp none',
          vaccSummary: nV ? nV+' mũi' : 'Chưa có',
          lastExamShort: lh ? (lh.diagnosis||lh.reason)+' · '+ppAgo(lh.examination_date) : 'Chưa có',
          descText:p.description||'Chưa có mô tả.', notesText:p.notes||'Chưa có ghi chú.', dobText:ppFmt(p.date_of_birth),
          createdText:ppFmtTime(p.created_at), updatedText:ppFmtTime(p.updated_at),
          open:open, edit:function(){ self.openModal('pet',p.id); }, del:function(){ self.askDelete('pet',p.id); }
        });
      });

      var acts=[];
      s.pets.forEach(function(p){ acts.push({at:p.updated_at, kind:'Hồ sơ', kcls:'np-kind k-orange', title:(p.created_at===p.updated_at?'Thêm bé mới':'Cập nhật thông tin'), pet:p.name, go:function(){ self.openPet(p.id,'health'); }}); });
      s.health.forEach(function(h){ var p=byId[h.pet_id]; if(p) acts.push({at:h.updated_at, kind:'Lần khám', kcls:'np-kind k-green', title:h.reason, pet:p.name, go:function(){ self.openPet(p.id,'health'); }}); });
      s.vacc.forEach(function(v){ var p=byId[v.pet_id]; if(p) acts.push({at:v.updated_at, kind:'Mũi tiêm', kcls:'np-kind k-blue', title:v.vaccine_name+' — '+v.dose, pet:p.name, go:function(){ self.openPet(p.id,'vacc'); }}); });
      s.docs.forEach(function(d){ var p=byId[d.pet_id]; if(p) acts.push({at:d.uploaded_at, kind:'Tài liệu', kcls:'np-kind k-pink', title:d.description||d.file_name, pet:p.name, go:function(){ self.openPet(p.id,'docs'); }}); });
      acts.sort(function(a,b){ return a.at<b.at?1:-1; });
      acts=acts.slice(0,5).map(function(a){ a.when=ppRel(a.at); a.kcls=a.kcls.replace('np-kind k-','lab lab-'); return a; });
      var groups=[], gIdx={};
      watch.forEach(function(w){
        if(!(w.pet in gIdx)){ var pp=s.pets.find(function(x){ return x.name===w.pet; }); var pvi=pv.find(function(x){ return x.name===w.pet; }); gIdx[w.pet]=groups.length; groups.push({pet:w.pet, photo:(pp&&pp.photo)||'', hasPhoto:!!(pp&&pp.photo), hasIllus:!!(pvi&&pvi.illus), illus:pvi?pvi.illus:'', noPhoto:!(pp&&pp.photo)&&!(pvi&&pvi.illus), initials:w.pet.charAt(0).toUpperCase(), bg:PP_SP[pp&&pp.species]||PP_SP['Khác'], go:w.go, lines:[]}); }
        groups[gIdx[w.pet]].lines.push({label:w.kind, text:w.text, cls:w.kcls.replace('np-kind k-','lab lab-')});
      });

      var pq=s.petQuery.trim().toLowerCase();
      var petsFiltered=pv.filter(function(p){ return (!s.petSpecies || p.species===s.petSpecies) && ppMatch(pq,[p.name,p.breed,p.color,p.species]); });
      var spList=[''].concat(PP_SPECIES.filter(function(sp){ return s.pets.some(function(p){ return p.species===sp; }); }));
      var speciesChips=spList.map(function(sp){ var on=s.petSpecies===sp; return {label:sp||'Tất cả', on:on?'true':'false', cls:on?'chip on':'chip', pick:function(){ self.setState({petSpecies:sp}); }}; });

      var cp=s.page==='pet' ? pv.find(function(p){ return p.id===s.petId; }) : null;
      var q=s.tabQuery.trim().toLowerCase();
      var profileRows=[], hl=[], vl=[], dl=[];
      if(cp){
        profileRows=[{k:'Ngày sinh',v:cp.dobText},{k:'Tuổi',v:cp.ageText},{k:'Cân nặng',v:cp.weightText},{k:'Màu lông',v:cp.colorText},{k:'Giới tính',v:cp.gender}];
        hl=s.health.filter(function(h){ return h.pet_id===cp.id && ppMatch(q,[h.reason,h.diagnosis,h.treatment,h.medication,h.notes]); })
          .sort(function(a,b){ return a.examination_date<b.examination_date?1:-1; });
        hl=hl.map(function(h,i){ return Object.assign({},h,{tlCls:i===hl.length-1?'tl-item last':'tl-item', dateText:ppFmt(h.examination_date), agoText:ppAgo(h.examination_date), diagText:h.diagnosis||'Chưa có chẩn đoán', hasMed:!!h.medication,
            view:function(){ self.openView('health',h.id); }, edit:function(){ self.openModal('health',h.id); }, del:function(){ self.askDelete('health',h.id); }}); });
        vl=s.vacc.filter(function(v){ return v.pet_id===cp.id && ppMatch(q,[v.vaccine_name,v.dose,v.notes]); })
          .sort(function(a,b){ return a.vaccination_date<b.vaccination_date?1:-1; })
          .map(function(v,i){ return Object.assign({},v,{stampCls:'vstamp '+(i%2?'tilt-b':'tilt-a'), dd:ppDD(v.vaccination_date), mmyy:ppMMYY(v.vaccination_date), dateText:ppFmt(v.vaccination_date), hasNotes:!!v.notes,
            view:function(){ self.openView('vacc',v.id); }, edit:function(){ self.openModal('vacc',v.id); }, del:function(){ self.askDelete('vacc',v.id); }}); });
        dl=s.docs.filter(function(d){ var t=s.docType; return d.pet_id===cp.id && (!t || (t==='img'?d.file_type!=='pdf':d.file_type==='pdf')) && ppMatch(q,[d.file_name,d.description]); })
          .sort(function(a,b){ return a.uploaded_at<b.uploaded_at?1:-1; })
          .map(function(d){ var url=s.tab==='docs'?self.docUrl(d.id):null; return Object.assign({},d,{url:url, hasUrl:!!url, showImg:d.file_type!=='pdf' && !!url, isPdf:d.file_type==='pdf', typeLabel:d.file_type.toUpperCase(), dateText:ppFmt(d.uploaded_at), hasDesc:!!d.description,
            view:function(){ self.openView('doc',d.id); }, del:function(){ self.askDelete('doc',d.id); }}); });
      }
      var tabFlag={health:s.tab==='health', vacc:s.tab==='vacc', docs:s.tab==='docs'};
      var tabCls={}, tabSel={}; ['health','vacc','docs'].forEach(function(k){ tabCls[k]=tabFlag[k]?'ftab on':'ftab'; tabSel[k]=tabFlag[k]?'true':'false'; });
      var docChips=[['','Tất cả'],['img','Ảnh'],['pdf','PDF']].map(function(c){ var on=s.docType===c[0]; return {label:c[1], on:on?'true':'false', cls:on?'chip on':'chip', pick:function(){ self.setState({docType:c[0]}); }}; });

      var sq=s.searchQuery.trim().toLowerCase(), st=s.searchType, results=[];
      if(sq){
        if(st==='all'||st==='pet') pv.forEach(function(p){ if(ppMatch(sq,[p.name,p.breed,p.species,p.color,p.description,p.notes,p.code])) results.push({type:'Thú cưng', bcls:'tag t-orange', title:p.name, sub:p.species+' · '+p.breedText+' · '+p.ageText, pet:p.code, go:function(){ self.openPet(p.id,'health'); }}); });
        if(st==='all'||st==='health') s.health.forEach(function(h){ var p=byId[h.pet_id]; if(p && ppMatch(sq,[h.reason,h.diagnosis,h.treatment,h.medication,h.notes])) results.push({type:'Sức khỏe', bcls:'tag t-green', title:h.reason, sub:ppFmt(h.examination_date)+(h.diagnosis?' · '+h.diagnosis:''), pet:p.name, go:function(){ self.openPet(p.id,'health'); self.openView('health',h.id); }}); });
        if(st==='all'||st==='vacc') s.vacc.forEach(function(v){ var p=byId[v.pet_id]; if(p && ppMatch(sq,[v.vaccine_name,v.dose,v.notes])) results.push({type:'Tiêm chủng', bcls:'tag t-blue', title:v.vaccine_name, sub:ppFmt(v.vaccination_date)+' · '+v.dose, pet:p.name, go:function(){ self.openPet(p.id,'vacc'); self.openView('vacc',v.id); }}); });
        if(st==='all'||st==='doc') s.docs.forEach(function(d){ var p=byId[d.pet_id]; if(p && ppMatch(sq,[d.file_name,d.description,d.file_type])) results.push({type:'Tài liệu', bcls:'tag t-pink', title:d.file_name, sub:d.file_type.toUpperCase()+' · '+ppFmt(d.uploaded_at)+(d.description?' · '+d.description:''), pet:p.name, go:function(){ self.openPet(p.id,'docs'); self.openView('doc',d.id); }}); });
      }
      var searchChips=[['all','Tất cả'],['pet','Thú cưng'],['health','Sức khỏe'],['vacc','Tiêm chủng'],['doc','Tài liệu']].map(function(c){ var on=st===c[0]; return {label:c[1], on:on?'true':'false', cls:on?'chip on':'chip', pick:function(){ self.setState({searchType:c[0]}); }}; });

      var md={pet:s.modal==='pet', health:s.modal==='health', vacc:s.modal==='vacc', doc:s.modal==='doc', account:s.modal==='account', password:s.modal==='password',
        confirm:s.modal==='confirm', viewHealth:s.modal==='viewHealth', viewVacc:s.modal==='viewVacc', viewDoc:s.modal==='viewDoc'};
      md.form=md.pet||md.health||md.vacc||md.doc||md.account||md.password;
      var curPet=byId[s.petId];
      var titles={pet:s.editingId?'Sửa hồ sơ thú cưng':'Thêm thú cưng', health:s.editingId?'Sửa lần khám':'Thêm lần khám', vacc:s.editingId?'Sửa mũi tiêm':'Thêm mũi tiêm', doc:'Tải lên tài liệu', account:'Sửa thông tin tài khoản', password:'Đổi mật khẩu'};
      var modalSub=(md.health||md.vacc||md.doc) && curPet ? 'Cho bé: '+curPet.name : '';
      var vh=null, vv=null, vd=null;
      if(md.viewHealth){ var h0=s.health.find(function(x){ return x.id===s.viewId; }); if(h0) vh=Object.assign({},h0,{code:ppCode('HR',h0.id), petName:(byId[h0.pet_id]||{}).name, dateText:ppFmt(h0.examination_date), diagnosisText:h0.diagnosis||'—', treatmentText:h0.treatment||'—', medicationText:h0.medication||'—', notesText:h0.notes||'—'}); else md.viewHealth=false; }
      if(md.viewVacc){ var v0=s.vacc.find(function(x){ return x.id===s.viewId; }); if(v0) vv=Object.assign({},v0,{code:ppCode('VC',v0.id), petName:(byId[v0.pet_id]||{}).name, dateText:ppFmt(v0.vaccination_date), notesText:v0.notes||'—'}); else md.viewVacc=false; }
      if(md.viewDoc){ var d0=s.docs.find(function(x){ return x.id===s.viewId; }); if(d0){ var u0=self.docUrl(d0.id); vd=Object.assign({},d0,{code:ppCode('DOC',d0.id), petName:(byId[d0.pet_id]||{}).name, url:u0, hasUrl:!!u0, isPdf:d0.file_type==='pdf', showImg:d0.file_type!=='pdf' && !!u0, typeLabel:d0.file_type.toUpperCase(), dateText:ppFmt(d0.uploaded_at), descText:d0.description||'Không có mô tả.'}); } else md.viewDoc=false; }
      var fileInfo=f.file ? f.file.name+' · '+(f.file.size>=PP_MB?(f.file.size/PP_MB).toFixed(1)+' MB':Math.max(1,Math.round(f.file.size/1024))+' KB') : '';

      var parts=(me.name||'?').trim().split(/\s+/); var meInitials=((parts.length>1?parts[parts.length-2].charAt(0):'')+parts[parts.length-1].charAt(0)).toUpperCase();
      var first=(me.name||'').trim().split(/\s+/).pop();
      var hr=new Date().getHours(), greet=hr<11?'Chào buổi sáng':hr<14?'Chào buổi trưa':hr<18?'Chào buổi chiều':'Chào buổi tối';

      var bub={}, critCls={};
      ['c1','c2','d1'].forEach(function(k){ bub[k]=s.poke[k] || (s.cheer?'Yay!':''); critCls[k]=(s.poke[k]||s.cheer)?'critter hop':'critter'; });

      return {
        H:H, f:f, err:err, noErr:noErr, cls:cls, formError:s.formError, busy:s.busy>0, saving:s.saving,
        loginLabel:s.saving?'Đang đăng nhập…':'Đăng nhập', registerLabel:s.saving?'Đang tạo tài khoản…':'Tạo tài khoản',
        saveLabel:s.saving?'Đang lưu…':(md.doc?'Tải lên':'Lưu'), deleteLabel:s.saving?'Đang xóa…':'Xóa',
        scr:{auth:s.screen!=='app', login:s.screen==='login', register:s.screen==='register', app:s.screen==='app'},
        pg:{dashboard:s.page==='dashboard', pets:s.page==='pets', pet:s.page==='pet' && !!cp, search:s.page==='search', account:s.page==='account'},
        nav:{dashboard:s.page==='dashboard'?'tnav on':'tnav', pets:(s.page==='pets'||s.page==='pet')?'tnav on':'tnav', search:s.page==='search'?'tnav on':'tnav', account:s.page==='account'?'tnav on':'tnav'},
        me:me, meInitials:meInitials, meHasAvatar:!!me.avatar, meNoAvatar:!me.avatar, meSince:ppFmt(me.created_at),
        greeting:greet+', '+first+'!', loading:!s.loaded, loaded:s.loaded,
        summary:s.pets.length+' bé · '+s.health.length+' lần khám · '+s.vacc.length+' mũi tiêm · '+s.docs.length+' tài liệu',
        tally:{pets:s.pets.length, health:s.health.length, vacc:s.vacc.length, docs:s.docs.length},
        pv:pv, watchGroups:groups, noWatch:watch.length===0, acts:acts, noActs:acts.length===0,
        petsCountText:'Bạn đang chăm '+s.pets.length+' bé',
        petQuery:s.petQuery, speciesChips:speciesChips, petsFiltered:petsFiltered, petsFilteredEmpty:petsFiltered.length===0,
        cp:cp||{}, profileRows:profileRows, tab:tabFlag, tabCls:tabCls, tabSel:tabSel, tabQuery:s.tabQuery,
        hl:hl, hlEmpty:hl.length===0, hlEmptyTitle:q?'Không có lần khám khớp từ khóa':'Chưa có lần khám nào',
        vl:vl, vlEmpty:vl.length===0, vlEmptyTitle:q?'Không có mũi tiêm khớp từ khóa':'Chưa có mũi tiêm nào',
        dl:dl, dlEmpty:dl.length===0, dlEmptyTitle:(q||s.docType)?'Không có tài liệu phù hợp':'Chưa có tài liệu', docChips:docChips,
        searchQuery:s.searchQuery, searchChips:searchChips, results:results, searchIdle:!sq, resultsEmpty:!!sq && results.length===0, resultsHas:results.length>0, resultsCount:results.length+' kết quả',
        md:md, modalTitle:titles[s.modal]||'', modalSub:modalSub, vh:vh||{}, vv:vv||{}, vd:vd||{}, confirm:s.confirm||{},
        fHasPhoto:!!f.photo, fNoPhoto:!f.photo, fHasAvatar:!!f.avatar, fNoAvatar:!f.avatar, fHasFile:!!f.file, fileInfo:fileInfo,
        toasts:s.toasts,
        arriving:s.arriving, photoErr:s.photoErr||'', noPhotoErr:!s.photoErr, photoBtnLabel:(cp&&cp.hasPhoto)?'Đổi ảnh':'Thêm ảnh', yardCls:s.screen==='app'?'yard':'yard on-auth',
        showYard:(this.props.walkingPets ?? true) && !s.arriving, bub:bub, critCls:critCls,
        sleeper:{awake:s.sleeperAwake, asleep:!s.sleeperAwake, line:s.sleeperLine}
      };
    }
  }

  window.PawPassApp = window.PawPassRuntime.mount(Component, document.getElementById('app'), document.getElementById('pp-template'), { walkingPets: true });
})();
