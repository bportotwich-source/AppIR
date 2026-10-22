/* @ds-bundle: {"format":4,"namespace":"MeuMEI","components":[{"name":"LimitGauge"},{"name":"AnimatedNumber"},{"name":"MonthBars"},{"name":"SplitBar"},{"name":"ReviewDeck"},{"name":"CountdownRing"},{"name":"ScanDrop"},{"name":"AccumulatedChart"},{"name":"LimitTrack"},{"name":"MonthChart"}]} */
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
      var m0 = polar(cx, cy, r - 9, a), m1 = polar(cx, cy, r + 9, a), lp = polar(cx, cy, r + 21, a);
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

  function useUid(prefix) {
    var R = Rx();
    var ref = R.useRef(null);
    if (ref.current === null) ref.current = prefix + Math.random().toString(36).slice(2, 9);
    return ref.current;
  }

  function cumulate(data) {
    var acc = 0, out = [0], last = 0;
    data.slice(0, 12).forEach(function (d, i) {
      var v = (d.s || 0) + (d.c || 0);
      if (v > 0) last = i + 1;
      acc += v;
      out.push(acc);
    });
    return { points: out.slice(0, last + 1), last: last, total: out[last] || 0 };
  }

  /* AccumulatedChart: faturamento somado mês a mês, contra o limite, com projeção. */
  function AccumulatedChart(p) {
    var R = Rx(), h = R.createElement;
    var data = Array.isArray(p.data) ? p.data : [];
    var limit = Number(p.limit) || 81000;
    var dark = p.tone === 'dark';
    var t = TONS[dark ? 'dark' : 'light'];
    var uid = useUid('mmac');
    var cum = cumulate(data);
    var last = cum.last, total = cum.total;
    var avg = last ? total / last : 0;
    var proj = total + avg * (12 - last);
    var s = R.useState(null), scrub = s[0], setScrub = s[1];
    var W = 350, H = 196, PT = 14, PB = 22, PR = 6;
    var ymax = Math.max(limit * 1.12, proj * 1.05);
    function X(i) { return i / 12 * (W - PR); }
    function Y(v) { return PT + (1 - v / ymax) * (H - PT - PB); }
    var line = cum.points.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    var area = line + ' L' + X(last).toFixed(1) + ' ' + Y(0).toFixed(1) + ' L0 ' + Y(0).toFixed(1) + ' Z';
    var projPath = 'M' + X(last).toFixed(1) + ' ' + Y(total).toFixed(1) + ' L' + X(12).toFixed(1) + ' ' + Y(proj).toFixed(1);
    var lineCol = dark ? '#2dd4bf' : '#0f766e';
    var limCol = dark ? '#fbbf24' : '#b45309';
    var gridCol = dark ? 'rgba(236,241,239,0.10)' : '#eef0ef';
    var len = 0;
    for (var k = 1; k < cum.points.length; k++) {
      var dx = X(k) - X(k - 1), dy = Y(cum.points[k]) - Y(cum.points[k - 1]);
      len += Math.sqrt(dx * dx + dy * dy);
    }
    var sel = scrub == null ? Math.max(1, last) : scrub;
    var selVal = sel <= last ? cum.points[sel] : total + avg * (sel - last);
    var selProj = sel > last;
    function pick(e) {
      var box = e.currentTarget.getBoundingClientRect();
      var i = Math.round((e.clientX - box.left) / box.width * 12);
      setScrub(Math.max(1, Math.min(12, i)));
    }
    var letras = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    var kids = [
      h('defs', { key: 'd' },
        h('linearGradient', { id: uid + 'a', x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: '0', stopColor: lineCol, stopOpacity: dark ? 0.38 : 0.22 }),
          h('stop', { offset: '1', stopColor: lineCol, stopOpacity: 0 }))
      ),
      h('rect', { key: 'zone', x: 0, y: Y(limit), width: W - PR, height: Y(limit * 0.7) - Y(limit), fill: limCol, opacity: dark ? 0.08 : 0.07 }),
      h('line', { key: 'g1', x1: 0, x2: W - PR, y1: Y(limit / 2), y2: Y(limit / 2), stroke: gridCol }),
      h('line', { key: 'g0', x1: 0, x2: W - PR, y1: Y(0), y2: Y(0), stroke: gridCol }),
      h('line', { key: 'lim', x1: 0, x2: W - PR, y1: Y(limit), y2: Y(limit), stroke: limCol, strokeWidth: 1.5, strokeDasharray: '5 4' }),
      h('text', { key: 'liml', x: 2, y: Y(limit) - 6, fontSize: 11, fontWeight: 600, fill: limCol, fontFamily: 'Instrument Sans, system-ui, sans-serif' }, 'Limite R$ ' + fmt(limit, 0)),
      h('path', { key: 'area', className: 'mm-fade', d: area, fill: 'url(#' + uid + 'a)' }),
      h('path', { key: 'proj', d: projPath, fill: 'none', stroke: lineCol, strokeWidth: 2, strokeDasharray: '3 5', strokeLinecap: 'round', opacity: 0.8 }),
      h('circle', { key: 'pe', cx: X(12), cy: Y(proj), r: 4, fill: t.ground, stroke: lineCol, strokeWidth: 2 }),
      h('path', { key: 'line', className: 'mm-draw', d: line, fill: 'none', stroke: lineCol, strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round', style: { '--mm-len': Math.ceil(len), animationDuration: '1.4s' } })
    ];
    letras.forEach(function (l, i) {
      kids.push(h('text', { key: 'm' + i, x: X(i + 0.5), y: H - 6, textAnchor: 'middle', fontSize: 10, fontWeight: i + 1 === sel ? 700 : 500, fill: i + 1 === sel ? t.ink : t.muted, fontFamily: 'Instrument Sans, system-ui, sans-serif' }, l));
    });
    kids.push(h('line', { key: 'sx', x1: X(sel), x2: X(sel), y1: PT, y2: Y(0), stroke: t.muted, strokeWidth: 1, opacity: scrub == null ? 0 : 0.7 }));
    kids.push(h('circle', { key: 'halo', className: scrub == null ? 'mm-pulse' : '', cx: X(sel), cy: Y(selVal), r: 7, fill: lineCol, opacity: 0.45 }));
    kids.push(h('circle', { key: 'dot', cx: X(sel), cy: Y(selVal), r: 6, fill: lineCol, stroke: t.ground, strokeWidth: 3 }));
    kids.push(h('rect', {
      key: 'hit', x: 0, y: 0, width: W, height: H, fill: 'transparent', tabIndex: 0, style: { cursor: 'crosshair', touchAction: 'none' },
      role: 'slider', 'aria-valuemin': 1, 'aria-valuemax': 12, 'aria-valuenow': sel,
      'aria-valuetext': MESES[sel - 1] + ': R$ ' + fmt(selVal, 0) + (selProj ? ', projeção' : ''),
      'aria-label': 'Faturamento acumulado. Use as setas para ver cada mês.',
      onPointerMove: pick, onPointerDown: pick, onPointerLeave: function () { setScrub(null); },
      onKeyDown: function (e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          var cur = scrub == null ? last : scrub;
          setScrub(Math.max(1, Math.min(12, cur + (e.key === 'ArrowRight' ? 1 : -1))));
        }
      }
    }));
    var pct = Math.round(total / limit * 100);
    return h('div', { className: 'mm-accum', style: { display: 'flex', flexDirection: 'column', gap: 10, color: t.ink } },
      h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
          h('span', { style: { fontSize: 11, lineHeight: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted } }, p.label || 'Faturado no ano'),
          h(AnimatedNumber, { value: total, duration: 1400, style: { fontSize: 34, lineHeight: '40px', fontWeight: 500 } })
        ),
        h('span', { style: { padding: '3px 10px', borderRadius: 999, fontSize: 13, lineHeight: '18px', fontWeight: 700, background: dark ? 'rgba(251,191,36,0.14)' : '#fffbeb', color: dark ? '#fde68a' : '#92400e' } }, pct + '% do limite')
      ),
      h('span', { 'aria-live': 'polite', style: { fontSize: 13, lineHeight: '18px', color: t.muted, minHeight: 18 } },
        (selProj ? 'Projeção até ' : 'Até ') + MESES[sel - 1].toLowerCase() + ': ' + 'R$ ' + fmt(selVal, 0) + (selProj ? ' no ritmo atual' : '')
      ),
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'group', 'aria-label': 'Acumulado de R$ ' + fmt(total, 0) + ' até ' + MESES[last - 1] + '; projeção de R$ ' + fmt(proj, 0) + ' em dezembro; limite R$ ' + fmt(limit, 0), style: { display: 'block', overflow: 'visible' } }, kids),
      h('div', { style: { display: 'flex', gap: 16, fontSize: 12, lineHeight: '16px', color: t.muted, flexWrap: 'wrap' } },
        h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, h('i', { 'aria-hidden': 'true', style: { width: 14, height: 3, borderRadius: 2, background: lineCol } }), 'Acumulado'),
        h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, h('i', { 'aria-hidden': 'true', style: { width: 14, height: 0, borderTop: '2px dashed ' + lineCol } }), 'Projeção: R$ ' + fmt(proj, 0)),
        h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, h('i', { 'aria-hidden': 'true', style: { width: 14, height: 8, background: limCol, opacity: 0.35, borderRadius: 2 } }), 'Faixa de atenção')
      )
    );
  }

  /* LimitTrack: o limite do ano como barra de orçamento, um pedaço por mês. */
  function LimitTrack(p) {
    var R = Rx(), h = R.createElement;
    var data = Array.isArray(p.data) ? p.data : [];
    var limit = Number(p.limit) || 81000;
    var dark = p.tone === 'dark';
    var t = TONS[dark ? 'dark' : 'light'];
    var uid = useUid('mmlt');
    var cum = cumulate(data);
    var last = cum.last, total = cum.total;
    var avg = last ? total / last : 0;
    var proj = total + avg * (12 - last);
    var st = R.useState(last - 1), sel = st[0], setSel = st[1];
    var W = 350, TY = 26, TH = 34;
    function X(v) { return Math.min(W, v / limit * W); }
    var servCol = dark ? '#2dd4bf' : '#0d9488', comCol = dark ? '#a5b4fc' : '#6366f1';
    var trackCol = dark ? 'rgba(236,241,239,0.10)' : '#e3e7e5';
    var gapCol = t.ground;
    var segs = [], labels = [], acc = 0;
    data.slice(0, last).forEach(function (d, i) {
      var s0 = d.s || 0, c0 = d.c || 0, x0 = X(acc), xs = X(acc + s0), xc = X(acc + s0 + c0);
      var on = i === sel;
      // Mês sem faturamento não ocupa espaço na barra: sem segmento, rótulo nem alvo.
      if (!(s0 + c0)) return;
      segs.push(h('g', { key: 's' + i, className: 'mm-growx', style: { animationDelay: (i * 70) + 'ms', opacity: on || sel == null ? 1 : 0.55, transition: 'opacity .25s' } },
        h('rect', { x: x0, y: TY, width: Math.max(0, xs - x0), height: TH, fill: servCol }),
        c0 ? h('rect', { x: xs, y: TY, width: Math.max(0, xc - xs), height: TH, fill: comCol }) : null,
        h('rect', { x: xc - 2, y: TY, width: 2, height: TH, fill: gapCol })
      ));
      // Rótulo só quando o segmento tem largura para ele (ou está escolhido).
      if (on || xc - x0 >= 10) labels.push(h('text', { key: 'l' + i, x: (x0 + xc) / 2, y: TY + TH + 16, textAnchor: 'middle', fontSize: 10, fontWeight: on ? 700 : 500, fill: on ? t.ink : t.muted, fontFamily: 'Instrument Sans, system-ui, sans-serif' }, CURTO[i].charAt(0).toUpperCase()));
      segs.push(h('rect', {
        key: 'h' + i, x: x0, y: TY - 6, width: Math.max(8, xc - x0), height: TH + 28, fill: 'transparent', tabIndex: 0, role: 'button', style: { cursor: 'pointer' },
        'aria-label': MESES[i] + ': R$ ' + fmt(s0 + c0), 'aria-pressed': on ? 'true' : 'false',
        onClick: (function (k) { return function () { setSel(k); }; })(i),
        onKeyDown: (function (k) { return function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(k); } }; })(i)
      }));
      acc += s0 + c0;
    });
    var px0 = X(total), px1 = X(proj);
    var marks = [0.7, 0.9].map(function (m, k) {
      return h('g', { key: 'mk' + k },
        h('line', { x1: X(limit * m), x2: X(limit * m), y1: TY - 8, y2: TY + TH + 2, stroke: t.muted, strokeWidth: 1.5 }),
        h('text', { x: X(limit * m), y: TY - 12, textAnchor: 'middle', fontSize: 10, fontWeight: 600, fill: t.muted, fontFamily: 'Instrument Sans, system-ui, sans-serif' }, Math.round(m * 100) + '%')
      );
    });
    var cur = data[sel] || { s: 0, c: 0 };
    var folga = limit - proj;
    function stat(label, value, color, note) {
      return h('div', { style: { flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
        h('span', { style: { fontSize: 11, lineHeight: '14px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.muted } }, label),
        h('span', { className: 'mm-num', style: { fontSize: 16, lineHeight: '22px', fontWeight: 500, color: color } }, 'R$ ' + fmt(value, 0)),
        note ? h('span', { style: { fontSize: 11, lineHeight: '14px', color: t.muted } }, note) : null
      );
    }
    return h('div', { className: 'mm-limittrack', style: { display: 'flex', flexDirection: 'column', gap: 12, color: t.ink } },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
        h('span', { style: { fontSize: 11, lineHeight: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted } }, p.label || 'Faturado no ano'),
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' } },
          h(AnimatedNumber, { value: total, duration: 1400, style: { fontSize: 34, lineHeight: '40px', fontWeight: 500 } }),
          h('span', { style: { fontSize: 14, color: t.muted } }, 'de R$ ' + fmt(limit, 0))
        )
      ),
      h('svg', { viewBox: '0 0 ' + W + ' ' + (TY + TH + 22), width: '100%', role: 'group', 'aria-label': 'Usado R$ ' + fmt(total, 0) + ', projeção R$ ' + fmt(proj, 0) + ', limite R$ ' + fmt(limit, 0), style: { display: 'block', overflow: 'visible' } },
        h('defs', null,
          h('clipPath', { id: uid + 'c' }, h('rect', { x: 0, y: TY, width: W, height: TH, rx: 10 })),
          h('pattern', { id: uid + 'p', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
            h('rect', { width: 7, height: 7, fill: trackCol }),
            h('rect', { width: 3, height: 7, fill: servCol, opacity: 0.55 }))
        ),
        h('g', { clipPath: 'url(#' + uid + 'c)' },
          h('rect', { x: 0, y: TY, width: W, height: TH, fill: trackCol }),
          h('rect', { className: 'mm-fade', x: px0, y: TY, width: Math.max(0, px1 - px0), height: TH, fill: 'url(#' + uid + 'p)', style: { animationDelay: '.8s' } }),
          segs
        ),
        marks,
        labels
      ),
      h('span', { 'aria-live': 'polite', style: { fontSize: 13, lineHeight: '18px', color: t.muted } },
        MESES[sel] ? MESES[sel] + ': R$ ' + fmt((cur.s || 0) + (cur.c || 0), 0) + ' · Serviços ' + fmt(cur.s || 0, 0) + ' · Comércio ' + fmt(cur.c || 0, 0) : ''
      ),
      h('div', { style: { display: 'flex', gap: 12, paddingTop: 12, borderTop: '1px solid ' + trackCol } },
        stat('Usado', total, t.ink, Math.round(total / limit * 100) + '% do limite'),
        stat('Projeção dez', proj, t.ink, 'no ritmo atual'),
        stat('Folga', folga, folga < limit * 0.15 ? (dark ? '#fde68a' : '#92400e') : t.ink, 'se o ritmo seguir')
      )
    );
  }

  function hexToRgb(hx) { return [1, 3, 5].map(function (i) { return parseInt(hx.slice(i, i + 2), 16); }); }
  function mix(a, b, f) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return '#' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * f).toString(16).padStart(2, '0'); }).join('');
  }

  function smoothPath(pts) {
    if (!pts.length) return '';
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  /* MonthChart: o mês a mês em quatro formas (desvio, linha, calor, relógio). */
  function MonthChart(p) {
    var R = Rx(), h = R.createElement;
    var variant = p.variant || 'desvio';
    if (variant === 'capsulas') return h(MonthBars, p);
    var data = (Array.isArray(p.data) ? p.data : []).slice(0, 12);
    while (data.length < 12) data.push({ s: 0, c: 0 });
    var max = Number(p.max) || 9000, avg = Number(p.avg) || 6750;
    var uid = useUid('mmmc');
    var tot = data.map(function (d) { return (d.s || 0) + (d.c || 0); });
    var last = 0;
    tot.forEach(function (v, i) { if (v > 0) last = i; });
    var st = R.useState(p.selected != null ? Number(p.selected) : last), sel = st[0], setSel = st[1];
    var font = 'Instrument Sans, system-ui, sans-serif';
    var ink = '#15201d', muted = '#5b6763', grid = '#e3e7e5';
    var acima = '#b45309', abaixo = '#0d9488';
    function hit(i, extra) {
      return Object.assign({
        key: 'hit' + i, fill: 'transparent', tabIndex: 0, role: 'button', style: { cursor: 'pointer' },
        'aria-label': MESES[i] + ': R$ ' + fmt(tot[i]), 'aria-pressed': i === sel ? 'true' : 'false',
        onClick: function () { setSel(i); },
        onKeyDown: function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(i); }
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setSel(Math.max(0, Math.min(11, sel + (e.key === 'ArrowRight' ? 1 : -1)))); }
        }
      }, extra);
    }
    var cur = data[sel], curT = tot[sel], delta = curT - avg;
    var nota = curT === 0 ? 'Sem extrato ainda'
      : 'R$ ' + fmt(Math.abs(delta), 0) + (delta > 0 ? ' acima' : ' abaixo') + ' da média permitida';
    var header = h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
        h('span', { style: { fontSize: 13, color: muted } }, MESES[sel]),
        curT === 0
          ? h('span', { style: { fontSize: 15, lineHeight: '30px', color: muted } }, 'Sem extrato ainda')
          : h(AnimatedNumber, { value: curT, duration: 500, style: { fontSize: 24, lineHeight: '30px', fontWeight: 500, color: ink } })
      ),
      h('span', { 'aria-live': 'polite', style: { padding: '2px 10px', borderRadius: 999, fontSize: 12, lineHeight: '18px', fontWeight: 600, background: curT === 0 ? '#eef0ef' : (delta > 0 ? '#fffbeb' : '#e6f4f1'), color: curT === 0 ? muted : (delta > 0 ? '#92400e' : '#0b5c56') } }, nota)
    );
    var kids = [], W = 360, svgH, legend = null, extraTop = null;

    if (variant === 'desvio') {
      var H = 170, mid = 85, span = 3000, k = 72 / span, slot = W / 12, bw = 16;
      var nAcima = 0, nAbaixo = 0;
      kids.push(h('line', { key: 'avg', x1: 0, x2: W, y1: mid, y2: mid, stroke: muted, strokeWidth: 1.5 }));
      kids.push(h('text', { key: 'up', x: 0, y: 10, fontSize: 10, fill: muted, fontFamily: font }, '+R$ 3 mil'));
      kids.push(h('text', { key: 'dn', x: 0, y: H - 2, fontSize: 10, fill: muted, fontFamily: font }, '−R$ 3 mil'));
      tot.forEach(function (v, i) {
        var x = i * slot + (slot - bw) / 2, on = i === sel;
        if (v === 0) {
          kids.push(h('circle', { key: 'z' + i, cx: x + bw / 2, cy: mid, r: 3, fill: '#c9d0cd' }));
        } else {
          var dv = v - avg, hh = Math.max(4, Math.min(span, Math.abs(dv)) * k);
          if (dv > 0) nAcima++; else nAbaixo++;
          kids.push(h('rect', {
            key: 'b' + i, className: dv > 0 ? 'mm-grow' : 'mm-growdown', x: x, y: dv > 0 ? mid - hh : mid, width: bw, height: hh, rx: Math.min(bw / 2, hh / 2),
            fill: dv > 0 ? acima : abaixo, style: { animationDelay: (i * 50) + 'ms', opacity: on ? 1 : 0.45, transition: 'opacity .25s' }
          }));
        }
        kids.push(h('text', { key: 'x' + i, x: x + bw / 2, y: H + 18, textAnchor: 'middle', fontSize: 10, fontWeight: on ? 700 : 500, fill: on ? ink : muted, fontFamily: font }, CURTO[i]));
        kids.push(h('rect', hit(i, { x: i * slot, y: 0, width: slot, height: H + 26 })));
      });
      svgH = H + 26;
      extraTop = h('span', { style: { fontSize: 13, lineHeight: '18px', color: muted } }, 'Acima da média permitida em ' + nAcima + (nAcima === 1 ? ' mês' : ' meses') + ', abaixo em ' + nAbaixo + '.');
      legend = [['Acima de R$ 6.750', acima], ['Abaixo, sobra limite', abaixo]];
    }

    if (variant === 'linha') {
      var LH = 160, PT = 18, slotL = W / 12;
      function ly(v) { return PT + (1 - v / max) * (LH - PT); }
      var pts = [];
      tot.forEach(function (v, i) { if (v > 0) pts.push([i * slotL + slotL / 2, ly(v), i]); });
      var path = smoothPath(pts);
      var areaD = pts.length ? path + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + LH + ' L' + pts[0][0].toFixed(1) + ' ' + LH + ' Z' : '';
      var len = 0;
      for (var q = 1; q < pts.length; q++) { len += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]); }
      kids.push(h('defs', { key: 'd' }, h('linearGradient', { id: uid + 'g', x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: '0', stopColor: '#0d9488', stopOpacity: 0.28 }), h('stop', { offset: '1', stopColor: '#0d9488', stopOpacity: 0 }))));
      [3000, 6000, 9000].forEach(function (g) { kids.push(h('line', { key: 'g' + g, x1: 0, x2: W, y1: ly(g), y2: ly(g), stroke: '#eef0ef' })); });
      kids.push(h('line', { key: 'base', x1: 0, x2: W, y1: LH, y2: LH, stroke: grid }));
      kids.push(h('line', { key: 'avg', x1: 0, x2: W, y1: ly(avg), y2: ly(avg), stroke: muted, strokeDasharray: '4 4' }));
      kids.push(h('path', { key: 'area', className: 'mm-fade', d: areaD, fill: 'url(#' + uid + 'g)' }));
      kids.push(h('path', { key: 'line', className: 'mm-draw', d: path, fill: 'none', stroke: '#0f766e', strokeWidth: 2.5, strokeLinecap: 'round', style: { '--mm-len': Math.ceil(len * 1.15), animationDuration: '1.2s' } }));
      if (tot[sel] > 0) kids.push(h('line', { key: 'guide', x1: sel * slotL + slotL / 2, x2: sel * slotL + slotL / 2, y1: PT - 6, y2: LH, stroke: muted, strokeWidth: 1, opacity: 0.5 }));
      pts.forEach(function (pt) {
        var on = pt[2] === sel;
        if (on) kids.push(h('circle', { key: 'h' + pt[2], className: 'mm-pulse', cx: pt[0], cy: pt[1], r: 7, fill: '#0f766e', opacity: 0.45 }));
        kids.push(h('circle', { key: 'p' + pt[2], cx: pt[0], cy: pt[1], r: on ? 6 : 3.5, fill: on ? '#0f766e' : '#ffffff', stroke: '#0f766e', strokeWidth: on ? 3 : 2 }));
      });
      tot.forEach(function (v, i) {
        kids.push(h('text', { key: 'x' + i, x: i * slotL + slotL / 2, y: LH + 18, textAnchor: 'middle', fontSize: 10, fontWeight: i === sel ? 700 : 500, fill: i === sel ? ink : muted, fontFamily: font }, CURTO[i]));
        kids.push(h('rect', hit(i, { x: i * slotL, y: 0, width: slotL, height: LH + 26 })));
      });
      svgH = LH + 26;
      legend = [['Faturamento do mês', '#0f766e'], ['Média permitida (tracejado)', muted]];
    }

    if (variant === 'calor') {
      var gap = 4, cw = (W - gap * 11) / 12, ch = 64;
      var vals = tot.filter(function (v) { return v > 0; });
      var lo = Math.min.apply(null, vals.length ? vals : [0]), hi = Math.max.apply(null, vals.length ? vals : [1]);
      tot.forEach(function (v, i) {
        var x = i * (cw + gap), on = i === sel;
        var f = hi > lo ? (v - lo) / (hi - lo) : 1;
        var g = [];
        if (v === 0) {
          g.push(h('rect', { key: 'e', x: x + 1, y: 13, width: cw - 2, height: ch - 2, rx: 8, fill: 'none', stroke: '#c9d0cd', strokeWidth: 1.5, strokeDasharray: '3 3' }));
        } else {
          g.push(h('rect', { key: 'c', x: x, y: 12, width: cw, height: ch, rx: 8, fill: mix('#c8ebe5', '#0b5c56', f), stroke: on ? ink : 'none', strokeWidth: 2.5 }));
          if (v > avg) g.push(h('circle', { key: 'a', cx: x + cw / 2, cy: 5, r: 3.5, fill: acima }));
        }
        kids.push(h('g', { key: 'm' + i, className: 'mm-rise', style: { animationDelay: (i * 45) + 'ms' } }, g));
        kids.push(h('text', { key: 'x' + i, x: x + cw / 2, y: ch + 30, textAnchor: 'middle', fontSize: 10, fontWeight: on ? 700 : 500, fill: on ? ink : muted, fontFamily: font }, CURTO[i]));
        kids.push(h('rect', hit(i, { x: x, y: 0, width: cw + gap, height: ch + 36 })));
      });
      svgH = ch + 36;
      legend = [['Mais claro: menos · mais escuro: mais', '#0f766e'], ['Ponto: acima da média permitida', acima]];
      extraTop = h('div', { 'aria-hidden': 'true', style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: muted } },
        h('span', { className: 'mm-num' }, fmt(lo, 0)),
        h('i', { style: { flex: '1 1 auto', height: 8, borderRadius: 999, background: 'linear-gradient(90deg,#c8ebe5,#0b5c56)' } }),
        h('span', { className: 'mm-num' }, fmt(hi, 0))
      );
    }

    if (variant === 'relogio') {
      var S = 320, cx = 160, cy = 160, r0 = 50, rmax = 138;
      W = S;
      function rr(v) { return r0 + 6 + Math.min(1, v / max) * (rmax - r0 - 6); }
      kids.push(h('circle', { key: 'avg', cx: cx, cy: cy, r: rr(avg), fill: 'none', stroke: muted, strokeWidth: 1, strokeDasharray: '4 4' }));
      kids.push(h('circle', { key: 'core', cx: cx, cy: cy, r: r0, fill: '#ffffff', stroke: grid }));
      data.forEach(function (d, i) {
        var a = i * 30, on = i === sel, s0 = d.s || 0, c0 = d.c || 0;
        var g = [];
        if (s0 + c0 === 0) {
          var z = polar(cx, cy, r0 + 12, a);
          g.push(h('circle', { key: 'z', cx: z[0], cy: z[1], r: 2.5, fill: '#c9d0cd' }));
        } else {
          var a0 = polar(cx, cy, r0 + 8, a), a1 = polar(cx, cy, rr(s0), a);
          g.push(h('line', { key: 's', x1: a0[0], y1: a0[1], x2: a1[0], y2: a1[1], stroke: '#0d9488', strokeWidth: 14, strokeLinecap: 'round' }));
          if (c0) {
            var b0 = polar(cx, cy, rr(s0) + 17, a), b1 = polar(cx, cy, Math.max(rr(s0) + 17, rr(s0 + c0)), a);
            g.push(h('line', { key: 'c', x1: b0[0], y1: b0[1], x2: b1[0], y2: b1[1], stroke: '#6366f1', strokeWidth: 14, strokeLinecap: 'round' }));
          }
        }
        kids.push(h('g', { key: 'm' + i, className: 'mm-pop', style: { transformOrigin: cx + 'px ' + cy + 'px', animationDelay: (i * 50) + 'ms', opacity: on ? 1 : 0.4, transition: 'opacity .25s' } }, g));
        var lp = polar(cx, cy, 152, a);
        kids.push(h('text', { key: 'x' + i, x: lp[0], y: lp[1] + 4, textAnchor: 'middle', fontSize: 10, fontWeight: on ? 700 : 500, fill: on ? ink : muted, fontFamily: font }, CURTO[i]));
        var w0 = polar(cx, cy, r0, a - 15), w1 = polar(cx, cy, 160, a - 15), w2 = polar(cx, cy, 160, a + 15), w3 = polar(cx, cy, r0, a + 15);
        kids.push(h('path', hit(i, { d: 'M' + w0.join(' ') + ' L' + w1.join(' ') + ' A160 160 0 0 1 ' + w2.join(' ') + ' L' + w3.join(' ') + ' A' + r0 + ' ' + r0 + ' 0 0 0 ' + w0.join(' ') + ' Z' })));
      });
      kids.push(h('text', { key: 'cm', x: cx, y: cy - 6, textAnchor: 'middle', fontSize: 12, fontWeight: 600, fill: muted, fontFamily: font, style: { pointerEvents: 'none' } }, CURTO[sel]));
      kids.push(h('text', { key: 'cv', x: cx, y: cy + 14, textAnchor: 'middle', fontSize: 16, fontWeight: 500, fill: ink, className: 'mm-num', style: { pointerEvents: 'none' } }, curT ? fmt(curT, 0) : '—'));
      svgH = S;
      legend = [['Serviços', '#0d9488'], ['Comércio', '#6366f1'], ['Anel tracejado: média permitida', muted]];
    }

    return h('div', { className: 'mm-monthchart', style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      header,
      extraTop,
      h('svg', { viewBox: '0 0 ' + W + ' ' + svgH, width: variant === 'relogio' ? Math.min(320, W) : '100%', style: { display: 'block', overflow: 'visible', alignSelf: 'center', maxWidth: '100%' } }, kids),
      legend ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12, lineHeight: '16px', color: muted } },
        legend.map(function (l, i) { return h('span', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6 } }, h('i', { 'aria-hidden': 'true', style: { width: 10, height: 10, borderRadius: 999, background: l[1] } }), l[0]); })
      ) : null
    );
  }

  window.MeuMEI = {
    MonthChart: MonthChart,
    AccumulatedChart: AccumulatedChart,
    LimitTrack: LimitTrack,
    LimitGauge: LimitGauge,
    AnimatedNumber: AnimatedNumber,
    MonthBars: MonthBars,
    SplitBar: SplitBar,
    ReviewDeck: ReviewDeck,
    CountdownRing: CountdownRing,
    ScanDrop: ScanDrop
  };
})();
