/*
 * PawPass — theo dõi hành vi người dùng (Google Analytics 4) và lỗi phía trình duyệt (Sentry).
 *
 * Mã GA (G-XXXXXXXXXX) và DSN Sentry KHÔNG ghi cứng ở đây: trang hỏi máy chủ qua GET /api/config,
 * máy chủ đọc từ biến môi trường GA_MEASUREMENT_ID và SENTRY_DSN (hoặc SENTRY_DSN_BROWSER) trên Vercel.
 * Chưa đặt biến nào thì file này không tải gì cả.
 *
 * Để trang mở nhanh (Lighthouse), cả hai chỉ được tải SAU khi trang đã hiện xong.
 * Không gửi thông tin cá nhân: đường dẫn được thay số id bằng :id, không gửi tên, email hay nội dung hồ sơ.
 *
 * Các file khác gọi:  window.ppTrack('ten_su_kien', { tham_so: 'gia_tri' })
 */
(function () {
  'use strict';
  var SENTRY_SDK = 'https://browser.sentry-cdn.com/8.47.0/bundle.min.js';
  var queue = [];          // sự kiện xảy ra trước khi GA tải xong
  var earlyErrors = [];    // lỗi xảy ra trước khi Sentry tải xong
  var gaReady = false;

  function onError(e) { earlyErrors.push(e.error || e.reason || e.message); }
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);

  /** Đường dẫn "sạch" để thống kê: /#/pets/12/health → /#/pets/:id/health */
  function pagePath() {
    return (location.pathname + location.hash).replace(/\/\d+(?=\/|$)/g, '/:id');
  }

  window.ppTrack = function (name, params) {
    if (gaReady) window.gtag('event', name, params || {});
    else if (queue.length < 50) queue.push([name, params || {}]);
  };

  function loadScript(src, attrs) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
      s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  function startGA(id) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // Ứng dụng là SPA (đổi trang bằng #/...), nên tự gửi page_view mỗi khi đổi trang.
    window.gtag('config', id, { send_page_view: false, anonymize_ip: true });
    var last = '';
    function pageView() {
      var p = pagePath();
      if (p === last) return;
      last = p;
      window.gtag('event', 'page_view', { page_path: p, page_location: location.origin + p, page_title: document.title });
    }
    // app.js đổi trang bằng history.pushState → bọc lại để biết khi nào đổi trang.
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () { var r = orig.apply(this, arguments); setTimeout(pageView, 0); return r; };
    });
    window.addEventListener('popstate', pageView);
    window.addEventListener('hashchange', pageView);
    gaReady = true;
    pageView();
    queue.splice(0).forEach(function (q) { window.gtag('event', q[0], q[1]); });
    return loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id));
  }

  function startSentry(dsn, env) {
    return loadScript(SENTRY_SDK, { crossorigin: 'anonymous' }).then(function () {
      if (!window.Sentry) return;
      window.Sentry.init({
        dsn: dsn,
        environment: env,
        sendDefaultPii: false,
        // Bỏ chuỗi truy vấn và số id khỏi URL trước khi gửi
        beforeSend: function (event) {
          if (event.request && event.request.url) event.request.url = event.request.url.split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id');
          return event;
        }
      });
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onError);
      earlyErrors.splice(0).forEach(function (err) { window.Sentry.captureException(err); });
    });
  }

  function start() {
    fetch('/api/config').then(function (r) { return r.ok ? r.json() : {}; }).then(function (cfg) {
      if (cfg.gaId) startGA(cfg.gaId).catch(function () { /* bị trình chặn quảng cáo: bỏ qua */ });
      if (cfg.sentryDsn) startSentry(cfg.sentryDsn, cfg.environment).catch(function () { /* bỏ qua */ });
    }).catch(function () { /* không có mạng: bỏ qua */ });
  }

  // Tải sau khi trang hiện xong và trình duyệt rảnh, để không ảnh hưởng tốc độ mở trang.
  function later() { (window.requestIdleCallback || function (f) { setTimeout(f, 1500); })(start, { timeout: 4000 }); }
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
})();
