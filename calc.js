(function () {
  var list = document.getElementById('calc-list');
  if (!list) return;

  /* ---------- Прайс. Чтобы поменять цену, правьте min / max здесь. ----------
     min, max — цена за единицу (₽); open: true — цена «от»;
     step — шаг кнопок «+» и «−» */
  var GROUPS = [
    { title: 'Монтаж плат', items: [
      { id: 'hand',    name: 'Ручной монтаж типовой платы', unit: 'шт',    min: 600,  max: 600,  step: 1,  hint: 'за работу, плата 20–40 компонентов' },
      { id: 'smt_std', name: 'SMT: стандартный компонент',  unit: 'точка', min: 0.48, max: 0.96, step: 10 },
      { id: 'smt_cx',  name: 'SMT: сложный компонент',      unit: 'точка', min: 2.4,  max: 4.8,  step: 10 },
      { id: 'ic_sop',   name: 'Микросхема SOP',    unit: 'чип', min: 120, max: 120, step: 1, open: true },
      { id: 'ic_msop',  name: 'Микросхема MSOP',   unit: 'чип', min: 120, max: 120, step: 1, open: true },
      { id: 'ic_tssop', name: 'Микросхема TSSOP',  unit: 'чип', min: 120, max: 120, step: 1, open: true },
      { id: 'ic_qfn',   name: 'Микросхема QFN',    unit: 'чип', min: 144, max: 180, step: 1, open: true, hint: 'с коэффициентом 1,2–1,5' },
      { id: 'smt_ic',   name: 'Другая микросхема', unit: 'чип', min: 120, max: 120, step: 1, open: true }
    ]},
    { title: 'Металлические корпуса', items: [
      { id: 'case_pcb',  name: 'Плата для корпусного заказа', unit: 'шт', min: 2400, max: 4000, step: 1 },
      { id: 'case_body', name: 'Металлический корпус',        unit: 'шт', min: 4000, max: 9600, step: 1 },
      { id: 'case_asm',  name: 'Сборка корпуса',              unit: 'шт', min: 1200, max: 1920, step: 1 }
    ]},
    { title: 'Кабельные жгуты', items: [
      { id: 'harness', name: 'Вязка жгутов', unit: 'час', min: 750, max: 750, step: 1, hint: 'за работу' }
    ]},
    { title: 'Прототипы', items: [
      { id: 'npi', name: 'NPI: прототип с нуля', unit: 'заказ', min: 16000, max: 16000, step: 1, open: true, hint: 'от ТЗ и Gerber до опытного образца' }
    ]}
  ];
  var RES_MIN = 1.1, RES_MAX = 1.15, QTY_MAX = 1000000;

  var qty = {};
  var els = {};

  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
  function fmtPrice(n) { return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }); }
  function priceText(it) {
    var p = it.min === it.max ? fmtPrice(it.min) : fmtPrice(it.min) + '–' + fmtPrice(it.max);
    return (it.open ? 'от ' : '') + p + ' ₽ за ' + it.unit;
  }
  function range(min, max, open) {
    if (open) return 'от ' + fmt(min) + ' ₽';
    if (Math.round(min) === Math.round(max)) return fmt(min) + ' ₽';
    return fmt(min) + ' – ' + fmt(max) + ' ₽';
  }

  /* ---------- построение интерфейса ---------- */
  GROUPS.forEach(function (g) {
    var sec = document.createElement('div');
    sec.className = 'calc-group';
    var h = document.createElement('h3');
    h.textContent = g.title;
    sec.appendChild(h);

    g.items.forEach(function (it) {
      qty[it.id] = 0;
      var row = document.createElement('div');
      row.className = 'calc-row';
      row.innerHTML =
        '<div class="calc-info"><b></b><span class="hint"></span></div>' +
        '<div class="qty">' +
          '<button type="button" class="qb" data-d="-1" aria-label="Уменьшить">−</button>' +
          '<input type="number" inputmode="numeric" min="0" max="' + QTY_MAX + '" step="1" value="0">' +
          '<button type="button" class="qb" data-d="1" aria-label="Увеличить">+</button>' +
        '</div>' +
        '<div class="line-sum">0 ₽</div>';
      row.querySelector('b').textContent = it.name;
      row.querySelector('.hint').textContent = priceText(it) + (it.hint ? ' · ' + it.hint : '');
      var input = row.querySelector('input');
      input.setAttribute('aria-label', 'Количество: ' + it.name);
      els[it.id] = { row: row, input: input, sum: row.querySelector('.line-sum') };

      row.querySelectorAll('.qb').forEach(function (b) {
        b.addEventListener('click', function () {
          set(it, qty[it.id] + parseInt(b.getAttribute('data-d'), 10) * it.step);
        });
      });
      input.addEventListener('input', function () {
        var v = parseInt(input.value, 10);
        qty[it.id] = isNaN(v) || v < 0 ? 0 : Math.min(v, QTY_MAX);
        update(true);
      });
      input.addEventListener('blur', function () { input.value = qty[it.id]; });
      sec.appendChild(row);
    });
    list.appendChild(sec);
  });

  var optRes = document.getElementById('opt-reserve');
  var totalEl = document.getElementById('calc-total');
  var linesEl = document.getElementById('calc-lines');
  var applyEl = document.getElementById('calc-apply');
  optRes.addEventListener('change', function () { update(); });
  document.getElementById('calc-reset').addEventListener('click', function () {
    Object.keys(qty).forEach(function (k) { qty[k] = 0; });
    optRes.checked = false;
    update();
  });

  function set(it, v) {
    qty[it.id] = Math.max(0, Math.min(QTY_MAX, v));
    update();
  }

  /* ---------- расчёт ---------- */
  function update(typing) {
    var tMin = 0, tMax = 0, anyOpen = false, rows = [], text = [];
    GROUPS.forEach(function (g) {
      g.items.forEach(function (it) {
        var q = qty[it.id], e = els[it.id];
        if (!typing || document.activeElement !== e.input) e.input.value = q;
        var lMin = Math.round(q * it.min);
        var lMax = Math.round(q * it.max);
        e.sum.textContent = q ? range(lMin, lMax, it.open) : '0 ₽';
        e.row.classList.toggle('on', q > 0);
        if (q > 0) {
          tMin += lMin; tMax += lMax;
          if (it.open) anyOpen = true;
          var li = range(lMin, lMax, it.open);
          rows.push({ name: it.name, q: q, unit: it.unit, sum: li });
          text.push('— ' + it.name + ': ' + q + ' ' + it.unit + ' = ' + li);
        }
      });
    });
    if (rows.length && optRes.checked) { tMin = tMin * RES_MIN; tMax = tMax * RES_MAX; }

    var total = rows.length ? range(tMin, tMax, anyOpen) : '0 ₽';
    totalEl.textContent = total;

    linesEl.innerHTML = '';
    if (!rows.length) {
      linesEl.innerHTML = '<li class="empty">Добавьте позиции слева</li>';
    } else {
      rows.forEach(function (r) {
        var li = document.createElement('li');
        var a = document.createElement('span'); a.textContent = r.name + ' × ' + r.q;
        var b = document.createElement('span'); b.textContent = r.sum;
        li.appendChild(a); li.appendChild(b);
        linesEl.appendChild(li);
      });
    }

    var href = 'apply.html';
    if (rows.length) {
      var msg = 'Расчёт с сайта (ориентировочно):\n' + text.join('\n');
      if (optRes.checked) msg += '\nС резервом на доработки 10–15%';
      msg += '\nИтого: ' + total;
      href += '?calc=' + encodeURIComponent(msg);
    }
    applyEl.setAttribute('href', href);
  }

  update();
})();
