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

  /* ---------- Watchlist ---------- */
  var watchlistBtn = byId('mvWatchlistBtn');
  function updateWatchlistUI(watching) {
    watchlistBtn.classList.toggle('selected', watching);
    watchlistBtn.textContent = watching ? '✓ Watchlist' : '♥ Watchlist';
  }
  stubhouseApi.getWatchlist().then(function (list) {
    updateWatchlistUI(list.indexOf(key) !== -1);
  });
  watchlistBtn.addEventListener('click', function () {
    stubhouseApi.toggleWatchlist(key).then(function (res) {
      updateWatchlistUI(res.watching);
      showToast(res.watching ? 'Added to watchlist.' : 'Removed from watchlist.', 'info');
    });
  });

  /* ---------- Share (group invite, F18) ---------- */
  var shareBtn = byId('mvShareBtn');
  shareBtn.addEventListener('click', function () {
    var url = window.location.origin + window.location.pathname + '?film=' + key;
    var text = 'Check out ' + film.title + ' at StubHouse';
    if (navigator.share) {
      navigator.share({ title: film.title, text: text, url: url }).catch(function () {});
    } else {
      var wa = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
      window.open(wa, '_blank', 'noopener');
    }
  });

  /* ---------- Showtimes list (deep-link to booking) ---------- */
  var dateStrip = byId('mvDateStrip');
  var showtimesGrid = byId('mvShowtimes');
  var filmShows = STUBHOUSE_SHOWS.filter(function (s) { return s.filmKey === key; });
  var dates = [];
  filmShows.forEach(function (s) { if (dates.indexOf(s.date) === -1) dates.push(s.date); });
  dates.sort();
  var selDate = dates[0] || null;
  dates.forEach(function (d) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (d === selDate ? ' selected' : '');
    b.textContent = d;
    b.addEventListener('click', function () {
      selDate = d;
      dateStrip.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('selected', x === b); });
      renderShowtimes();
    });
    dateStrip.appendChild(b);
  });

  function renderShowtimes() {
    showtimesGrid.innerHTML = '';
    var dayShows = filmShows.filter(function (s) { return s.date === selDate; });
    if (dayShows.length === 0) {
      showtimesGrid.innerHTML = '<p style="color:var(--muted); grid-column:1/-1;">No showtimes this date.</p>';
      return;
    }
    dayShows.forEach(function (show) {
      var hall = STUBHOUSE_HALLS[show.hallId];
      var card = document.createElement('article');
      card.className = 'movie-card';
      var info = document.createElement('div');
      info.className = 'movie-body';
      var h = document.createElement('h3');
      h.textContent = show.time;
      var meta = document.createElement('div');
      meta.className = 'movie-meta';
      meta.textContent = hall.name + ' · ' + hall.format + ' · ' + show.subtitles + ' subtitles';
      var price = document.createElement('div');
      price.className = 'movie-meta';
      price.textContent = stubhouseFormatPrice ? stubhouseFormatPrice(show.prices.adult) : ('EGP ' + show.prices.adult);
      price.style.color = 'var(--gold)';
      price.style.fontWeight = '700';
      var btn = document.createElement('a');
      btn.href = 'book.html?film=' + key + '&show=' + show.id;
      btn.className = 'btn btn-primary';
      btn.textContent = 'Book Seats';
      info.appendChild(h); info.appendChild(meta); info.appendChild(price); info.appendChild(btn);
      card.appendChild(info);
      showtimesGrid.appendChild(card);
    });
  }
  renderShowtimes();

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

  /* ---------- Reviews (F16) ---------- */
  var reviewsForm = byId('mvReviewsForm');
  var reviewsList = byId('mvReviewsList');
  var currentUser = null;

  function renderReviews() {
    stubhouseApi.getReviewsForFilm(key).then(function (list) {
      reviewsList.innerHTML = '';
      list.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      if (list.length === 0) {
        reviewsList.innerHTML = '<p style="color:var(--muted); grid-column:1/-1; text-align:center;">No reviews yet.</p>';
        return;
      }
      list.forEach(function (r) {
        var card = document.createElement('div');
        card.className = 'cast-card';
        card.style.cssText = 'flex:1 1 30%; min-width:240px;';
        var head = document.createElement('div');
        head.style.cssText = 'display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;';
        var name = document.createElement('strong');
        name.textContent = r.userName;
        var badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = r.verified ? 'Verified viewer' : 'Viewer';
        head.appendChild(name); head.appendChild(badge);
        var stars = document.createElement('div');
        stars.className = 'movie-meta';
        stars.style.color = 'var(--gold)';
        stars.style.fontFamily = 'var(--font-mono)';
        stars.textContent = '★ ' + r.rating + '   (' + Object.keys(r.dimensions || {}).map(function (d) { return d + ':' + r.dimensions[d]; }).join(', ') + ')';
        var text = document.createElement('p');
        text.textContent = r.text;
        text.style.marginTop = '6px';
        card.appendChild(head); card.appendChild(stars); card.appendChild(text);
        reviewsList.appendChild(card);
      });
    });
  }

  function buildReviewForm(eligible) {
    reviewsForm.innerHTML = '';
    if (!eligible) {
      var note = document.createElement('p');
      note.textContent = currentUser ? 'You can review this film after a confirmed booking.' : 'Sign in with a confirmed booking to leave a review.';
      note.style.color = 'var(--muted)';
      note.style.fontSize = '0.85rem';
      reviewsForm.appendChild(note);
      return;
    }
    var h = document.createElement('h3');
    h.textContent = 'Your Review';
    h.style.marginBottom = 'var(--spacing-md)';
    reviewsForm.appendChild(h);
    var dims = { picture: 'Picture', sound: 'Sound', seat: 'Seat comfort', clean: 'Cleanliness' };
    var dimEls = {};
    Object.keys(dims).forEach(function (d) {
      var lab = document.createElement('label');
      lab.textContent = dims[d];
      lab.style.cssText = 'display:block; font-size:0.8rem; font-family:var(--font-mono); color:var(--muted); margin-top:8px;';
      var sel = document.createElement('select');
      sel.style.cssText = 'width:100%; padding:8px; border-radius:var(--radius); border:2px solid var(--border-color); background:var(--surface); color:var(--text); margin-top:4px;';
      for (var s = 1; s <= 5; s++) { var o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); }
      sel.value = 5;
      lab.appendChild(sel);
      reviewsForm.appendChild(lab);
      dimEls[d] = sel;
    });
    var overall = document.createElement('label');
    overall.textContent = 'Overall rating';
    overall.style.cssText = 'display:block; font-size:0.8rem; font-family:var(--font-mono); color:var(--muted); margin-top:12px;';
    var ov = document.createElement('select');
    ov.style.cssText = 'width:100%; padding:8px; border-radius:var(--radius); border:2px solid var(--border-color); background:var(--surface); color:var(--text); margin-top:4px;';
    for (var s = 1; s <= 5; s++) { var oo = document.createElement('option'); oo.value = s; oo.textContent = s; ov.appendChild(oo); }
    ov.value = 5;
    overall.appendChild(ov);
    reviewsForm.appendChild(overall);
    var ta = document.createElement('textarea');
    ta.placeholder = 'What did you think?';
    ta.rows = 3;
    ta.style.cssText = 'width:100%; padding:8px; border-radius:var(--radius); border:2px solid var(--border-color); background:var(--surface); color:var(--text); margin-top:8px; font-family:var(--font-body);';
    reviewsForm.appendChild(ta);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.textContent = 'Submit Review';
    btn.style.marginTop = 'var(--spacing-md)';
    btn.addEventListener('click', function () {
      var dimensions = {};
      Object.keys(dimEls).forEach(function (d) { dimensions[d] = Number(dimEls[d].value); });
      var text = ta.value.trim();
      if (!text) { showToast('Please write a review.', 'error'); return; }
      stubhouseApi.addReview({ filmKey: key, rating: Number(ov.value), dimensions: dimensions, text: text }).then(function () {
        showToast('Review submitted.', 'success');
        reviewsForm.innerHTML = '';
        renderReviews();
      }).catch(function (err) { showToast(err.message, 'error'); });
    });
    reviewsForm.appendChild(btn);
  }

  stubhouseApi.getCurrentUser().then(function (u) {
    currentUser = u;
    if (u) {
      stubhouseApi.userHasConfirmedBooking(u.email, key).then(function (eligible) {
        buildReviewForm(eligible);
      });
    } else {
      buildReviewForm(false);
    }
  });
  renderReviews();

  if (window.location.hash === '#trailer') {
    openTrailer();
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  trailerBtn.addEventListener('click', function () {
    openTrailer();
  });

  byId('trailerClose').addEventListener('click', closeTrailer);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeTrailer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTrailer(); });
});
