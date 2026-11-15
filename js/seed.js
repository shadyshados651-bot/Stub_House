/* js/seed.js — StubHouse sample data (demo only, clearly marked).
   Single source of truth for film/hall/show/pricing data.
   Replace with real programme data before launch.
*/

var STUBHOUSE_SEAT_COUNT = 60;

var STUBHOUSE_FILMS = {
  interstellar: { key: 'interstellar', title: 'Interstellar', screen: '04', showtime: 'Fri, 8:45 PM', price: 15, taken: [3, 7, 14, 15, 22, 31, 38, 45, 52, 58] },
  '12angrymen': { key: '12angrymen', title: '12 Angry Men', screen: '02', showtime: 'Fri, 6:30 PM', price: 10, taken: [1, 9, 18, 27, 33, 40, 49, 56] },
  turabelmas: { key: 'turabelmas', title: 'Turab El Mas', screen: '07', showtime: 'Fri, 9:15 PM', price: 12, taken: [5, 11, 19, 26, 34, 42, 47, 55, 59] },
  ibrahimelabyad: { key: 'ibrahimelabyad', title: 'Ibrahim El Abyad', screen: '01', showtime: 'Fri, 10:00 PM', price: 13, taken: [2, 8, 16, 24, 30, 36, 44, 51, 57] }
};

/* Prices are in EGP (Egyptian pounds). Display with Intl.NumberFormat('en-EG', ...). */

/* ---------- Halls ---------- */
var STUBHOUSE_HALLS = {
  hall1: { id: 'hall1', name: 'Hall 1', format: '2D', rows: [
    { label: 'A', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'B', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'C', seats: 10, aisleAfter: [], wheelchair: [1], recliner: false },
    { label: 'D', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'E', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'F', seats: 10, aisleAfter: [5], wheelchair: [], recliner: false }
  ]},
  hall2: { id: 'hall2', name: 'Hall 2', format: '3D', rows: [
    { label: 'A', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'B', seats: 10, aisleAfter: [], wheelchair: [0], recliner: false },
    { label: 'C', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'D', seats: 10, aisleAfter: [5], wheelchair: [], recliner: false },
    { label: 'E', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'F', seats: 10, aisleAfter: [], wheelchair: [], recliner: true }
  ]},
  hall3: { id: 'hall3', name: 'Hall 3', format: 'IMAX', rows: [
    { label: 'A', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'B', seats: 10, aisleAfter: [], wheelchair: [], recliner: true },
    { label: 'C', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'D', seats: 10, aisleAfter: [], wheelchair: [3], recliner: false },
    { label: 'E', seats: 10, aisleAfter: [], wheelchair: [], recliner: false },
    { label: 'F', seats: 10, aisleAfter: [], wheelchair: [], recliner: false }
  ]},
  hall4: { id: 'hall4', name: 'Hall 4', format: 'VIP', rows: [
    { label: 'A', seats: 6, aisleAfter: [], wheelchair: [], recliner: true },
    { label: 'B', seats: 6, aisleAfter: [], wheelchair: [], recliner: true },
    { label: 'C', seats: 6, aisleAfter: [], wheelchair: [], recliner: true },
    { label: 'D', seats: 6, aisleAfter: [], wheelchair: [], recliner: true }
  ]}
};

/* ---------- Ticket types (per film override possible) ---------- */
var STUBHOUSE_TICKET_TYPES = {
  adult: { label: 'Adult', discount: 0 },
  student: { label: 'Student', discount: 0.2 },
  child: { label: 'Child', discount: 0.5 }
};

/* ---------- Fees (demo) ---------- */
var STUBHOUSE_FEES = { serviceFee: 5, taxRate: 0.05 }; /* 5 EGP service fee, 5% tax */

