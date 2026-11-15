/* js/api.js — StubHouse data layer.
   This is the ONLY module that touches localStorage (keys stubhouse*).
   Every function returns a Promise so a real backend can replace this file
   without touching any UI code.
   Demo only: all data lives in the browser, so nothing here is real security
   (see README).
*/

(function () {

  var KEYS = {
    accounts: 'stubhouseAccounts',
    currentUser: 'stubhouseCurrentUser',
    bookings: 'stubhouseBookings',
    holds: 'stubhouseHolds',
    theme: 'stubhouseTheme',
    watchlist: 'stubhouseWatchlist',
    promos: 'stubhousePromos',
    reviews: 'stubhouseReviews'
  };

  var SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  var LOCK_ATTEMPTS = 5;
  var LOCK_MS = 30 * 60 * 1000;
  var HASH_ALGO = 'SHA-256';
  var HOLD_MINUTES = 10; /* seat hold duration */
  var HOLD_TEST_MINUTES = null; /* set > 0 to shorten for tests (dev flag) */

  function read(key, defaultValue) {
    return new Promise(function (resolve) {
      try {
        var raw = localStorage.getItem(key);
        resolve(raw === null ? defaultValue : JSON.parse(raw));
      } catch (err) {
        resolve(defaultValue);
      }
    });
  }

  function write(key, value) {
    return new Promise(function (resolve) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        resolve(value);
      } catch (err) {
        resolve(value);
      }
    });
  }

  function toHex(buffer) {
    var view = new Uint8Array(buffer);
    var hex = [];
    for (var i = 0; i < view.length; i++) {
      hex.push(('0' + view[i].toString(16)).slice(-2));
    }
    return hex.join('');
  }

  function randomSalt() {
    return new Promise(function (resolve) {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        resolve(toHex(crypto.getRandomValues(new Uint8Array(16))));
      } else {
        resolve(String(Math.random() * 16777216 | 0));
      }
    });
  }

  function hashPassword(password, salt) {
    var text = salt + password;
    return new Promise(function (resolve, reject) {
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        crypto.subtle.digest(HASH_ALGO, new TextEncoder().encode(text)).then(
          function (buffer) { resolve(toHex(buffer)); },
          reject
        );
      } else {
        var h = 0;
        for (var i = 0; i < text.length; i++) {
          h = ((h << 5) - h) + text.charCodeAt(i);
          h |= 0;
        }
        resolve(('00000000' + (h >>> 0).toString(16)).slice(-8));
      }
    });
  }

  /* ---------- Accounts ---------- */

  function getAccounts() {
    return read(KEYS.accounts, {});
  }

  function saveAccounts(accounts) {
    return write(KEYS.accounts, accounts);
  }

  function createAccount(account) {
    return getAccounts().then(function (accounts) {
      var emailKey = String(account.email || '').trim().toLowerCase();
      if (accounts[emailKey]) {
        return Promise.reject(new Error('An account already exists for this email.'));
      }
      return randomSalt().then(function (salt) {
        return hashPassword(String(account.password || ''), salt).then(function (hash) {
          accounts[emailKey] = {
            name: String(account.name || '').trim(),
            email: emailKey,
            salt: salt,
            hash: hash,
            createdAt: new Date().toISOString()
          };
          return saveAccounts(accounts);
        });
      });
    });
  }

  function getAuthAttempts() {
    return read('stubhouseAuthAttempts', {});
  }

  function saveAuthAttempts(attempts) {
    return write('stubhouseAuthAttempts', attempts);
  }

  function authenticate(email, password) {
    var emailKey = String(email || '').trim().toLowerCase();
    var now = new Date().getTime();

    return getAuthAttempts().then(function (attempts) {
      var record = attempts[emailKey];
      if (record && record.lockUntil && now < record.lockUntil) {
        return { ok: false, message: 'Too many failed attempts. Try again in 30 seconds.', locked: true };
      }
      return getAccounts().then(function (accounts) {
        var account = accounts[emailKey];
        if (!account) {
          return failAttempt(attempts, emailKey, now, { ok: false, message: 'No account found for this email — please sign up first.', locked: false });
        }
        return hashPassword(String(password || ''), account.salt).then(function (hash) {
          if (hash === account.hash) {
            attempts[emailKey] = { count: 0, lockUntil: 0 };
            return saveAuthAttempts(attempts).then(function () {
              return { ok: true, account: account };
            });
          }
          return failAttempt(attempts, emailKey, now, { ok: false, message: 'Incorrect password.', locked: false });
        });
      });
    });
  }

  function failAttempt(attempts, emailKey, now, result) {
    var record = attempts[emailKey] || { count: 0, lockUntil: 0 };
    record.count += 1;
    if (record.count >= LOCK_ATTEMPTS) {
      record.lockUntil = now + LOCK_MS;
      result.message = 'Too many failed attempts. Try again in 30 seconds.';
      result.locked = true;
    }
    attempts[emailKey] = record;
    return saveAuthAttempts(attempts).then(function () { return result; });
  }

  function getCurrentUser() {
    return read(KEYS.currentUser, null).then(function (user) {
      if (!user) return null;
      if (user.createdAt && new Date().getTime() - new Date(user.createdAt).getTime() > SESSION_MAX_AGE_MS) {
        return clearCurrentUser().then(function () { return null; });
      }
      return user;
    });
  }

  function setCurrentUser(user) {
    user.createdAt = user.createdAt || new Date().toISOString();
    return write(KEYS.currentUser, user);
  }

  function clearCurrentUser() {
    return new Promise(function (resolve) {
      localStorage.removeItem(KEYS.currentUser);
      resolve();
    });
  }

  /* ---------- Bookings ---------- */

  function getBookings() {
    return read(KEYS.bookings, []);
  }

  function saveBookings(bookings) {
    return write(KEYS.bookings, bookings);
  }

  function addBooking(booking) {
    return getBookings().then(function (list) {
      list.push(booking);
      return saveBookings(list).then(function () { return booking; });
    });
  }

  function getBooking(ref) {
    return getBookings().then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].ref === ref) return list[i];
      }
      return null;
    });
  }

  function cancelBooking(ref) {
    return getBookings().then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].ref === ref) {
          list[i].status = 'cancelled';
          return saveBookings(list).then(function () { return list[i]; });
        }
      }
      return null;
    });
  }

  /* Taken seats for a film key: seed taken seats (passed in) merged with seats
     from confirmed bookings. Persisted per film so a seat cannot be double-booked. */
  function getTakenSeats(filmKey, baseTaken) {
    return getBookings().then(function (bookings) {
      var taken = baseTaken ? baseTaken.slice() : [];
      for (var i = 0; i < bookings.length; i++) {
        var b = bookings[i];
        if (b.filmKey === filmKey && b.status === 'confirmed' && Array.isArray(b.seats)) {
          for (var j = 0; j < b.seats.length; j++) {
            if (taken.indexOf(b.seats[j]) === -1) taken.push(b.seats[j]);
          }
        }
      }
      taken.sort(function (a, b) { return a - b; });
      return taken;
    });
  }

  /* ---------- Holds ---------- */

  function nowMs() { return new Date().getTime(); }

  function holdDurationMs() {
    return HOLD_TEST_MINUTES ? HOLD_TEST_MINUTES * 60 * 1000 : HOLD_MINUTES * 60 * 1000;
  }

  function getHolds() {
    return read(KEYS.holds, []);
  }

  function saveHolds(holds) {
    return write(KEYS.holds, holds);
  }

  function cleanupExpiredHolds() {
    return getHolds().then(function (holds) {
      var now = nowMs();
      var active = holds.filter(function (h) { return h.expiresAt > now; });
      if (active.length !== holds.length) {
        return saveHolds(active).then(function () { return active; });
      }
      return active;
    });
  }

  function getActiveHoldsForShow(showId) {
    return cleanupExpiredHolds().then(function (holds) {
      return holds.filter(function (h) { return h.showId === showId; });
    });
  }

  function placeHold(showId, seats, holderId) {
    return cleanupExpiredHolds().then(function (holds) {
      /* release any existing hold by this holder on this show */
      holds = holds.filter(function (h) { return !(h.showId === showId && h.holderId === holderId); });
      var hold = {
        id: 'hd' + String(100000 + Math.floor(Math.random() * 900000)),
        showId: showId,
        seats: seats.slice().sort(function (a, b) { return a - b; }),
        holderId: holderId,
        expiresAt: nowMs() + holdDurationMs()
      };
      holds.push(hold);
      return saveHolds(holds).then(function () { return hold; });
    });
  }

  function releaseHold(holdId) {
    return getHolds().then(function (holds) {
      var idx = holds.findIndex(function (h) { return h.id === holdId; });
      if (idx === -1) return null;
      var removed = holds.splice(idx, 1)[0];
      return saveHolds(holds).then(function () { return removed; });
    });
  }

  function getTakenSeatsWithHolds(filmKey, baseTaken, showId) {
    return getTakenSeats(filmKey, baseTaken).then(function (taken) {
      return getActiveHoldsForShow(showId).then(function (holds) {
        holds.forEach(function (h) {
          h.seats.forEach(function (s) { if (taken.indexOf(s) === -1) taken.push(s); });
        });
        taken.sort(function (a, b) { return a - b; });
        return { taken: taken, holds: holds };
      });
    });
  }

  /* ---------- Theme ---------- */

  function getTheme() {
    return read(KEYS.theme, null);
  }

  function setTheme(theme) {
    return write(KEYS.theme, theme);
  }

  /* ---------- Promos ---------- */

  function getPromos() {
    return read(KEYS.promos, STUBHOUSE_PROMOS);
  }

  function validatePromo(code, subtotal) {
    return getPromos().then(function (promos) {
      var p = promos[code];
      if (!p) return { valid: false, message: 'Invalid promo code.' };
      var now = new Date().getTime();
      if (new Date(p.expiresAt).getTime() < now) return { valid: false, message: 'This promo code has expired.' };
      if (p.maxUses && p.usedCount >= p.maxUses) return { valid: false, message: 'This promo code is no longer available.' };
      if (p.minTotal && subtotal < p.minTotal) return { valid: false, message: 'Minimum order of ' + formatPrice(p.minTotal) + ' required.' };
      var discount = p.type === 'fixed' ? p.value : Math.round(subtotal * p.value / 100);
      return { valid: true, code: code, discount: discount, message: 'Promo applied.' };
    });
  }

  function formatPrice(egp) {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 }).format(egp || 0);
  }

  /* ---------- Watchlist ---------- */

  function getWatchlist() {
    return read(KEYS.watchlist, []);
  }

  function toggleWatchlist(filmKey) {
    return getWatchlist().then(function (list) {
      var idx = list.indexOf(filmKey);
      if (idx !== -1) {
        list.splice(idx, 1);
        return write(KEYS.watchlist, list).then(function () { return { watching: false, list: list }; });
      } else {
        list.push(filmKey);
        return write(KEYS.watchlist, list).then(function () { return { watching: true, list: list }; });
      }
    });
  }

  /* ---------- Reviews (F16) ---------- */
  function getReviews() {
    return read(KEYS.reviews, []);
  }

  function getReviewsForFilm(filmKey) {
    return getReviews().then(function (list) {
      return list.filter(function (r) { return r.filmKey === filmKey; });
    });
  }

  function userHasConfirmedBooking(email, filmKey) {
    return getBookings().then(function (bookings) {
      return bookings.some(function (b) {
        var be = (b.contact && b.contact.email) || b.userEmail;
        return be === email && b.filmKey === filmKey && b.status === 'confirmed';
      });
    });
  }

  function addReview(review) {
    return getCurrentUser().then(function (user) {
      if (!user) return Promise.reject(new Error('Sign in to leave a review.'));
      return userHasConfirmedBooking(user.email, review.filmKey).then(function (eligible) {
        if (!eligible) return Promise.reject(new Error('You can only review films you have seen (confirmed booking).'));
        return getReviews().then(function (list) {
          var idx = list.findIndex(function (r) { return r.filmKey === review.filmKey && r.userEmail === user.email; });
          if (idx !== -1) list.splice(idx, 1);
          list.push({
            filmKey: review.filmKey,
            userEmail: user.email,
            userName: user.name,
            rating: review.rating,
            dimensions: review.dimensions,
            text: review.text,
            createdAt: new Date().toISOString(),
            verified: true
          });
          return write(KEYS.reviews, list).then(function () { return list; });
        });
      });
    });
  }

  window.stubhouseApi = {
    getAccounts: getAccounts,
    saveAccounts: saveAccounts,
    createAccount: createAccount,
    authenticate: authenticate,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    clearCurrentUser: clearCurrentUser,
    getBookings: getBookings,
    saveBookings: saveBookings,
    addBooking: addBooking,
    getBooking: getBooking,
    cancelBooking: cancelBooking,
    getTakenSeats: getTakenSeats,
    getTakenSeatsWithHolds: getTakenSeatsWithHolds,
    placeHold: placeHold,
    releaseHold: releaseHold,
    cleanupExpiredHolds: cleanupExpiredHolds,
    getTheme: getTheme,
    setTheme: setTheme,
    getPromos: getPromos,
    validatePromo: validatePromo,
    getWatchlist: getWatchlist,
    toggleWatchlist: toggleWatchlist,
    getReviewsForFilm: getReviewsForFilm,
    addReview: addReview,
    userHasConfirmedBooking: userHasConfirmedBooking,
    HOLD_MINUTES: HOLD_MINUTES
  };

})();
