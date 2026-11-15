/* Movie detail page. Needs script.js loaded first (STUBHOUSE_FILMS, STUBHOUSE_SEAT_COUNT).
   Usage: movie.html?film=interstellar  (keys match STUBHOUSE_FILMS / book.html?film=) */

var STUBHOUSE_MOVIE_INFO = {
  interstellar: {
    poster: 'images/interstellar.jpg',
    genre: 'Sci-Fi',
    year: 2014,
    runtime: '2h 49m',
    rating: 'PG-13',
    director: 'Christopher Nolan',
    writer: 'Jonathan Nolan, Christopher Nolan',
    language: 'English',
    synopsis: 'With Earth running out of food and time, a former pilot joins a crew of explorers who travel through a wormhole near Saturn in search of a new home for humanity. Every minute they spend out there costs the people they left behind years.',
    cast: [
      { name: 'Matthew McConaughey', role: 'Cooper' },
      { name: 'Anne Hathaway', role: 'Brand' },
      { name: 'Jessica Chastain', role: 'Murph' },
      { name: 'Michael Caine', role: 'Professor Brand' },
      { name: 'Matt Damon', role: 'Dr. Mann' },
      { name: 'Casey Affleck', role: 'Tom' }
    ],
    trailerId: '3WzHXI5HizQ'   // YouTube video ID (the part after watch?v=)
  },
  '12angrymen': {
    poster: 'images/12angrymen.jpg',
    genre: 'Drama',
    year: 1957,
    runtime: '1h 36m',
    rating: 'PG',
    director: 'Sidney Lumet',
    writer: 'Reginald Rose',
    language: 'English',
    synopsis: 'Twelve jurors lock themselves in a sweltering room to decide the fate of a teenager accused of murder. One man refuses to vote guilty without a proper discussion, and slowly the certainty of the others begins to crack.',
    cast: [
      { name: 'Henry Fonda', role: 'Juror 8' },
      { name: 'Lee J. Cobb', role: 'Juror 3' },
      { name: 'Ed Begley', role: 'Juror 10' },
      { name: 'E.G. Marshall', role: 'Juror 4' },
      { name: 'Jack Warden', role: 'Juror 7' },
      { name: 'Martin Balsam', role: 'Juror 1' }
    ],
    trailerId: 'TEN-2uTi2c0'
  },
  turabelmas: {
    poster: 'images/turab-el-mas.jpg',
    genre: 'Drama',
    year: 2018,
    runtime: '2h 5m',
    rating: 'PG-13',
    director: 'Marwan Hamed',
    writer: 'Ahmed Mourad (novel and screenplay)',
    language: 'Arabic',
    synopsis: 'Taha, a quiet pharmacy worker, comes home to find his father murdered. Reading the diaries his father left behind, he uncovers dark secrets that pull him into a world of crime and corruption he never knew existed.',
    cast: [
      { name: 'Asser Yassin', role: 'Taha el-Zahhar' },
      { name: 'Menna Shalaby', role: 'Lead' },
      { name: 'Maged El Kedwany', role: 'El-Sirvis' },
      { name: 'Ezzat El Alaili', role: 'Hanafi el-Zahhar' },
      { name: 'Khaled El Sawy', role: 'Supporting' },
      { name: 'Sawsan Badr', role: 'Supporting' }
    ],
    trailerId: '9cO54cwkN1I'
  },
  ibrahimelabyad: {
    poster: 'images/ibrahim-el-abyad.jpg',
    genre: 'Action',
    year: 2009,
    runtime: '2h 10m',
    rating: 'R',
    director: 'Marwan Hamed',
    writer: 'Abbas Abo El Hassan',
    language: 'Arabic',
    synopsis: 'Ibrahim watches his father get killed as a child and is pulled into the criminal underworld of Cairo. As he rises through the gangs, he crosses paths with the feared crime lord Abdul-Malek Zarzur, and a love triangle turns old loyalties into a fight to the death.',
    cast: [
      { name: 'Ahmed El Sakka', role: 'Ibrahim' },
      { name: 'Hend Sabry', role: 'Horeya' },
      { name: 'Amr Waked', role: 'Ashry' },
      { name: 'Mahmoud Abdel Aziz', role: 'Abdul-Malek Zarzur' },
      { name: 'Bassem Samra', role: 'Mahdy' },
      { name: 'Sawsan Badr', role: "Horeya's Mother" }
    ],
    trailerId: 'cAqdap-Bvfk'
  }
};

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
    byId('mvRelated').closest('.section').style.display = 'none';
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

  var posterImg = byId('mvPosterImg');
  posterImg.alt = film.title + ' poster';
  posterImg.onerror = function () { posterImg.remove(); };
  posterImg.src = info.poster;

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
    var role = document.createElement('p');
    role.textContent = person.role;
    var text = document.createElement('div');
    text.appendChild(name);
    text.appendChild(role);
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

  byId('stubFilm').textContent = film.title;
  byId('stubScreen').textContent = film.screen;
  byId('stubTime').textContent = film.showtime;
  byId('stubPrice').textContent = '$' + film.price + '.00';
  byId('stubSeats').textContent = (STUBHOUSE_SEAT_COUNT - film.taken.length) + ' of ' + STUBHOUSE_SEAT_COUNT;

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
    frame.innerHTML = '';          // removing the iframe stops playback
    var fb = modal.querySelector('.trailer-fallback');
    if (fb) fb.remove();
    document.body.style.overflow = '';
  }

  trailerBtn.addEventListener('click', function () {
    if (!info.trailerId) {
      // No video ID filled in for this film yet: open a YouTube search for its trailer
      var q = encodeURIComponent(film.title + ' ' + info.year + ' official trailer');
      window.open('https://www.youtube.com/results?search_query=' + q, '_blank', 'noopener');
      return;
    }
    var watchUrl = 'https://www.youtube.com/watch?v=' + info.trailerId;

    // YouTube refuses embeds from pages opened as file:// (error 153), so open it on YouTube instead
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

    // Fallback in case the video owner blocks embedding
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
  });

  byId('trailerClose').addEventListener('click', closeTrailer);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeTrailer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTrailer(); });
});
