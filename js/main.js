/* ===================== JavaScript · Autores: Dayana Ruth, Kevin ===================== */
(function () {
  'use strict';

  const COLORS = ['#d7ff3a', '#ff5b2e', '#4cc9f0', '#c77dff', '#ffd23f', '#06d6a0'];
  const TEAM_NAMES = ['Relámpagos', 'Volcanes', 'Tsunamis', 'Cóndores', 'Rayos', 'Jaguares'];
  const $ = (s) => document.querySelector(s);

  // Estado de la aplicación
  const state = { players: [], teams: [], rounds: [] };

  // ---------- Persistencia (opcional, segura) ----------
  function save() {
    try { localStorage.setItem('raquetmatch', JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem('raquetmatch'));
      if (d && Array.isArray(d.players)) Object.assign(state, d);
    } catch (e) { /* ignorar */ }
  }

  // ---------- Utilidades ----------
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  let toastTimer;
  function toast(msg, warn) {
    const t = $('#toast');
    t.classList.toggle('warn', !!warn);
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function animateNumber(el, to) {
    const from = parseInt(el.textContent, 10) || 0;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / 500, 1);
      el.textContent = Math.round(from + (to - from) * p);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- Jugadores ----------
  function renderPlayers() {
    const list = $('#playerList');
    const n = state.players.length;
    $('#countBadge').textContent = n + (n === 1 ? ' jugador' : ' jugadores');
    if (!n) {
      list.innerHTML = '<li class="empty" style="grid-column:1/-1">Aún no hay jugadores. ¡Inscribe al primero!</li>';
    } else {
      list.innerHTML = state.players.map((p, i) => `
        <li class="player">
          <span class="avatar" style="background:${COLORS[i % COLORS.length]}">${esc(initials(p.name))}</span>
          <div class="info">
            <div class="name" title="${esc(p.name)}">${esc(p.name)}</div>
            <div class="dots" aria-label="Nivel ${p.level} de 5">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= p.level ? 'on' : ''}"></i>`).join('')}</div>
          </div>
          <button class="del" data-id="${p.id}" aria-label="Eliminar a ${esc(p.name)}">×</button>
        </li>`).join('');
    }
    updateStats();
  }

  function addPlayer(name, level) {
    state.players.push({ id: uid(), name: name, level: level });
    save();
    renderPlayers();
  }

  // ---------- Algoritmo de balanceo (reparto serpiente) ----------
  function makeTeams(k) {
    const sorted = [...state.players]
      .map((p) => ({ ...p, r: Math.random() }))
      .sort((a, b) => b.level - a.level || a.r - b.r);
    const teams = Array.from({ length: k }, (_, i) => ({ id: i, name: TEAM_NAMES[i], color: COLORS[i], players: [] }));
    sorted.forEach((p, idx) => {
      const round = Math.floor(idx / k);
      const pos = idx % k;
      const t = round % 2 === 0 ? pos : k - 1 - pos;
      teams[t].players.push(p);
    });
    return teams;
  }

  const teamPower = (t) => t.players.reduce((s, p) => s + p.level, 0);

  function renderTeams() {
    const box = $('#teamsBox');
    if (!state.teams.length) {
      box.innerHTML = '<div class="empty">Agrega al menos 4 jugadores y presiona <b>Armar equipos</b>.</div>';
      return;
    }
    const powers = state.teams.map(teamPower);
    const max = Math.max(...powers), min = Math.min(...powers);
    const balance = max ? Math.round((min / max) * 100) : 100;
    box.innerHTML = `
      <div class="teams">${state.teams.map((t, i) => `
        <article class="team" style="animation-delay:${i * 90}ms">
          <header style="background:${t.color}"><h3>${esc(t.name)}</h3><span title="Fuerza total del equipo"><svg class="ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg> ${teamPower(t)}</span></header>
          <ul>${t.players.map((p) => `<li>${esc(p.name)} <em>Nv. ${p.level}</em></li>`).join('')}</ul>
        </article>`).join('')}
      </div>
      <div class="balance">
        <strong>Equilibrio</strong>
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${balance}" aria-label="Equilibrio entre equipos"><i style="width:0"></i></div>
        <strong style="color:var(--lime)">${balance}%</strong>
      </div>`;
    requestAnimationFrame(() => { const m = box.querySelector('.meter i'); if (m) m.style.width = balance + '%'; });
  }

  // ---------- Fixture: método de rotación circular ----------
  function makeFixture(teams) {
    const ids = teams.map((t) => t.id);
    if (ids.length % 2) ids.push(null); // descanso
    const n = ids.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const matches = [];
      for (let i = 0; i < n / 2; i++) {
        const a = ids[i], b = ids[n - 1 - i];
        matches.push({ a: a, b: b, sa: '', sb: '' });
      }
      rounds.push(matches);
      ids.splice(1, 0, ids.pop()); // rotar dejando fijo el primero
    }
    return rounds;
  }

  const teamById = (id) => state.teams.find((t) => t.id === id);

  function renderFixture() {
    const box = $('#fixtureBox');
    if (!state.rounds.length) {
      box.innerHTML = '<div class="empty" style="grid-column:1/-1">El fixture aparecerá cuando armes los equipos.</div>';
      return;
    }
    box.innerHTML = state.rounds.map((matches, r) => `
      <div class="card round">
        <h3>Fecha ${r + 1}</h3>
        ${matches.map((m, i) => {
          if (m.a === null || m.b === null) {
            const t = teamById(m.a === null ? m.b : m.a);
            return `<p class="bye"><svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg> ${esc(t.name)} descansa</p>`;
          }
          const A = teamById(m.a), B = teamById(m.b);
          const played = m.sa !== '' && m.sb !== '';
          const wa = played && +m.sa > +m.sb, wb = played && +m.sb > +m.sa;
          return `<div class="match">
            <span class="t ${wa ? 'win' : ''}"><i style="background:${A.color}"></i>${esc(A.name)}</span>
            <span class="score">
              <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" value="${m.sa}" data-r="${r}" data-i="${i}" data-s="sa" aria-label="Sets de ${esc(A.name)}">
              <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" value="${m.sb}" data-r="${r}" data-i="${i}" data-s="sb" aria-label="Sets de ${esc(B.name)}">
            </span>
            <span class="t r ${wb ? 'win' : ''}">${esc(B.name)}<i style="background:${B.color}"></i></span>
          </div>`;
        }).join('')}
      </div>`).join('');
  }

  // ---------- Tabla de posiciones ----------
  function renderTable() {
    const body = $('#tableBody');
    const champ = $('#champion');
    if (!state.teams.length) {
      body.innerHTML = '<tr><td colspan="7" style="color:var(--muted);padding:30px">Sin datos todavía.</td></tr>';
      champ.classList.remove('show');
      return;
    }
    const st = {};
    state.teams.forEach((t) => { st[t.id] = { t: t, pj: 0, pg: 0, pp: 0, ds: 0, pts: 0 }; });
    let total = 0, done = 0;
    state.rounds.flat().forEach((m) => {
      if (m.a === null || m.b === null) return;
      total++;
      if (m.sa === '' || m.sb === '' || +m.sa === +m.sb) return;
      done++;
      const A = st[m.a], B = st[m.b], a = +m.sa, b = +m.sb;
      A.pj++; B.pj++; A.ds += a - b; B.ds += b - a;
      if (a > b) { A.pg++; B.pp++; A.pts += 3; } else { B.pg++; A.pp++; B.pts += 3; }
    });
    const rows = Object.values(st).sort((x, y) => y.pts - x.pts || y.ds - x.ds || x.t.name.localeCompare(y.t.name));
    body.innerHTML = rows.map((r, i) => `
      <tr>
        <td class="pos">${i + 1}</td>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${r.t.color};margin-right:8px"></span>${esc(r.t.name)}</td>
        <td>${r.pj}</td><td>${r.pg}</td><td>${r.pp}</td><td>${r.ds > 0 ? '+' : ''}${r.ds}</td>
        <td class="pts">${r.pts}</td>
      </tr>`).join('');
    if (total && done === total) {
      champ.innerHTML = `<svg class="ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg> ¡${esc(rows[0].t.name)} es el campeón del torneo con ${rows[0].pts} puntos!`;
      champ.classList.add('show');
    } else {
      champ.classList.remove('show');
    }
  }

  function updateStats() {
    animateNumber($('#sPlayers'), state.players.length);
    animateNumber($('#sTeams'), state.teams.length);
    animateNumber($('#sMatches'), state.rounds.flat().filter((m) => m.a !== null && m.b !== null).length);
  }

  function renderAll() { renderPlayers(); renderTeams(); renderFixture(); renderTable(); }

  // ---------- Eventos ----------
  $('#playerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#pName');
    const name = input.value.trim();
    const level = +document.querySelector('input[name="lvl"]:checked').value;
    const err = $('#formError');
    if (name.length < 2) { err.textContent = 'Escribe un nombre de al menos 2 letras.'; input.focus(); return; }
    if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'Ese jugador ya está inscrito.'; return; }
    err.textContent = '';
    addPlayer(name, level);
    input.value = '';
    input.focus();
    toast(name + ' inscrito (nivel ' + level + ')');
  });

  $('#playerList').addEventListener('click', (e) => {
    const btn = e.target.closest('.del');
    if (!btn) return;
    state.players = state.players.filter((p) => p.id !== btn.dataset.id);
    save();
    renderPlayers();
  });

  $('#clearBtn').addEventListener('click', () => {
    if (!state.players.length) return;
    if (!confirm('¿Vaciar jugadores, equipos y fixture?')) return;
    state.players = []; state.teams = []; state.rounds = [];
    save(); renderAll(); toast('Campeonato reiniciado');
  });

  $('#makeTeamsBtn').addEventListener('click', () => {
    const k = +$('#teamCount').value;
    if (state.players.length < k * 2) {
      toast('Necesitas al menos ' + k * 2 + ' jugadores para ' + k + ' equipos', true);
      return;
    }
    state.teams = makeTeams(k);
    state.rounds = makeFixture(state.teams);
    save(); renderAll();
    toast(k + ' equipos armados y fixture generado');
    $('#equipos').scrollIntoView({ behavior: 'smooth' });
  });

  $('#fixtureBox').addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset.s) return;
    let v = el.value.replace(/\D/g, '').slice(0, 1);
    el.value = v;
    state.rounds[el.dataset.r][el.dataset.i][el.dataset.s] = v;
    save();
    renderTable();
    // Marcar ganador sin redibujar (así no se pierde el foco)
    const m = state.rounds[el.dataset.r][el.dataset.i];
    const row = el.closest('.match');
    const played = m.sa !== '' && m.sb !== '';
    row.querySelector('.t').classList.toggle('win', played && +m.sa > +m.sb);
    row.querySelector('.t.r').classList.toggle('win', played && +m.sb > +m.sa);
  });

  $('#demoBtn').addEventListener('click', () => {
    const demo = [['Ana Rojas', 5], ['Luis Mamani', 4], ['Carla Vargas', 3], ['Diego Quispe', 2], ['Sofía Céspedes', 4], ['Marco Flores', 1],
      ['Valeria Choque', 3], ['Jorge Arce', 5], ['Paola Guzmán', 2], ['Iván Torrez', 3], ['Lucía Rocha', 1], ['Andrés Soliz', 4]];
    state.players = demo.map(([n, l]) => ({ id: uid(), name: n, level: l }));
    state.teams = []; state.rounds = [];
    save(); renderAll();
    toast('12 jugadores de demostración cargados');
    $('#jugadores').scrollIntoView({ behavior: 'smooth' });
  });

  // Tema claro/oscuro
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('rm-theme', t); } catch (e) { /* ignorar */ }
  }
  $('#themeBtn').addEventListener('click', () => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });
  try { const t = localStorage.getItem('rm-theme'); if (t) setTheme(t); } catch (e) { /* ignorar */ }

  // Menú móvil
  $('#menuBtn').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', open);
  });
  $('#nav').addEventListener('click', (e) => { if (e.target.tagName === 'A') $('#nav').classList.remove('open'); });

  // Animación al hacer scroll + enlace activo
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.reveal').forEach((s) => io.observe(s));
  } else {
    document.querySelectorAll('.reveal').forEach((s) => s.classList.add('in'));
  }

  // Inicio
  load();
  renderAll();
})();
