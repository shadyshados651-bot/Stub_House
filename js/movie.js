/* Movie detail page. Needs js/seed.js and js/script.js loaded first
   (STUBHOUSE_FILMS, STUBHOUSE_MOVIE_INFO, stubhouseApi).
   Usage: movie.html?film=interstellar  (#trailer opens the modal)
*/

document.addEventListener('DOMContentLoaded', function () {

  var byId = function (id) { return document.getElementById(id); };
  var key = new URLSearchParams(window.location.search).get('film');
  var film = STUBHOUSE_FILMS[key];
  var info = STUBHOUSE_MOVIE_INFO[key];

  if (!film || !info) {
    ['.movie-hero', '#mvCastSection', '#mvDetailsSection'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    });
    var relatedSec = byId('mvRelated').closest('.section');
    if (relatedSec) relatedSec.style.display = 'none';
    var nf = byId('mvNotFound');
    nf.style.display = 'block';
    nf.style.paddingTop = 'calc(var(--header-height) + var(--spacing-xl))';
    document.title = 'Movie not found — StubHouse';
    return;
  }

  function addBadge(parent, text) {
    var b = document.createElement('span');
    b.className = 'badge';
    b.textContent = text;
    parent.appendChild(b);
  }

  document.title = film.title + ' — StubHouse';
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', film.title + ' — ' + info.synopsis.slice(0, 150) + ' — StubHouse, Heliopolis, Cairo.');

  var posterImg = byId('mvPosterImg');
  posterImg.alt = film.title + ' poster';
  var posterDims = { interstellar: { w: 576, h: 900 }, '12angrymen': { w: 589, h: 900 }, turabelmas: { w: 315, h: 420 }, ibrahimelabyad: { w: 283, h: 413 } };
  var d = posterDims[key] || { w: 600, h: 900 };
  posterImg.width = d.w;
  posterImg.height = d.h;
  posterImg.onerror = function () { posterImg.remove(); };
  posterImg.src = 'images/' + key + '-600w.jpg';

  byId('mvGenre').textContent = info.genre;
  byId('mvTitle').textContent = film.title;
  byId('mvMeta').textContent = (info.year + ' · ' + info.runtime + ' · ' + info.language).toUpperCase();
  byId('mvSynopsis').textContent = info.synopsis;

  var badges = byId('mvBadges');
  addBadge(badges, 'Screen ' + film.screen);
  addBadge(badges, film.showtime);
  addBadge(badges, info.rating);

  var bookUrl = 'book.html?film=' + key;
  byId('mvBookBtn').setAttribute('href', bookUrl);
  byId('stubBookBtn').setAttribute('href', bookUrl);

  byId('mvCastSub').textContent = 'Directed by ' + info.director + '.';
  var castGrid = byId('mvCast');
  info.cast.forEach(function (person) {
    var initials = person.name.split(' ').map(function (p) { return p.charAt(0); }).slice(0, 2).join('');
    var card = document.createElement('div');
    card.className = 'cast-card';
    var avatar = document.createElement('div');
    avatar.className = 'cast-avatar';
    avatar.textContent = initials;
    var name = document.createElement('h3');
    name.textContent = person.name;
    var text = document.createElement('div');
    text.appendChild(name);
    if (person.role) {
      var role = document.createElement('p');
      role.textContent = person.role;
      text.appendChild(role);
    }
    card.appendChild(avatar);
    card.appendChild(text);
    castGrid.appendChild(card);
  });

  var details = [
    ['Director', info.director],
    ['Writer', info.writer],
    ['Genre', info.genre],
    ['Release year', String(info.year)],
    ['Runtime', info.runtime],
    ['Language', info.language],
    ['Rated', info.rating]
  ];
  var dl = byId('mvDetails');
  details.forEach(function (row) {
    var dt = document.createElement('dt');
    dt.textContent = row[0];
    var dd = document.createElement('dd');
    dd.textContent = row[1];
    dl.appendChild(dt);
    dl.appendChild(dd);
  });

  stubhouseApi.getTakenSeats(key, film.taken).then(function (taken) {
    byId('stubFilm').textContent = film.title;
    byId('stubScreen').textContent = film.screen;
    byId('stubTime').textContent = film.showtime;
    byId('stubPrice').textContent = formatPrice(film.price);
    byId('stubSeats').textContent = (STUBHOUSE_SEAT_COUNT - taken.length) + ' of ' + STUBHOUSE_SEAT_COUNT;
  });

  var related = byId('mvRelated');
  Object.keys(STUBHOUSE_FILMS).forEach(function (otherKey) {
    if (otherKey === key) return;
    var other = STUBHOUSE_MOVIE_INFO[otherKey];
    var link = document.createElement('a');
    link.className = 'related-card';
    link.href = 'movie.html?film=' + otherKey;
    var img = document.createElement('img');
    img.src = other.poster;
    img.alt = STUBHOUSE_FILMS[otherKey].title + ' poster';
    img.onerror = function () { img.remove(); };
    var label = document.createElement('div');
    label.className = 'related-label';
    var t = document.createElement('h3');
    t.textContent = STUBHOUSE_FILMS[otherKey].title;
    var m = document.createElement('span');
    m.textContent = other.genre + ' · ' + other.runtime;
    label.appendChild(t);
    label.appendChild(m);
    link.appendChild(img);
    link.appendChild(label);
    related.appendChild(link);
  });

  /* ---------- Trailer ---------- */
  var modal = byId('trailerModal');
  var frame = byId('trailerFrame');
  var trailerBtn = byId('mvTrailerBtn');

  function closeTrailer() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    frame.innerHTML = '';
    var fb = modal.querySelector('.trailer-fallback');
    if (fb) fb.remove();
    document.body.style.overflow = '';
  }

  function openTrailer() {
    if (!info.trailerId) {
      var q = encodeURIComponent(film.title + ' ' + info.year + ' official trailer');
      window.open('https://www.youtube.com/results?search_query=' + q, '_blank', 'noopener');
      return;
    }
    var watchUrl = 'https://www.youtube.com/watch?v=' + info.trailerId;

    if (window.location.protocol === 'file:') {
      window.open(watchUrl, '_blank', 'noopener');
      return;
    }

    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + info.trailerId + '?autoplay=1&rel=0';
    iframe.title = film.title + ' trailer';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    frame.appendChild(iframe);

    var fallback = document.createElement('a');
    fallback.className = 'trailer-fallback';
    fallback.href = watchUrl;
    fallback.target = '_blank';
    fallback.rel = 'noopener';
    fallback.textContent = 'Video not playing? Watch on YouTube ↗';
    frame.parentNode.appendChild(fallback);

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  if (window.location.hash === '#trailer') {
    if (info.trailerId) {
      openTrailer();
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
      openTrailer();
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  trailerBtn.addEventListener('click', function () {
    openTrailer();
  });

  byId('trailerClose').addEventListener('click', closeTrailer);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeTrailer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTrailer(); });
});
