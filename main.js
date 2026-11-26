(function () {
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ---------- scroll reveal ----------
  (function () {
    var revealSelector =
      '.site-header, .site-footer, .hero-copy, .sec-head, .page-head .stack, .panel';
    var revealEls = Array.prototype.slice.call(document.querySelectorAll(revealSelector));
    if (!revealEls.length) return;

    var threshold = window.innerHeight * 0.9;

    function updateReveals() {
      var th = window.innerHeight * 0.9;
      revealEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < th) {
          el.classList.add('is-visible');
        } else {
          el.classList.remove('is-visible');
        }
      });
    }

    // Initial load: stagger reveal for elements already above the threshold
    var initialEls = revealEls
      .filter(function (el) {
        return el.getBoundingClientRect().top < threshold;
      })
      .sort(function (a, b) {
        return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
      });

    initialEls.forEach(function (el, i) {
      setTimeout(function () {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) {
          el.classList.add('is-visible');
        }
      }, i * 50);
    });

    // Scroll / resize handler with requestAnimationFrame
    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          updateReveals();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  })();

  // ---------- form handling (unchanged) ----------
  var form = document.getElementById('apply-form');
  if (!form) return;
  var status = document.getElementById('form-status');

  // Расчёт из калькулятора на странице «Услуги»
  try {
    var calc = new URLSearchParams(location.search).get('calc');
    if (calc && form.elements['description'] && !form.elements['description'].value) {
      form.elements['description'].value = calc;
    }
  } catch (e) {}

  function setErr(id, msg) {
    var f = document.getElementById(id);
    if (!f) return;
    var wrap = f.closest('.field');
    wrap.classList.toggle('bad', !!msg);
    wrap.querySelector('.err').textContent = msg || '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements['name'].value.trim();
    var contact = form.elements['contact'].value.trim();
    var desc = form.elements['description'].value.trim();
    var ok = true;
    setErr('f-name', name ? '' : 'Укажите, как к вам обращаться');
    setErr('f-contact', contact ? '' : 'Укажите телефон, e-mail или ссылку на мессенджер');
    setErr('f-desc', desc.length >= 10 ? '' : 'Опишите задачу хотя бы в двух словах');
    if (!name || !contact || desc.length < 10) ok = false;
    if (form.elements['bot-field'] && form.elements['bot-field'].value) return;
    if (!ok) return;

    var mode = form.getAttribute('data-mode');
    status.hidden = false;
    if (mode === 'netlify') {
      var body = new URLSearchParams(new FormData(form)).toString();
      status.textContent = 'Отправляем заявку…';
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      })
        .then(function (r) {
          if (!r.ok) throw new Error('bad status');
          status.textContent =
            'Заявка отправлена. Мы свяжемся с вами и пришлём расчёт цены и сроки.';
          form.reset();
        })
        .catch(function () {
          status.textContent =
            'Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.';
        });
    } else {
      status.textContent =
        'Демо-режим: форма заполнена верно, но заявка никуда не отправлена. Подключите отправку в настройках сайта.';
    }
  });
})();
