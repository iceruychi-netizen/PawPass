/*
 * PawPass — shared validation rules (Step 2 · section 7).
 * Loaded by the browser (window.PawPassValidators) and required by the API (module.exports),
 * so client and server always apply the same rules.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PawPassValidators = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MB = 1048576;
  var LIMITS = { photoBytes: 2 * MB, documentBytes: 4 * MB };
  var SPECIES = ['Chó', 'Mèo', 'Chim', 'Thỏ', 'Hamster', 'Khác'];
  var GENDERS = ['Đực', 'Cái'];
  var DOC_EXT = ['jpg', 'jpeg', 'png', 'pdf'];
  var DOC_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
  var IMG_EXT = ['jpg', 'jpeg', 'png'];
  var IMG_MIME = ['image/jpeg', 'image/png'];

  function z(n) { return String(n).padStart(2, '0'); }
  function isoLocal(d) { return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }

  // "Today" used for the not-in-the-future rule. The server overrides this with the latest
  // calendar date anywhere on Earth so a user in UTC+7 is never rejected by a UTC server.
  var clock = { today: function () { return isoLocal(new Date()); } };

  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    var d = new Date(s + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }
  function empty(v) { return v === undefined || v === null || String(v).trim() === ''; }
  function hasErr(e) { for (var k in e) { if (e[k]) return true; } return false; }
  function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }

  function vEmail(e, v) {
    if (empty(v)) e.email = 'Vui lòng nhập email.';
    else if (String(v).trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())) e.email = 'Email không đúng định dạng.';
  }
  function vLen(e, k, v, n, label) { if (!empty(v) && String(v).trim().length > n) e[k] = label + ' tối đa ' + n + ' ký tự.'; }
  function vText(e, k, v) { if (v !== undefined && v !== null && typeof v !== 'string' && typeof v !== 'number') e[k] = 'Giá trị không hợp lệ.'; }
  function vDate(e, k, v, req, label) {
    if (empty(v)) { if (req) e[k] = 'Vui lòng chọn ' + label.toLowerCase() + '.'; return; }
    v = String(v);
    if (!validDate(v)) { e[k] = label + ' không hợp lệ.'; return; }
    if (v > clock.today()) e[k] = label + ' không được ở tương lai.';
    else if (v < '1980-01-01') e[k] = label + ' không hợp lệ.';
  }
  function parseWeight(v) { return Number(String(v).trim().replace(',', '.')); }

  /** Image picked for a pet photo or account avatar ({name, type, size}). */
  function image(file) {
    if (!file) return '';
    if (IMG_EXT.indexOf(ext(file.name)) < 0 || IMG_MIME.indexOf(file.type) < 0) return 'Ảnh chỉ hỗ trợ định dạng JPG hoặc PNG.';
    if (file.size > LIMITS.photoBytes) return 'Ảnh vượt quá giới hạn 2 MB.';
    if (file.size === 0) return 'Tệp ảnh rỗng.';
    return '';
  }

  var V = {
    register: function (b) {
      var e = {};
      if (empty(b.name)) e.name = 'Vui lòng nhập họ tên.'; else vLen(e, 'name', b.name, 60, 'Họ tên');
      vEmail(e, b.email);
      if (empty(b.password)) e.password = 'Vui lòng nhập mật khẩu.';
      else if (String(b.password).length < 6) e.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
      else if (String(b.password).length > 128) e.password = 'Mật khẩu tối đa 128 ký tự.';
      if (b.confirm !== undefined && b.confirm !== b.password) e.confirm = 'Mật khẩu nhập lại không khớp.';
      return e;
    },
    login: function (b) {
      var e = {};
      vEmail(e, b.email);
      if (empty(b.password)) e.password = 'Vui lòng nhập mật khẩu.';
      return e;
    },
    account: function (b) {
      var e = {};
      if (empty(b.name)) e.name = 'Vui lòng nhập họ tên.'; else vLen(e, 'name', b.name, 60, 'Họ tên');
      vEmail(e, b.email);
      return e;
    },
    password: function (b) {
      var e = {};
      if (empty(b.current_password)) e.current_password = 'Vui lòng nhập mật khẩu hiện tại.';
      if (empty(b.new_password)) e.new_password = 'Vui lòng nhập mật khẩu mới.';
      else if (String(b.new_password).length < 6) e.new_password = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      else if (String(b.new_password).length > 128) e.new_password = 'Mật khẩu tối đa 128 ký tự.';
      if (b.confirm !== undefined && b.confirm !== b.new_password) e.confirm = 'Mật khẩu nhập lại không khớp.';
      return e;
    },
    pet: function (b) {
      var e = {};
      ['name', 'species', 'breed', 'gender', 'color', 'description', 'notes'].forEach(function (k) { vText(e, k, b[k]); });
      if (empty(b.name)) e.name = 'Vui lòng nhập tên thú cưng.'; else vLen(e, 'name', b.name, 50, 'Tên');
      if (SPECIES.indexOf(b.species) < 0) e.species = 'Vui lòng chọn loài.';
      if (GENDERS.indexOf(b.gender) < 0) e.gender = 'Vui lòng chọn giới tính.';
      vDate(e, 'date_of_birth', b.date_of_birth, false, 'Ngày sinh');
      if (!empty(b.weight)) {
        var w = parseWeight(b.weight);
        if (isNaN(w) || w <= 0) e.weight = 'Cân nặng phải là số lớn hơn 0.';
        else if (w > 200) e.weight = 'Cân nặng tối đa 200 kg.';
      }
      vLen(e, 'breed', b.breed, 50, 'Giống'); vLen(e, 'color', b.color, 30, 'Màu lông');
      vLen(e, 'description', b.description, 500, 'Mô tả'); vLen(e, 'notes', b.notes, 1000, 'Ghi chú');
      return e;
    },
    health: function (b) {
      var e = {};
      ['reason', 'diagnosis', 'treatment', 'medication', 'notes'].forEach(function (k) { vText(e, k, b[k]); });
      vDate(e, 'examination_date', b.examination_date, true, 'Ngày khám');
      if (empty(b.reason)) e.reason = 'Vui lòng nhập lý do khám.'; else vLen(e, 'reason', b.reason, 200, 'Lý do khám');
      vLen(e, 'diagnosis', b.diagnosis, 500, 'Chẩn đoán'); vLen(e, 'treatment', b.treatment, 1000, 'Điều trị');
      vLen(e, 'medication', b.medication, 500, 'Thuốc'); vLen(e, 'notes', b.notes, 1000, 'Ghi chú');
      return e;
    },
    vacc: function (b) {
      var e = {};
      ['vaccine_name', 'dose', 'notes'].forEach(function (k) { vText(e, k, b[k]); });
      if (empty(b.vaccine_name)) e.vaccine_name = 'Vui lòng nhập tên vắc xin.'; else vLen(e, 'vaccine_name', b.vaccine_name, 100, 'Tên vắc xin');
      vDate(e, 'vaccination_date', b.vaccination_date, true, 'Ngày tiêm');
      if (empty(b.dose)) e.dose = 'Vui lòng nhập liều / mũi tiêm.'; else vLen(e, 'dose', b.dose, 50, 'Liều');
      vLen(e, 'notes', b.notes, 1000, 'Ghi chú');
      return e;
    },
    /** b.file = {name, type, size} */
    doc: function (b) {
      var e = {}, f = b.file;
      if (!f) e.file = 'Vui lòng chọn tệp để tải lên.';
      else if (DOC_EXT.indexOf(ext(f.name)) < 0 || DOC_MIME.indexOf(f.type) < 0) e.file = 'Định dạng không được hỗ trợ. Chỉ chấp nhận JPG, PNG, PDF.';
      else if (f.size > LIMITS.documentBytes) e.file = 'Tệp vượt quá giới hạn 4 MB.';
      else if (f.size === 0) e.file = 'Tệp rỗng, vui lòng chọn tệp khác.';
      vText(e, 'description', b.description);
      vLen(e, 'description', b.description, 255, 'Mô tả');
      return e;
    }
  };

  return {
    V: V, LIMITS: LIMITS, SPECIES: SPECIES, GENDERS: GENDERS, MB: MB,
    clock: clock, validDate: validDate, empty: empty, hasErr: hasErr, ext: ext,
    image: image, parseWeight: parseWeight, isoLocal: isoLocal
  };
});