/* ---------- Shows: next 7 days, 2-4 shows per film per day ---------- */
function addDays(date, n) {
  var d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function pad(n) { return n < 10 ? '0' + n : String(n); }

function fmtDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function fmtTime(h, m) { return pad(h) + ':' + pad(m); }

var STUBHOUSE_SHOWS = (function () {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var shows = [];
  var id = 1;
  var slots = [
    { h: 13, m: 0 }, { h: 16, m: 30 }, { h: 19, m: 15 }, { h: 22, m: 0 }
  ];
  var filmKeys = Object.keys(STUBHOUSE_FILMS);
  var hallIds = Object.keys(STUBHOUSE_HALLS);
  for (var day = 0; day < 7; day++) {
    var date = addDays(today, day);
    var dateStr = fmtDate(date);
    /* 2-4 shows per film per day */
    var perDay = 2 + (day % 3);
    filmKeys.forEach(function (fk, fi) {
      for (var s = 0; s < perDay; s++) {
        var slot = slots[(fi + s) % slots.length];
        var hallId = hallIds[(fi + s) % hallIds.length];
        var hall = STUBHOUSE_HALLS[hallId];
        var basePrice = STUBHOUSE_FILMS[fk].price;
        var formatMult = hall.format === 'IMAX' ? 1.5 : (hall.format === 'VIP' ? 1.8 : (hall.format === '3D' ? 1.2 : 1));
        shows.push({
          id: 'sh' + String(1000 + id++),
          filmKey: fk,
          date: dateStr,
          time: fmtTime(slot.h, slot.m),
          hallId: hallId,
          subtitles: day % 2 === 0 ? 'Arabic' : 'English',
          prices: {
            adult: Math.round(basePrice * formatMult),
            student: Math.round(basePrice * formatMult * 0.8),
            child: Math.round(basePrice * formatMult * 0.5)
          }
        });
      }
    });
  }
  return shows;
})();

/* ---------- Promo codes (demo) ---------- */
var STUBHOUSE_PROMOS = {
  STUB10: { code: 'STUB10', type: 'percent', value: 10, minTotal: 50, expiresAt: '2026-12-31', maxUses: 1000, usedCount: 0 },
  WELCOME20: { code: 'WELCOME20', type: 'percent', value: 20, minTotal: 100, expiresAt: '2026-12-31', maxUses: 100, usedCount: 0 },
  SAVE25: { code: 'SAVE25', type: 'fixed', value: 25, minTotal: 100, expiresAt: '2026-11-30', maxUses: 500, usedCount: 0 }
};

/* ---------- Demo seed bookings ---------- */
var STUBHOUSE_SEED_BOOKINGS = [
  {
    ref: 'STB-K9M2P1',
    filmKey: 'interstellar',
    film: 'Interstellar',
    screen: '04',
    showtime: 'Fri, 8:45 PM',
    showId: null,
    seats: [0, 1],
    tickets: [{ type: 'Adult', qty: 2, unit: 15 }],
    snacks: [],
    subtotal: 30,
    discount: 0,
    fee: 5,
    tax: 1.75,
    total: 36.75,
    currency: 'EGP',
    payment: { method: 'card', status: 'paid', last4: '1111' },
    contact: { name: 'Yara Mahmoud', email: 'yara.mahmoud@example.com', phone: '01223456789' },
    status: 'confirmed',
    createdAt: '2026-11-12T20:15:00Z'
  },
  {
    ref: 'STB-P4R8W1',
    filmKey: '12angrymen',
    film: '12 Angry Men',
    screen: '02',
    showtime: 'Fri, 6:30 PM',
    showId: null,
    seats: [9],
    tickets: [{ type: 'Adult', qty: 1, unit: 10 }],
    snacks: [],
    subtotal: 10,
    discount: 0,
    fee: 5,
    tax: 0.75,
    total: 15.75,
    currency: 'EGP',
    payment: { method: 'cash', status: 'pending' },
    contact: { name: 'Omar Fathy', email: 'omar.fathy@example.com', phone: '01098765432' },
    status: 'confirmed',
    createdAt: '2026-11-13T19:40:00Z'
  },
  {
    ref: 'STB-J3N6V5',
    filmKey: 'turabelmas',
    film: 'Turab El Mas',
    screen: '07',
    showtime: 'Fri, 9:15 PM',
    showId: null,
    seats: [5, 11],
    tickets: [{ type: 'Adult', qty: 1, unit: 12 }, { type: 'Student', qty: 1, unit: 9 }],
    snacks: [{ item: 'Popcorn', type: 'Butter', size: 'Medium', qty: 1 }],
    subtotal: 24,
    discount: 0,
    fee: 5,
    tax: 1.45,
    total: 30.45,
    currency: 'EGP',
    payment: { method: 'wallet', status: 'paid' },
    contact: { name: 'Layla Nassar', email: 'layla.nassar@example.com', phone: '01155566677' },
    status: 'confirmed',
    createdAt: '2026-11-14T21:05:00Z'
  }
];

/* Cast roles above verified against Wikipedia / elcinema / cineamo (Diamond Dust, 2018).
   Removed unverified entries for Turab El Mas: Khaled El Sawy ("Supporting") and
   Sawsan Badr ("Supporting") — no matching credited role found. */

var STUBHOUSE_MOVIE_INFO = {
  interstellar: {
    poster: 'images/interstellar-600w.jpg',
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
    trailerId: '3WzHXI5HizQ' /* VERIFIED: Movieclips Trailers official teaser, 2013-12-14 */
  },
  '12angrymen': {
    poster: 'images/12angrymen-600w.jpg',
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
    trailerId: 'TEN-2uTi2c0' /* VERIFIED: MGM official trailer */
  },
  turabelmas: {
    poster: 'images/turab-el-mas-600w.jpg',
    genre: 'Drama',
    year: 2018,
    runtime: '2h 30m',
    rating: 'PG-13',
    director: 'Marwan Hamed',
    writer: 'Ahmed Mourad (novel and screenplay)',
    language: 'Arabic',
    synopsis: 'Taha, a quiet pharmacy worker, comes home to find his father murdered. Reading the diaries his father left behind, he uncovers dark secrets that pull him into a world of crime and corruption he never knew existed.',
    cast: [
      { name: 'Asser Yassin', role: 'Taha el-Zahhar' },
      { name: 'Menna Shalaby', role: 'Sara' },
      { name: 'Maged El Kedwany', role: 'Colonel Walid Sultan' },
      { name: 'Mohamed Mamdouh', role: 'El-Sirvis' }
    ],
    trailerId: '9cO54cwkN1I' /* VERIFIED: New Century Production official trailer */
  },
  ibrahimelabyad: {
    poster: 'images/ibrahim-el-abyad-600w.jpg',
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
    trailerId: 'cAqdap-Bvfk' /* VERIFIED: official trailer per user confirmation */
  }
};
