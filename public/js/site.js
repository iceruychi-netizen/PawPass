/*
 * PawPass — JavaScript cho các trang Giới thiệu / Liên hệ (gioi-thieu.html, lien-he.html).
 *  1. Menu trên điện thoại: bấm nút ☰ để mở / đóng.
 *  2. Câu hỏi thường gặp: bấm câu hỏi để mở / đóng câu trả lời (accordion).
 *  3. Form liên hệ: kiểm tra dữ liệu ngay khi nhập, đếm ký tự, rồi mở trang tạo Issue trên GitHub đã điền sẵn.
 */
(function () {
  'use strict';
  var REPO = 'https://github.com/iceruychi-netizen/PawPass-Hosothucung';
  var track = function (name, params) { if (window.ppTrack) window.ppTrack(name, params); };

  /* ---------- 1. Menu điện thoại ---------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('site-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Mở menu' : 'Đóng menu');
      menu.classList.toggle('hidden', open);
      menu.classList.toggle('flex', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { toggle.click(); toggle.focus(); }
    });
  }

  /* ---------- 2. Accordion câu hỏi thường gặp ---------- */
  document.querySelectorAll('[data-accordion] button[aria-controls]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.classList.toggle('hidden', open);
      var sign = btn.querySelector('span');
      if (sign) sign.classList.toggle('rotate-45', !open);
      if (!open) track('faq_open', { question: btn.getAttribute('aria-controls') });
    });
  });

  /* ---------- 3. Form liên hệ ---------- */
  var form = document.getElementById('contact-form');
  if (!form) return;
  var name = document.getElementById('ct-name');
  var msg = document.getElementById('ct-msg');
  var count = document.getElementById('ct-msg-count');
  var done = document.getElementById('ct-done');
  var MAX = 1000;

  function showError(input, text) {
    var el = document.getElementById(input.id + '-err');
    el.textContent = text || '';
    el.classList.toggle('hidden', !text);
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    input.classList.toggle('border-red-700', !!text);
  }

  // Họ tên dùng chung quy tắc với ứng dụng (public/js/validators.js): bắt buộc, tối đa 60 ký tự.
  function checkName() {
    var v = name.value.trim(), err = '';
    if (window.PawPassValidators) err = window.PawPassValidators.V.account({ name: v, email: 'a@b.co' }).name || '';
    else if (!v) err = 'Vui lòng nhập họ tên.';
    showError(name, err);
    return !err;
  }
  function checkMsg() {
    var v = msg.value.trim(), err = '';
    if (!v) err = 'Vui lòng nhập nội dung.';
    else if (v.length < 10) err = 'Nội dung cần ít nhất 10 ký tự để nhóm hiểu được.';
    showError(msg, err);
    return !err;
  }
  function updateCount() {
    var n = msg.value.length;
    count.textContent = n + ' / ' + MAX;
    count.classList.toggle('text-red-700', n > MAX * 0.9);
  }

  name.addEventListener('blur', checkName);
  msg.addEventListener('blur', checkMsg);
  name.addEventListener('input', function () { if (name.getAttribute('aria-invalid') === 'true') checkName(); });
  msg.addEventListener('input', function () { updateCount(); if (msg.getAttribute('aria-invalid') === 'true') checkMsg(); });
  updateCount();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = checkName() & checkMsg(); // kiểm tra cả hai để hiện đủ lỗi một lần
    if (!ok) {
      (name.getAttribute('aria-invalid') === 'true' ? name : msg).focus();
      track('contact_invalid');
      return;
    }
    var topic = form.querySelector('input[name="topic"]:checked').value;
    var title = '[' + topic + '] ' + msg.value.trim().split('\n')[0].slice(0, 60);
    var body = '**Người gửi:** ' + name.value.trim() + '\n**Chủ đề:** ' + topic + '\n\n' + msg.value.trim() + '\n\n_Gửi từ trang Liên hệ của PawPass._';
    var url = REPO + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
    window.open(url, '_blank', 'noopener');
    track('contact_submit', { topic: topic });
    done.textContent = 'Đã mở trang GitHub với lời nhắn điền sẵn. Bấm "Submit new issue" ở đó để gửi. Cảm ơn bạn!';
    done.classList.remove('hidden');
    form.reset();
    updateCount();
  });
})();
