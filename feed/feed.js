// The smart feed: one clip per screen, swipe up for the next.
// - Unwatched clips come first, with the four types mixed; watched ones follow, least recently watched first.
// - Clips start muted (phones only allow silent autoplay). The first tap turns sound on and it stays on.
// - The next clip is loaded ahead of time. What has been watched is remembered on this phone (localStorage).
(() => {
  'use strict';
  const feedEl = document.getElementById('feed');
  const soundBtn = document.getElementById('sound');
  const countEl = document.getElementById('count');
  const messageEl = document.getElementById('message');
  const TYPES = ['lesson', 'question', 'story', 'scripture'];
  const LABEL = { lesson: 'Lesson', question: 'Question', story: 'Story', scripture: 'Scripture' };
  const WATCHED_AT = 0.85; // a clip counts as watched once this much of it has played

  const store = {
    read() {
      try { return JSON.parse(localStorage.getItem('smartfeed.watched') || '{}') || {}; } catch { return {}; }
    },
    write(w) {
      try { localStorage.setItem('smartfeed.watched', JSON.stringify(w)); } catch { /* private mode: nothing is remembered */ }
    },
  };
  let watched = store.read();
  let soundOn = false;
  let clips = [];
  let sections = [];
  let current = -1;

  /** Unwatched first, types taking turns (newest first within a type); then watched, least recently watched first. */
  function order(all, seen) {
    const fresh = all.filter((c) => !seen[c.id]);
    const byType = TYPES.map((t) => fresh.filter((c) => c.type === t).sort((a, b) => String(b.added).localeCompare(String(a.added))));
    const other = fresh.filter((c) => !TYPES.includes(c.type));
    const mixed = [];
    // start with a different type each day, so the feed doesn't always open on a Lesson
    const offset = Math.floor(Date.now() / 86400000) % TYPES.length;
    for (let i = 0; byType.some((l) => l.length); i++) {
      const list = byType[(i + offset) % TYPES.length];
      if (list.length) mixed.push(list.shift());
    }
    const old = all.filter((c) => seen[c.id]).sort((a, b) => seen[a.id] - seen[b.id]);
    return { list: [...mixed, ...other, ...old], fresh: fresh.length };
  }

  function show(text) {
    messageEl.textContent = text;
    messageEl.hidden = false;
  }

  function build(list) {
    feedEl.textContent = '';
    sections = list.map((c, i) => {
      const s = document.createElement('section');
      s.className = 'clip' + (watched[c.id] ? ' watched' : '');
      s.dataset.type = c.type;
      s.dataset.index = String(i);
      s.innerHTML = '<img class="poster" alt="" decoding="async"><video playsinline webkit-playsinline preload="none" muted></video>' +
        '<div class="badge"><span class="seen">Watched</span><span class="kind"></span></div>' +
        '<div class="paused">Paused</div><div class="again">Tap to watch again &middot; swipe up for the next</div><div class="bar"><i></i></div>';
      s.querySelector('.kind').textContent = LABEL[c.type] || c.type;
      s.querySelector('img').loading = i < 2 ? 'eager' : 'lazy';
      s.querySelector('img').src = c.poster;
      const v = s.querySelector('video');
      const fill = s.querySelector('.bar i');
      v.addEventListener('timeupdate', () => {
        if (!v.duration) return;
        fill.style.width = `${Math.min(100, (v.currentTime / v.duration) * 100)}%`;
        if (v.currentTime / v.duration >= WATCHED_AT) markWatched(c.id, s);
      });
      v.addEventListener('playing', () => { s.classList.add('ready'); s.classList.remove('is-paused', 'is-ended'); });
      v.addEventListener('ended', () => { markWatched(c.id, s); s.classList.add('is-ended'); });
      v.addEventListener('error', () => { if (v.getAttribute('src')) s.querySelector('.again').textContent = 'This clip would not load. Swipe up for the next.'; s.classList.add('is-ended'); });
      s.addEventListener('click', () => tap(i));
      feedEl.appendChild(s);
      return s;
    });
    const end = document.createElement('section');
    end.className = 'clip end';
    end.innerHTML = '<h1></h1><p></p><button type="button">Back to the top</button>';
    end.querySelector('button').addEventListener('click', () => { load(true); });
    feedEl.appendChild(end);
    sections.push(end);
    refreshEnd();
  }

  function refreshEnd() {
    const end = sections[sections.length - 1];
    const left = clips.filter((c) => !watched[c.id]).length;
    end.querySelector('h1').textContent = left ? 'That is the end of the list.' : 'You are caught up.';
    end.querySelector('p').textContent = left ? `${left} clip${left === 1 ? '' : 's'} still unwatched.` : `All ${clips.length} clips watched. New ones appear at the top when they are made.`;
    countEl.textContent = left ? `${left} new` : '';
  }

  function markWatched(id, s) {
    if (watched[id]) return;
    watched[id] = Date.now();
    store.write(watched);
    s.classList.add('watched');
    refreshEnd();
  }

  const videoOf = (i) => (i >= 0 && i < clips.length ? sections[i].querySelector('video') : null);

  /** Give the current clip and its neighbours their video file; take it away from the rest (frees phone memory). */
  function arm(i) {
    for (let k = 0; k < clips.length; k++) {
      const v = videoOf(k);
      const near = k === i || k === i + 1 || k === i - 1;
      if (near && !v.getAttribute('src')) {
        v.preload = k === i + 1 || k === i ? 'auto' : 'metadata';
        v.src = clips[k].file;
      } else if (!near && v.getAttribute('src')) {
        v.pause();
        v.removeAttribute('src');
        v.load();
        sections[k].classList.remove('ready', 'is-paused', 'is-ended');
        sections[k].querySelector('.bar i').style.width = '0';
      }
    }
  }

  function play(i) {
    const v = videoOf(i);
    if (!v) return;
    v.muted = !soundOn;
    const p = v.play();
    if (p && p.catch) {
      p.catch(() => {
        // the browser refused sound without a tap: fall back to silent and ask again
        v.muted = true;
        soundOn = false;
        soundBtn.hidden = false;
        v.play().catch(() => {});
      });
    }
  }

  function activate(i) {
    if (i === current) return;
    const prev = videoOf(current);
    if (prev) { prev.pause(); sections[current].classList.remove('is-paused'); }
    current = i;
    if (i >= clips.length) return; // the end card
    arm(i);
    const v = videoOf(i);
    if (v.ended || sections[i].classList.contains('is-ended')) { v.currentTime = 0; sections[i].classList.remove('is-ended'); }
    play(i);
  }

  function tap(i) {
    const v = videoOf(i);
    if (!v) return;
    if (!soundOn) {
      // the first tap anywhere turns sound on, for this clip and every one after it
      soundOn = true;
      soundBtn.hidden = true;
      v.muted = false;
      if (v.paused) play(i);
      return;
    }
    if (v.ended || sections[i].classList.contains('is-ended')) { v.currentTime = 0; sections[i].classList.remove('is-ended'); play(i); }
    else if (v.paused) play(i);
    else { v.pause(); sections[i].classList.add('is-paused'); }
  }

  soundBtn.addEventListener('click', (e) => { e.stopPropagation(); if (current >= 0) tap(current); });

  const watcher = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) activate(Number(e.target.dataset.index ?? clips.length));
  }, { root: feedEl, threshold: [0.6] });

  document.addEventListener('visibilitychange', () => {
    const v = videoOf(current);
    if (!v) return;
    if (document.hidden) v.pause();
    else if (!sections[current].classList.contains('is-paused') && !v.ended) play(current);
  });

  async function load(again) {
    try {
      const res = await fetch(`feed.json?t=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`feed.json answered ${res.status}`);
      const data = await res.json();
      const all = Array.isArray(data.clips) ? data.clips : [];
      if (!all.length) return show('No clips yet. The first ones appear here as soon as the factory makes them.');
      watched = store.read();
      const o = order(all, watched);
      clips = o.list;
      watcher.disconnect();
      current = -1;
      build(clips);
      sections.forEach((s, i) => { if (i === clips.length) delete s.dataset.index; watcher.observe(s); });
      feedEl.scrollTo(0, 0);
      messageEl.hidden = true;
      if (!soundOn) soundBtn.hidden = false;
      if (again) activate(0);
    } catch (e) {
      // behind Cloudflare Access an expired sign-in answers with a login page instead of JSON: reloading shows it
      // (at most once a minute, so a real outage never turns into a reload loop)
      let last = 0;
      try { last = Number(sessionStorage.getItem('smartfeed.retried') || 0); } catch { last = Date.now(); }
      if (!again && Date.now() - last > 60000) {
        try { sessionStorage.setItem('smartfeed.retried', String(Date.now())); } catch { /* ignore */ }
        location.reload();
        return;
      }
      show('The feed could not be loaded. Check the connection, then pull down or reopen to try again.');
    }
  }
  window.smartfeed = { order }; // for the tests
  load(false);
})();
