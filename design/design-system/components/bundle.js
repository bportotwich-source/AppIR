/* @ds-bundle: {"format":4,"namespace":"MeuMEI","components":[{"name":"LimitGauge"},{"name":"AnimatedNumber"},{"name":"MonthBars"},{"name":"SplitBar"},{"name":"ReviewDeck"},{"name":"CountdownRing"},{"name":"ScanDrop"}]} */
(function () {
  'use strict';

  function Rx() { return window.React; }

  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  var TONS = {
    light: { ink: '#15201d', muted: '#5b6763', track: '#e3e7e5', tick: '#d5dbd8', ok: '#0f766e', warn: '#b45309', danger: '#b91c1c', ground: '#ffffff' },
    dark: { ink: '#ecf1ef', muted: '#a3b5b0', track: 'rgba(236,241,239,0.14)', tick: 'rgba(236,241,239,0.22)', ok: '#2dd4bf', warn: '#fbbf24', danger: '#f87171', ground: '#0c2a27' }
  };

  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  function fmt(v, dec) {
    var d = dec == null ? 2 : dec;
    return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function useTween(target, duration) {
    var R = Rx();
    var still = reduced();
    var s = R.useState(still ? target : 0), val = s[0], setVal = s[1];
    var cur = R.useRef(still ? target : 0);
    R.useEffect(function () {
      if (reduced()) { cur.current = target; setVal(target); return undefined; }
      var a = cur.current, start = null, raf = 0;
      function step(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / (duration || 900));
        var e = 1 - Math.pow(1 - p, 3);
        var v = a + (target - a) * e;
        cur.current = v;
        setVal(v);
        if (p < 1) raf = window.requestAnimationFrame(step);
      }
      raf = window.requestAnimationFrame(step);
      return function () { window.cancelAnimationFrame(raf); };
    }, [target, duration]);
    return val;
  }

  function polar(cx, cy, r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function arcPath(cx, cy, r, a0, a1) {
    var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
    var large = (a1 - a0) > 180 ? 1 : 0;
    return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
  }

  /* AnimatedNumber: conta até o valor, formatado em pt-BR. */
  function AnimatedNumber(p) {
    var R = Rx(), h = R.createElement;
    var v = useTween(Number(p.value) || 0, p.duration || 900);
    var pre = p.prefix == null ? 'R$ ' : p.prefix;
    var suf = p.suffix || '';
    return h('span', { className: 'mm-num' + (p.className ? ' ' + p.className : ''), style: p.style }, pre + fmt(v, p.decimals) + suf);
  }

  /* LimitGauge: arco de 240 graus do faturamento contra o limite anual. */
  function LimitGauge(p) {
    var R = Rx(), h = R.createElement;
    var size = Number(p.size) || 280;
    var limit = Number(p.limit) || 81000;
    var value = Number(p.value) || 0;
    var warnAt = p.warnAt == null ? 0.7 : Number(p.warnAt);
    var dangerAt = p.dangerAt == null ? 0.9 : Number(p.dangerAt);
    var t = TONS[p.tone === 'dark' ? 'dark' : 'light'];
    var target = value / limit;
    var pct = useTween(Math.min(1, target), 1500);
    var cx = size / 2, cy = size / 2, r = size / 2 - 20, A0 = -120, SW = 240;
    var len = 2 * Math.PI * r * SW / 360;
    var col = target >= dangerAt ? t.danger : (target >= warnAt ? t.warn : t.ok);
    var hgt = Math.round(size * 0.8);
    var kids = [];
    kids.push(h('path', { key: 'track', d: arcPath(cx, cy, r, A0, A0 + SW), fill: 'none', stroke: t.track, strokeWidth: 14, strokeLinecap: 'round' }));
    kids.push(h('path', { key: 'bar', d: arcPath(cx, cy, r, A0, A0 + SW), fill: 'none', stroke: col, strokeWidth: 14, strokeLinecap: 'round', strokeDasharray: len.toFixed(2), strokeDashoffset: (len * (1 - pct)).toFixed(2) }));
    for (var i = 0; i <= 48; i++) {
      var f = i / 48, a = A0 + SW * f, major = i % 6 === 0;
      var q0 = polar(cx, cy, r - 15, a), q1 = polar(cx, cy, r - (major ? 25 : 20), a);
      kids.push(h('line', { key: 't' + i, x1: q0[0], y1: q0[1], x2: q1[0], y2: q1[1], stroke: f <= pct ? col : t.tick, strokeWidth: major ? 2 : 1.2, strokeLinecap: 'round' }));
    }
    [warnAt, dangerAt].forEach(function (m, k) {
      var a = A0 + SW * m;
      var m0 = polar(cx, cy, r - 9, a), m1 = polar(cx, cy, r + 9, a), lp = polar(cx, cy, r - 38, a);
      kids.push(h('line', { key: 'm' + k, x1: m0[0], y1: m0[1], x2: m1[0], y2: m1[1], stroke: t.ground, strokeWidth: 3 }));
      kids.push(h('text', { key: 'l' + k, x: lp[0], y: lp[1] + 4, textAnchor: 'middle', fontSize: 10, fontWeight: 600, fill: t.muted, fontFamily: 'Instrument Sans, system-ui, sans-serif' }, Math.round(m * 100) + '%'));
    });
    var end = polar(cx, cy, r, A0 + SW * pct);
    kids.push(h('circle', { key: 'halo', className: 'mm-pulse', cx: end[0], cy: end[1], r: 10, fill: col, opacity: 0.5 }));
    kids.push(h('circle', { key: 'knob', cx: end[0], cy: end[1], r: 9, fill: col, stroke: t.ground, strokeWidth: 3 }));
    var label = p.label || 'Faturado no ano';
    return h('div', {
      className: 'mm-gauge',
      role: 'img',
      'aria-label': label + ': R$ ' + fmt(value) + ', ' + Math.round(target * 100) + '% do limite de R$ ' + fmt(limit, 0),
      style: { position: 'relative', width: size, height: hgt, color: t.ink }
    },
      h('svg', { width: size, height: hgt, viewBox: '0 0 ' + size + ' ' + hgt, 'aria-hidden': 'true', style: { display: 'block', overflow: 'visible' } }, kids),
      h('div', { style: { position: 'absolute', left: 0, right: 0, top: Math.round(size * 0.3), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' } },
        h('span', { style: { fontSize: 11, lineHeight: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted } }, label),
        h(AnimatedNumber, { value: value, duration: 1500, style: { fontSize: Math.round(size * 0.105), lineHeight: 1.1, fontWeight: 500, color: t.ink } }),
        h('span', { style: { fontSize: 13, lineHeight: '18px', color: t.muted } }, Math.round(target * 100) + '% de R$ ' + fmt(limit, 0))
      )
    );
  }

  /* MonthBars: cápsulas empilhadas por mês, com toque para escolher o mês. */
  function MonthBars(p) {
    var R = Rx(), h = R.createElement;
    var data = Array.isArray(p.data) ? p.data : [];
    var max = Number(p.max) || 9000, avg = Number(p.avg) || 6750;
    var last = 0;
    data.forEach(function (d, i) { if ((d.s || 0) + (d.c || 0) > 0) last = i; });
    var st = R.useState(p.selected != null ? Number(p.selected) : last), sel = st[0], setSel = st[1];
    var W = 360, H = 150, TOP = 10, slot = W / 12, bw = 14, gap = 3;
    var kids = [];
    var ay = H - avg / max * (H - TOP);
    for (var g = 1; g <= 3; g++) {
      var gy = H - (g / 3) * (H - TOP);
      kids.push(h('line', { key: 'g' + g, x1: 0, x2: W, y1: gy, y2: gy, stroke: '#eef0ef', strokeWidth: 1 }));
    }
    kids.push(h('line', { key: 'avg', x1: 0, x2: W, y1: ay, y2: ay, stroke: '#5b6763', strokeWidth: 1, strokeDasharray: '4 4' }));
    data.slice(0, 12).forEach(function (d, i) {
      var s = d.s || 0, c = d.c || 0, x = i * slot + (slot - bw) / 2;
      var hs = s / max * (H - TOP), hc = c / max * (H - TOP);
      var on = i === sel;
      var parts = [];
      if (s + c === 0) {
        parts.push(h('circle', { key: 'z', cx: x + bw / 2, cy: H - 3, r: 2.5, fill: '#c9d0cd' }));
      } else {
        if (s > 0) parts.push(h('rect', { key: 's', x: x, y: H - hs, width: bw, height: hs, rx: Math.min(bw / 2, hs / 2), fill: '#0d9488' }));
        if (c > 0) parts.push(h('rect', { key: 'c', x: x, y: H - hs - gap - hc, width: bw, height: Math.max(2, hc), rx: Math.min(bw / 2, hc / 2), fill: '#6366f1' }));
      }
      kids.push(h('g', { key: 'b' + i, className: 'mm-grow', style: { animationDelay: (i * 55) + 'ms', opacity: on ? 1 : 0.38, transition: 'opacity .25s' } }, parts));
      kids.push(h('text', { key: 'x' + i, x: x + bw / 2, y: H + 18, textAnchor: 'middle', fontSize: 10, fontWeight: on ? 700 : 500, fill: on ? '#15201d' : '#5b6763', fontFamily: 'Instrument Sans, system-ui, sans-serif' }, CURTO[i]));
      kids.push(h('rect', {
        key: 'hit' + i, x: i * slot, y: 0, width: slot, height: H + 26, fill: 'transparent', tabIndex: 0, role: 'button', style: { cursor: 'pointer' },
        'aria-label': MESES[i] + ': R$ ' + fmt(s + c), 'aria-pressed': on ? 'true' : 'false',
        onClick: (function (k) { return function () { setSel(k); }; })(i),
        onKeyDown: (function (k) { return function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(k); } }; })(i)
      }));
    });
    var cur = data[sel] || { s: 0, c: 0 };
    var vazio = (cur.s || 0) + (cur.c || 0) === 0;
    return h('div', { className: 'mm-monthbars', style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
          h('span', { style: { fontSize: 13, color: '#5b6763' } }, MESES[sel] || ''),
          vazio
            ? h('span', { style: { fontSize: 15, lineHeight: '30px', color: '#5b6763' } }, 'Sem extrato ainda')
            : h(AnimatedNumber, { value: (cur.s || 0) + (cur.c || 0), duration: 500, style: { fontSize: 24, lineHeight: '30px', fontWeight: 500, color: '#15201d' } })
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, lineHeight: '16px', color: '#15201d' } },
          h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, h('i', { 'aria-hidden': 'true', style: { width: 8, height: 8, borderRadius: 999, background: '#0d9488' } }), 'Serviços ', h('b', { className: 'mm-num', style: { fontWeight: 500 } }, fmt(cur.s || 0, 0))),
          h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, h('i', { 'aria-hidden': 'true', style: { width: 8, height: 8, borderRadius: 999, background: '#6366f1' } }), 'Comércio ', h('b', { className: 'mm-num', style: { fontWeight: 500 } }, fmt(cur.c || 0, 0)))
        )
      ),
      h('svg', { viewBox: '0 0 ' + W + ' ' + (H + 26), width: '100%', style: { display: 'block', overflow: 'visible' } }, kids),
      h('span', { style: { fontSize: 12, lineHeight: '16px', color: '#5b6763' } }, 'Tracejado: média permitida de R$ 6.750 por mês. Toque num mês para ver o valor.')
    );
  }

  /* SplitBar: uma barra dividida entre categorias, com legenda escrita. */
  function SplitBar(p) {
    var R = Rx(), h = R.createElement;
    var items = Array.isArray(p.items) ? p.items : [];
    var total = items.reduce(function (a, b) { return a + (Number(b.value) || 0); }, 0) || 1;
    var st = R.useState(reduced()), on = st[0], setOn = st[1];
    R.useEffect(function () { var id = window.requestAnimationFrame(function () { setOn(true); }); return function () { window.cancelAnimationFrame(id); }; }, []);
    return h('div', { className: 'mm-split', style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      h('div', { role: 'img', 'aria-label': items.map(function (it) { return it.label + ' ' + Math.round(it.value / total * 100) + '%'; }).join(', '), style: { display: 'flex', gap: 4, height: 14 } },
        items.map(function (it, i) {
          var w = (Number(it.value) || 0) / total * 100;
          return h('div', { key: i, style: { width: (on ? w : 0) + '%', minWidth: on ? 8 : 0, borderRadius: 999, background: it.color || '#0d9488', transition: 'width 1.1s cubic-bezier(.2,.8,.2,1) ' + (i * 120) + 'ms' } });
        })
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        items.map(function (it, i) {
          return h('div', { key: i, style: { display: 'flex', alignItems: 'baseline', gap: 10 } },
            h('i', { 'aria-hidden': 'true', style: { flex: 'none', width: 10, height: 10, borderRadius: 999, background: it.color || '#0d9488', alignSelf: 'center' } }),
            h('span', { style: { flex: '1 1 auto', fontSize: 15, color: '#15201d' } }, it.label),
            h(AnimatedNumber, { value: it.value, duration: 1100, style: { fontSize: 15, fontWeight: 500, color: '#15201d' } }),
            h('span', { style: { width: 40, textAlign: 'right', fontSize: 13, color: '#5b6763' } }, Math.round(it.value / total * 100) + '%')
          );
        })
      )
    );
  }

  function btn(bg) {
    return { minHeight: 52, border: 'none', borderRadius: 14, background: bg, color: '#ffffff', font: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
  }

  /* ReviewDeck: pilha de entradas novas, uma decisão por vez. */
  function ReviewDeck(p) {
    var R = Rx(), h = R.createElement;
    var entries = Array.isArray(p.entries) ? p.entries : [];
    var s1 = R.useState(0), idx = s1[0], setIdx = s1[1];
    var s2 = R.useState(null), leaving = s2[0], setLeaving = s2[1];
    var hist = R.useRef([]);
    var done = idx >= entries.length;

    function decide(choice) {
      if (leaving || done) return;
      var e = entries[idx], at = idx;
      setLeaving({ dir: choice === 'fora' ? -1 : 1 });
      window.setTimeout(function () {
        hist.current.push({ entry: e, choice: choice });
        setLeaving(null);
        setIdx(at + 1);
        if (typeof p.onDecide === 'function') p.onDecide({ entry: e, choice: choice, index: at });
      }, reduced() ? 0 : 320);
    }
    function undo() {
      if (!hist.current.length || leaving) return;
      var last = hist.current.pop();
      setIdx(function (i) { return Math.max(0, i - 1); });
      if (typeof p.onUndo === 'function') p.onUndo(last);
    }
    var linkBtn = { alignSelf: 'center', minHeight: 44, padding: '0 16px', border: 'none', background: 'transparent', color: '#0f766e', font: 'inherit', fontWeight: 600, cursor: 'pointer' };

    var dots = entries.map(function (e, i) {
      return h('i', { key: i, 'aria-hidden': 'true', style: { height: 6, width: i === idx ? 22 : 6, borderRadius: 999, background: i < idx ? '#0f766e' : (i === idx ? '#15201d' : '#c9d0cd'), transition: 'all .3s' } });
    });
    var head = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
      h('div', { style: { display: 'flex', gap: 5, alignItems: 'center' } }, dots),
      h('span', { 'aria-live': 'polite', style: { fontSize: 13, color: '#5b6763' } }, done ? 'Concluído' : (idx + 1) + ' de ' + entries.length)
    );

    var body;
    if (done) {
      body = h('div', { className: 'mm-rise', style: { height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' } },
        h('svg', { width: 96, height: 96, viewBox: '0 0 96 96', 'aria-hidden': 'true' },
          h('circle', { cx: 48, cy: 48, r: 44, fill: '#e6f4f1' }),
          h('circle', { className: 'mm-draw', cx: 48, cy: 48, r: 44, fill: 'none', stroke: '#0f766e', strokeWidth: 4, style: { '--mm-len': 277 }, transform: 'rotate(-90 48 48)' }),
          h('path', { className: 'mm-draw', d: 'M30 49 L43 61 L67 36', fill: 'none', stroke: '#0f766e', strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round', style: { '--mm-len': 60, animationDelay: '.35s' } })
        ),
        h('strong', { style: { fontSize: 22, lineHeight: '28px', color: '#15201d' } }, p.doneTitle || 'Tudo revisado'),
        h('span', { style: { fontSize: 15, color: '#5b6763', maxWidth: 280 } }, p.doneText || 'As próximas entradas desses pagadores serão marcadas sozinhas.'),
        hist.current.length ? h('button', { type: 'button', onClick: undo, style: linkBtn }, 'Desfazer a última') : null
      );
    } else {
      var cards = [];
      for (var j = Math.min(2, entries.length - idx - 1); j >= 0; j--) {
        var e = entries[idx + j];
        var top = j === 0;
        var tr = 'translateY(' + (j * 14) + 'px) scale(' + (1 - j * 0.05) + ')';
        if (top && leaving) tr = 'translateX(' + (leaving.dir * 130) + '%) rotate(' + (leaving.dir * 14) + 'deg)';
        cards.push(h('div', {
          key: e.id != null ? e.id : idx + j,
          style: { position: 'absolute', left: 0, right: 0, top: 0, height: 360, transform: tr, transformOrigin: '50% 100%', opacity: top && leaving ? 0 : (1 - j * 0.18), transition: 'transform .32s cubic-bezier(.3,.7,.2,1), opacity .32s', zIndex: 10 - j, filter: 'drop-shadow(0 10px 24px rgba(12,42,39,0.14))' }
        },
          h('div', { className: 'mm-ticket', style: { height: '100%', boxSizing: 'border-box', borderRadius: 28, background: j === 0 ? '#ffffff' : (j === 1 ? '#f1f4f3' : '#e7ecea'), padding: '22px 22px 20px', display: 'flex', flexDirection: 'column' } },
            top ? [
              h('div', { key: 'a', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('span', { style: { fontSize: 13, color: '#5b6763' } }, e.date),
                h('span', { style: { padding: '1px 9px', borderRadius: 999, background: '#fffbeb', border: '1px solid #f3d27a', color: '#92400e', fontSize: 12, lineHeight: '18px', fontWeight: 600 } }, 'Novo pagador')
              ),
              h('span', { key: 'b', className: 'mm-num', style: { marginTop: 18, fontSize: 40, lineHeight: '46px', fontWeight: 500, color: '#15201d' } }, 'R$ ' + fmt(e.value)),
              h('span', { key: 'c', style: { marginTop: 6, fontSize: 18, lineHeight: '24px', fontWeight: 600, color: '#15201d' } }, e.payer),
              h('span', { key: 'd', style: { fontSize: 14, color: '#5b6763' } }, e.description),
              h('div', { key: 'e', 'aria-hidden': 'true', style: { margin: 'auto -22px 0', borderTop: '2px dashed #e3e7e5' } }),
              h('span', { key: 'f', style: { marginTop: 16, fontSize: 15, fontWeight: 600, color: '#15201d' } }, 'Isso é faturamento?'),
              h('div', { key: 'g', style: { marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 } },
                h('button', { type: 'button', onClick: function () { decide('servicos'); }, style: btn('#0f766e') }, 'Serviços'),
                h('button', { type: 'button', onClick: function () { decide('comercio'); }, style: btn('#4f46e5') }, 'Comércio')
              ),
              h('button', { key: 'h', type: 'button', onClick: function () { decide('fora'); }, style: { marginTop: 8, minHeight: 44, border: 'none', borderRadius: 14, background: '#f1f4f3', color: '#15201d', font: 'inherit', fontWeight: 600, cursor: 'pointer' } }, 'Não é faturamento')
            ] : null
          )
        ));
      }
      body = h('div', { style: { position: 'relative', height: 400 } }, cards);
    }

    return h('div', { className: 'mm-deck', style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      head,
      body,
      !done && hist.current.length ? h('button', { type: 'button', onClick: undo, style: linkBtn }, 'Desfazer a última') : null
    );
  }

  /* CountdownRing: anel com um número no centro (dias até um prazo). */
  function CountdownRing(p) {
    var R = Rx(), h = R.createElement;
    var size = Number(p.size) || 132, value = Number(p.value) || 0, max = Number(p.max) || 365;
    var t = TONS[p.tone === 'dark' ? 'dark' : 'light'];
    var f = useTween(Math.max(0, Math.min(1, value / max)), 1300);
    var r = size / 2 - 9, c = 2 * Math.PI * r;
    return h('div', { role: 'img', 'aria-label': value + ' ' + (p.label || 'dias') + (p.sub ? ', ' + p.sub : ''), style: { position: 'relative', width: size, height: size, flex: 'none' } },
      h('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, 'aria-hidden': 'true', style: { display: 'block' } },
        h('circle', { cx: size / 2, cy: size / 2, r: r, fill: 'none', stroke: t.track, strokeWidth: 10 }),
        h('circle', { cx: size / 2, cy: size / 2, r: r, fill: 'none', stroke: p.color || t.ok, strokeWidth: 10, strokeLinecap: 'round', strokeDasharray: c.toFixed(2), strokeDashoffset: (c * (1 - f)).toFixed(2), transform: 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')' })
      ),
      h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.ink } },
        h(AnimatedNumber, { value: value, prefix: '', decimals: 0, duration: 1300, style: { fontSize: Math.round(size * 0.27), lineHeight: 1, fontWeight: 500 } }),
        h('span', { style: { marginTop: 4, fontSize: 12, lineHeight: '14px', color: t.muted } }, p.label || 'dias')
      )
    );
  }

  /* ScanDrop: área de envio do PDF com leitura animada. */
  function ScanDrop(p) {
    var R = Rx(), h = R.createElement;
    var size = Number(p.size) || 260;
    var s = R.useState(p.state || 'idle'), state = s[0], setState = s[1];
    var timer = R.useRef(0);
    R.useEffect(function () { return function () { window.clearTimeout(timer.current); }; }, []);
    function start() {
      if (state === 'reading') return;
      setState('reading');
      timer.current = window.setTimeout(function () {
        setState('done');
        if (typeof p.onDone === 'function') p.onDone({ fileName: p.fileName });
      }, reduced() ? 300 : 2400);
    }
    var file = p.fileName || 'extrato.pdf';
    var cap = state === 'idle' ? ['Toque para escolher o PDF', 'ou arraste o arquivo do e-mail para cá']
      : state === 'reading' ? ['Lendo ' + file, 'Procurando data, descrição e valor de cada linha']
      : [p.doneText || 'Extrato lido', 'Toque para importar outro mês'];
    var ring = Math.round(2 * Math.PI * 118);
    var kids = [
      h('circle', { key: 'bg', cx: 130, cy: 130, r: 100, fill: '#e6f4f1' }),
      state === 'idle'
        ? h('circle', { key: 'ring', className: 'mm-spin', cx: 130, cy: 130, r: 118, fill: 'none', stroke: '#0f766e', strokeWidth: 2.5, strokeDasharray: '6 10', strokeLinecap: 'round' })
        : h('circle', { key: 'ring2', className: state === 'reading' ? 'mm-draw-slow' : '', cx: 130, cy: 130, r: 118, fill: 'none', stroke: state === 'done' ? '#15803d' : '#0f766e', strokeWidth: 4, strokeLinecap: 'round', style: { '--mm-len': ring }, strokeDasharray: ring, transform: 'rotate(-90 130 130)' }),
      h('g', { key: 'doc' },
        h('path', { d: 'M96 72 h50 l22 22 v76 a8 8 0 0 1 -8 8 h-64 a8 8 0 0 1 -8 -8 v-90 a8 8 0 0 1 8 -8 z', fill: '#ffffff', stroke: '#15201d', strokeWidth: 2 }),
        h('path', { d: 'M146 72 v14 a8 8 0 0 0 8 8 h14', fill: 'none', stroke: '#15201d', strokeWidth: 2 }),
        h('rect', { x: 102, y: 104, width: 44, height: 5, rx: 2.5, fill: '#c9d0cd' }),
        h('rect', { x: 102, y: 116, width: 56, height: 5, rx: 2.5, fill: '#c9d0cd' }),
        h('rect', { x: 102, y: 128, width: 36, height: 5, rx: 2.5, fill: '#c9d0cd' }),
        h('rect', { x: 102, y: 140, width: 50, height: 5, rx: 2.5, fill: '#c9d0cd' }),
        h('rect', { x: 102, y: 158, width: 30, height: 14, rx: 4, fill: '#0f766e' }),
        h('text', { x: 117, y: 168.5, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: '#ffffff', fontFamily: 'Instrument Sans, system-ui, sans-serif' }, 'PDF')
      )
    ];
    if (state === 'reading') {
      kids.push(h('defs', { key: 'defs' }, h('linearGradient', { id: 'mm-beam', x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: '0', stopColor: '#2dd4bf', stopOpacity: 0 }), h('stop', { offset: '1', stopColor: '#0f766e', stopOpacity: 0.55 }))));
      kids.push(h('g', { key: 'beam', className: 'mm-scan' }, h('rect', { x: 84, y: 66, width: 92, height: 22, fill: 'url(#mm-beam)' }), h('rect', { x: 84, y: 87, width: 92, height: 2.5, rx: 1.25, fill: '#0f766e' })));
    }
    if (state === 'done') {
      kids.push(h('g', { key: 'ok', className: 'mm-rise' }, h('circle', { cx: 168, cy: 166, r: 20, fill: '#15803d', stroke: '#ffffff', strokeWidth: 4 }), h('path', { className: 'mm-draw', d: 'M159 166 l6 6 l12 -13', fill: 'none', stroke: '#ffffff', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round', style: { '--mm-len': 30 } })));
    }
    return h('button', {
      type: 'button', onClick: start, 'aria-label': cap[0] + '. ' + cap[1],
      style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', padding: '8px 0', border: 'none', background: 'transparent', font: 'inherit', color: '#15201d', cursor: 'pointer' }
    },
      h('svg', { width: size, height: size, viewBox: '0 0 260 260', 'aria-hidden': 'true', style: { display: 'block', overflow: 'visible' } }, kids),
      h('span', { 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' } },
        h('strong', { style: { fontSize: 17, lineHeight: '24px' } }, cap[0]),
        h('span', { style: { fontSize: 14, color: '#5b6763' } }, cap[1])
      )
    );
  }

  window.MeuMEI = {
    LimitGauge: LimitGauge,
    AnimatedNumber: AnimatedNumber,
    MonthBars: MonthBars,
    SplitBar: SplitBar,
    ReviewDeck: ReviewDeck,
    CountdownRing: CountdownRing,
    ScanDrop: ScanDrop
  };
})();
