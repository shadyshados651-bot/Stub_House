/* ==========================================================
   book.js — booking engine for book.html (Phase 3).
   Flow: showtime -> seats -> snacks -> checkout.
   Needs js/seed.js, js/api.js, js/script.js loaded first.
   ========================================================== */
document.addEventListener('DOMContentLoaded', function () {

  var byId = function (id) { return document.getElementById(id); };

  var films = STUBHOUSE_FILMS;
  var shows = STUBHOUSE_SHOWS;
  var halls = STUBHOUSE_HALLS;
  var ticketTypes = STUBHOUSE_TICKET_TYPES;
  var fees = STUBHOUSE_FEES;
  var SEAT_COUNT = STUBHOUSE_SEAT_COUNT;
  var seatCode = stubhouseSeatCode;
  var formatPrice = stubhouseFormatPrice || function (v) { return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 }).format(v || 0); };
  var MAX_SEATS = 8;

  /* ---------- State ---------- */
  var state = {
    film: null,
    show: null,
    date: null,
    seats: [],
    ticketType: 'adult',
    ticketQty: 1,
    cart: [],
    promo: { code: null, discount: 0 },
    step: 1,
    holdId: null,
    holdExpiresAt: 0,
    holdTimer: null,
    contact: { name: '', email: '', phone: '' },
    payment: 'cash'
  };

  /* ---------- Elements ---------- */
  var el = {
    filmSelect: byId('bkFilmSelect'),
    dateStrip: byId('bkDateStrip'),
    showtimes: byId('bkShowtimes'),
    toSeats: byId('toSeats'),
    seatFilmTitle: byId('bkSeatFilmTitle'),
    seatShowInfo: byId('bkSeatShowInfo'),
    holdCountdown: byId('bkHoldCountdown'),
    seatMap: byId('bkSeatMap'),
    selectedSeatsLabel: byId('bkSelectedSeats'),
    seatTotalLabel: byId('bkSeatTotal'),
    ticketTypesPanel: byId('bkTicketTypes'),
    ttPriceAdult: byId('ttPriceAdult'),
    ttPriceStudent: byId('ttPriceStudent'),
    ttPriceChild: byId('ttPriceChild'),
    ticketTypeRadios: document.querySelectorAll('input[name="bkTicketType"]'),
    ticketQty: byId('bkTicketQty'),
    ticketMaxMsg: byId('bkTicketMaxMsg'),
    bestSeatsBtn: byId('bkBestSeatsBtn'),
    backToShowtime: byId('backToShowtime'),
    toSnacks: byId('toSnacks'),
    backToSeats2: byId('backToSeats2'),
    toCheckout: byId('toCheckout'),
    snackCombos: byId('bkSnackCombos'),
    snackGrid: byId('bkSnackGrid'),
    snackCart: byId('snackCart'),
    backToSnacks2: byId('backToSnacks2'),
    confirmBtn: byId('confirmPay'),
    backToSnacks: byId('backToSnacks2'),
    orderLines: byId('orderLines'),
    orderSubtotal: byId('orderSubtotal'),
    orderDiscount: byId('orderDiscount'),
    orderFee: byId('orderFee'),
    orderTax: byId('orderTax'),
    orderTotal: byId('orderTotal'),
    promoCode: byId('bkPromoCode'),
    applyPromo: byId('bkApplyPromo'),
    promoMsg: byId('bkPromoMsg'),
    promoDiscountLine: byId('bkPromoDiscountLine'),
    contactName: byId('bkContactName'),
    contactEmail: byId('bkContactEmail'),
    contactPhone: byId('bkContactPhone'),
    paymentRadios: document.querySelectorAll('input[name="bkPayment"]'),
    visaFields: byId('bkVisaFields'),
    payCardNumber: byId('payCardNumber'),
    payExpiry: byId('payExpiry'),
    payCvv: byId('payCvv'),
    demoLabel: byId('bkDemoLabel'),
    authNotice: byId('authNotice')
  };

  if (!el.seatMap) return;

  /* ---------- Helpers ---------- */
  function esc(text) { var t = document.createTextNode(String(text)); var d = document.createElement('span'); d.appendChild(t); return d.textContent; }

  function fmtDate(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
  }

  function numeric(a, b) { return a - b; }

  function indexToCode(index) { return seatCode(index); }

  function codeToIndex(code) {
    var m = /^([A-Z])(\d+)$/.exec(code);
    if (!m) return -1;
    var row = m[1].charCodeAt(0) - 65;
    var col = Number(m[2]) - 1;
    return row * 10 + col;
  }

  function clearHoldTimer() {
    if (state.holdTimer) { clearInterval(state.holdTimer); state.holdTimer = null; }
    if (el.holdCountdown) el.holdCountdown.style.display = 'none';
  }

  function startHoldCountdown() {
    clearHoldTimer();
    var expiresAt = state.holdExpiresAt;
    if (!expiresAt) return;
    el.holdCountdown.style.display = 'inline-flex';
    state.holdTimer = setInterval(function () {
      var remaining = Math.ceil((expiresAt - new Date().getTime()) / 1000);
      if (remaining <= 0) {
        clearHoldTimer();
        onHoldExpired();
        return;
      }
      var m = Math.floor(remaining / 60);
      var s = remaining % 60;
      el.holdCountdown.innerHTML = 'Seats held for <strong>' + pad2(m) + ':' + pad2(s) + '</strong> — complete payment before time runs out.';
    }, 1000);
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function showToast(message, kind) {
    var container = byId('stubhouseToast');
    if (!container) {
      container = document.createElement('div');
      container.id = 'stubhouseToast';
      container.style.cssText = 'position:fixed; left:50%; transform:translateX(-50%); bottom:20px; z-index:1100; display:flex; flex-direction:column; gap:8px;';
      document.body.appendChild(container);
    }
    var div = document.createElement('div');
    div.className = 'toast toast-' + (kind || 'info');
    div.setAttribute('aria-live', 'polite');
    div.textContent = message;
    if (kind === 'error') div.style.cssText = 'background:#ff7b7b; color:#140a08; padding:10px 16px; border-radius:6px; font-family:"Space Mono", monospace; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.35);';
    else if (kind === 'success') div.style.cssText = 'background:#2ee59d; color:#140a08; padding:10px 16px; border-radius:6px; font-family:"Space Mono", monospace; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.35);';
    else div.style.cssText = 'background:#f6b93b; color:#140a08; padding:10px 16px; border-radius:6px; font-family:"Space Mono", monospace; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.35);';
    container.appendChild(div);
    setTimeout(function () { div.remove(); }, 4000);
  }

  function showStep(n) {
    state.step = n;
    document.querySelectorAll('#bkSteps li').forEach(function (li) {
      var num = Number(li.getAttribute('data-step'));
      li.classList.toggle('active', num === n);
      li.classList.toggle('done', num < n);
    });
    document.querySelectorAll('.bk-panel').forEach(function (panel) { panel.classList.remove('active'); });
    var panel = byId('step' + ['showtime', 'seats', 'snacks', 'checkout'][n - 1]);
    if (panel) panel.classList.add('active');
    if (n === 4) renderCheckout();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Step 1: Showtime ---------- */
  function loadFilms() {
    el.filmSelect.innerHTML = '';
    Object.keys(films).forEach(function (key) {
      var f = films[key];
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = f.title + ' — ' + f.showtime;
      el.filmSelect.appendChild(opt);
    });
    state.film = el.filmSelect.value;
    loadDates();
  }

  function loadDates() {
    el.dateStrip.innerHTML = '';
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dates = [];
    for (var d = 0; d < 7; d++) {
      var dt = new Date(today);
      dt.setDate(dt.getDate() + d);
      dates.push({ str: fmtDate(dt), label: dayLabel(dt) });
    }
    dates.forEach(function (d) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (d.str === state.date ? ' selected' : '');
      btn.textContent = d.label;
      btn.setAttribute('data-date', d.str);
      btn.addEventListener('click', function () {
        state.date = d.str;
        el.dateStrip.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('selected', b === btn); });
        loadShowtimes();
      });
      el.dateStrip.appendChild(btn);
    });
    if (!state.date) state.date = dates[0].str;
    el.dateStrip.querySelectorAll('.chip')[0].classList.add('selected');
    loadShowtimes();
  }

  function dayLabel(dt) {
    var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var n = dt.getDate();
    var suffix = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : (['st', 'nd', 'rd'][n % 10 - 1] || 'th');
    return names[dt.getDay()] + ' ' + n + suffix + ' · ' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
  }

  function loadShowtimes() {
    el.showtimes.innerHTML = '';
    var filmShows = shows.filter(function (s) { return s.filmKey === state.film && s.date === state.date; });
    if (filmShows.length === 0) {
      el.showtimes.innerHTML = '<p style="color:var(--muted);">No showtimes for this date.</p>';
      el.toSeats.disabled = true;
      return;
    }
    filmShows.forEach(function (show) {
      var hall = halls[show.hallId];
      var card = document.createElement('div');
      card.className = 'bk-show-card';
      var info = document.createElement('div');
      info.className = 'bk-show-info';
      var t = document.createElement('h3');
      t.textContent = show.time;
      var meta = document.createElement('p');
      meta.className = 'bk-show-meta';
      meta.textContent = hall.name + ' · ' + hall.format + ' · ' + show.subtitles + ' subtitles';
      info.appendChild(t);
      info.appendChild(meta);
      var price = document.createElement('span');
      price.className = 'bk-show-price';
      price.textContent = formatPrice(show.prices.adult);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.textContent = 'Select';
      btn.addEventListener('click', function () { selectShow(show); });
      card.appendChild(info);
      card.appendChild(price);
      card.appendChild(btn);
      el.showtimes.appendChild(card);
    });
  }

  function selectShow(show) {
    state.show = show;
    el.showtimes.querySelectorAll('.bk-show-card').forEach(function (c) {
      c.classList.toggle('selected', c.querySelector('button').dataset.showId === show.id);
    });
    /* tag button for selection styling */
    el.showtimes.querySelectorAll('.bk-show-card button').forEach(function (b) { delete b.dataset.showId; });
    var btn = el.showtimes.querySelectorAll('.bk-show-card button')[shows.indexOf(show)];
    /* simpler: mark by text content match */
    el.showtimes.querySelectorAll('.bk-show-card').forEach(function (c) {
      if (c.querySelector('h3').textContent === show.time) {
        c.classList.add('selected');
        c.querySelector('button').dataset.showId = show.id;
      }
    });
    el.toSeats.disabled = false;
    showToast('Selected ' + show.time + ' — ' + halls[show.hallId].name + ' (' + halls[show.hallId].format + ')', 'info');
  }

  el.filmSelect.addEventListener('change', function () {
    state.film = el.filmSelect.value;
    state.date = null;
    loadDates();
  });

  el.toSeats.addEventListener('click', function () {
    if (!state.show) return;
    showStep(2);
    loadSeatMap();
  });

  /* ---------- Step 2: Seats ---------- */
  function loadSeatMap() {
    var show = state.show;
    var hall = halls[show.hallId];
    var film = films[show.filmKey];
    el.seatFilmTitle.textContent = film.title;
    el.seatShowInfo.textContent = show.date + ' · ' + show.time + ' · ' + hall.name + ' · ' + hall.format;
    el.seatMap.innerHTML = '';
    el.selectedSeatsLabel.textContent = 'None';
    el.seatTotalLabel.textContent = formatPrice(0);
    state.seats = [];

    /* ticket type prices for this show */
    el.ttPriceAdult.textContent = formatPrice(show.prices.adult);
    el.ttPriceStudent.textContent = formatPrice(show.prices.student);
    el.ttPriceChild.textContent = formatPrice(show.prices.child);

    /* place a hold when entering seat selection */
    stubhouseApi.placeHold(show.id, [], 'guest-' + Math.random().toString(36).slice(2)).then(function (hold) {
      state.holdId = hold.id;
      state.holdExpiresAt = hold.expiresAt;
      startHoldCountdown();
    });

    stubhouseApi.getTakenSeatsWithHolds(show.filmKey, films[show.filmKey].taken, show.id).then(function (res) {
      renderSeatMap(hall, res.taken, res.holds);
      updateTicketSummary();
    });
  }

  function renderSeatMap(hall, taken, holds) {
    var seatIndex = 0;
    var screenCenter = null;
    hall.rows.forEach(function (row) {
      var rowDiv = document.createElement('div');
      rowDiv.className = 'bk-seat-row';
      var rowLabel = document.createElement('span');
      rowLabel.className = 'bk-row-label';
      rowLabel.textContent = row.label;
      rowDiv.appendChild(rowLabel);
      var seatsDiv = document.createElement('div');
      seatsDiv.className = 'bk-seat-col';
      for (var s = 0; s < row.seats; s++) {
        (function (idx, isWheelchair, isRecliner) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'seat';
          btn.setAttribute('aria-label', 'Seat ' + indexToCode(idx));
          btn.setAttribute('role', 'checkbox');
          btn.setAttribute('aria-checked', 'false');
          var isTaken = taken.indexOf(idx) !== -1;
          var isHeld = false;
          holds.forEach(function (h) { if (h.seats.indexOf(idx) !== -1) isHeld = true; });
          if (isTaken) {
            btn.classList.add('taken');
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
          }
          if (isWheelchair) btn.classList.add('wheelchair');
          if (isRecliner) btn.classList.add('vip');
          btn.addEventListener('click', function () {
            if (btn.classList.contains('taken') || btn.disabled) return;
            toggleSeat(idx);
          });
          seatsDiv.appendChild(btn);
          idx++;
        })(seatIndex, row.wheelchair.indexOf(s) !== -1, row.recliner);
        seatIndex++;
      }
      if (row.aisleAfter.length) {
        var aisle = document.createElement('span');
        aisle.className = 'bk-aisle';
        aisle.textContent = 'AISLE';
        seatsDiv.appendChild(aisle);
      }
      rowDiv.appendChild(seatsDiv);
      el.seatMap.appendChild(rowDiv);
    });
  }

  function toggleSeat(idx) {
    var pos = state.seats.indexOf(idx);
    if (pos !== -1) {
      state.seats.splice(pos, 1);
    } else {
      if (state.seats.length >= MAX_SEATS) {
        showToast('Maximum ' + MAX_SEATS + ' seats per booking.', 'error');
        return;
      }
      state.seats.push(idx);
    }
    updateSeatUI();
    updateTicketSummary();
    renewHold();
  }

  function renewHold() {
    if (!state.show || !state.holdId) return;
    stubhouseApi.placeHold(state.show.id, state.seats, 'guest').then(function (hold) {
      state.holdId = hold.id;
      state.holdExpiresAt = hold.expiresAt;
      startHoldCountdown();
    });
  }

  function updateSeatUI() {
    var buttons = el.seatMap.querySelectorAll('.seat:not([disabled])');
    buttons.forEach(function (btn) {
      var idx = Array.prototype.indexOf.call(el.seatMap.querySelectorAll('.seat'), btn);
      if (state.seats.indexOf(idx) !== -1) {
        btn.classList.add('selected');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('selected');
        btn.setAttribute('aria-checked', 'false');
      }
    });
    var codes = state.seats.slice().sort(numeric).map(indexToCode);
    el.selectedSeatsLabel.textContent = codes.length ? codes.join(', ') : 'None';
    if (codes.length > MAX_SEATS) {
      el.ticketMaxMsg.style.display = 'block';
    } else {
      el.ticketMaxMsg.style.display = 'none';
    }
  }

  function bestAvailableSeats() {
    var show = state.show;
    var hall = halls[show.hallId];
    stubhouseApi.getTakenSeatsWithHolds(show.filmKey, films[show.filmKey].taken, show.id).then(function (res) {
      var taken = new Set(res.taken);
      var qty = Number(el.ticketQty.value);
      var available = [];
      hall.rows.forEach(function (row, r) {
        for (var s = 0; s < row.seats; s++) {
          var idx = seatIndexFor(r, s, hall);
          if (!taken.has(idx)) available.push(idx);
        }
      });
      /* pick a contiguous block in middle rows first */
      available.sort(function (a, b) { return a - b; });
      var picked = [];
      for (var i = 0; i < available.length - qty + 1; i++) {
        var block = available.slice(i, i + qty);
        var contiguous = true;
        for (var j = 1; j < qty; j++) { if (block[j] !== block[j - 1] + 1) { contiguous = false; break; } }
        if (contiguous) { picked = block; break; }
      }
      if (picked.length === 0) picked = available.slice(0, qty);
      state.seats = picked.slice().sort(numeric);
      updateSeatUI();
      updateTicketSummary();
      renewHold();
      showToast(picked.length + ' seat(s) selected.', 'info');
    });
  }

  function seatIndexFor(rowIdx, seatIdx, hall) {
    var idx = 0;
    for (var r = 0; r < rowIdx; r++) idx += hall.rows[r].seats;
    return idx + seatIdx;
  }

  el.bestSeatsBtn.addEventListener('click', bestAvailableSeats);

  el.ticketTypeRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      state.ticketType = r.value;
      updateTicketSummary();
    });
  });

  el.ticketQty.addEventListener('change', function () {
    state.ticketQty = Number(el.ticketQty.value);
    if (state.seats.length > state.ticketQty) state.seats = state.seats.slice(0, state.ticketQty);
    updateSeatUI();
    updateTicketSummary();
    renewHold();
  });

  el.backToShowtime.addEventListener('click', function () { showStep(1); });

  el.toSnacks.addEventListener('click', function () {
    if (state.seats.length === 0) {
      showToast('Pick at least one seat first.', 'error');
      return;
    }
    if (state.seats.length > state.ticketQty) {
      showToast('Seat count exceeds ticket quantity.', 'error');
      return;
    }
    showStep(3);
    renderSnacks();
  });

  /* ---------- Hold expiry ---------- */
  function onHoldExpired() {
    clearHoldTimer();
    stubhouseApi.releaseHold(state.holdId).then(function () {
      state.holdId = null;
      state.holdExpires = 0;
      showToast('Your seat hold expired. Seats released — pick again.', 'error');
      state.seats = [];
      updateSeatUI();
      updateTicketSummary();
      loadSeatMap();
    });
  }

  /* ---------- Ticket summary ---------- */
  function updateTicketSummary() {
    var show = state.show;
    if (!show) return;
    var price = show.prices[state.ticketType];
    var total = state.seats.length * price;
    el.seatTotalLabel.textContent = formatPrice(total);
  }

  /* ---------- Step 3: Snacks ---------- */
  var snackItems = {
    popcorn: { name: 'Popcorn', type: 'popcorn', sizes: [ { v: 'Small', p: 4 }, { v: 'Medium', p: 6, sel: true }, { v: 'Large', p: 8 } ], types: ['Salted', 'Butter', 'Caramel', 'Cheese'] },
    drink: { name: 'Soft Drink', type: 'drink', sizes: [ { v: 'Small', p: 2 }, { v: 'Medium', p: 3, sel: true }, { v: 'Large', p: 4 } ], types: ['Cola', 'Lemon-Lime', 'Orange', 'Iced Tea'] }
  };

  function renderSnacks() {
    el.snackGrid.innerHTML = '';
    Object.keys(snackItems).forEach(function (key) {
      var item = snackItems[key];
      var card = document.createElement('article');
      card.className = 'snack-card';
      var img = document.createElement('img');
      img.src = 'images/' + key + '-600w.jpg';
      img.alt = item.name;
      img.width = 600;
      img.height = 450;
      img.loading = 'lazy';
      var body = document.createElement('div');
      body.className = 'snack-body';
      var h = document.createElement('h3');
      h.textContent = item.name;
      var typeSel = document.createElement('select');
      typeSel.id = key + 'Type';
      item.types.forEach(function (ty) {
        var o = document.createElement('option'); o.value = ty; o.textContent = ty; typeSel.appendChild(o);
      });
      var sizeSel = document.createElement('select');
      sizeSel.id = key + 'Size';
      item.sizes.forEach(function (sz) {
        var o = document.createElement('option'); o.value = sz.v; o.textContent = sz.v + ' — ' + formatPrice(sz.p); if (sz.sel) o.selected = true; sizeSel.appendChild(o);
      });
      var qty = 1;
      var qtyRow = document.createElement('div');
      qtyRow.className = 'snack-action-row';
      var minus = document.createElement('button');
      minus.type = 'button'; minus.className = 'qty-btn'; minus.textContent = '−';
      var qtyVal = document.createElement('span');
      qtyVal.className = 'qty-value'; qtyVal.textContent = qty;
      var plus = document.createElement('button');
      plus.type = 'button'; plus.className = 'qty-btn'; plus.textContent = '＋';
      var linePrice = document.createElement('span');
      linePrice.className = 'snack-line-price';
      linePrice.textContent = formatPrice(item.sizes[1].p);
      qtyRow.appendChild(minus); qtyRow.appendChild(qtyVal); qtyRow.appendChild(plus); qtyRow.appendChild(linePrice);
      var addBtn = document.createElement('button');
      addBtn.type = 'button'; addBtn.className = 'btn btn-primary snack-add'; addBtn.textContent = 'Add to Order';
      body.appendChild(h);
      body.appendChild(typeSel);
      body.appendChild(sizeSel);
      body.appendChild(qtyRow);
      body.appendChild(addBtn);
      card.appendChild(img); card.appendChild(body);
      el.snackGrid.appendChild(card);

      minus.addEventListener('click', function () { qty = Math.max(1, qty - 1); qtyVal.textContent = qty; linePrice.textContent = formatPrice(getSizePrice(sizeSel.value) * qty); });
      plus.addEventListener('click', function () { qty = Math.min(10, qty + 1); qtyVal.textContent = qty; linePrice.textContent = formatPrice(getSizePrice(sizeSel.value) * qty); });
      sizeSel.addEventListener('change', function () { linePrice.textContent = formatPrice(getSizePrice(sizeSel.value) * qty); });
      addBtn.addEventListener('click', function () {
        addToCart(key, typeSel.value, sizeSel.value, qty);
        showToast(item.name + ' added.', 'success');
      });
    });
    renderSnackCart();
  }

  function getSizePrice(v) {
    var found = null;
    Object.keys(snackItems).forEach(function (k) { snackItems[k].sizes.forEach(function (sz) { if (sz.v === v) found = sz.p; }); });
    return found;
  }

  function addToCart(item, type, size, q) {
    var existing = null;
    state.cart.forEach(function (e) { if (e.item === item && e.type === type && e.size === size) existing = e; });
    if (existing) existing.qty = Math.min(existing.qty + q, 20);
    else state.cart.push({ item: item, type: type, size: size, qty: q });
    renderSnackCart();
  }

  function renderSnackCart() {
    el.snackCart.querySelector('.snack-cart-list').innerHTML = '';
    var list = el.snackCart.querySelector('.snack-cart-list');
    if (state.cart.length === 0) {
      var empty = document.createElement('li'); empty.className = 'cart-empty'; empty.textContent = 'Nothing added yet — snacks are optional.'; list.appendChild(empty); return;
    }
    state.cart.forEach(function (e, index) {
      var li = document.createElement('li');
      var label = document.createElement('span');
      label.textContent = e.qty + '× ' + e.type + ' ' + findItemName(e.item) + ' (' + e.size + ')';
      var right = document.createElement('span'); right.className = 'cart-line-right';
      var price = document.createElement('span'); price.textContent = formatPrice(e.qty * getSizePrice(e.size));
      var rem = document.createElement('button'); rem.type = 'button'; rem.className = 'cart-remove'; rem.textContent = 'Remove';
      rem.addEventListener('click', function () { state.cart.splice(index, 1); renderSnackCart(); });
      right.appendChild(price); right.appendChild(rem);
      li.appendChild(label); li.appendChild(right); list.appendChild(li);
    });
  }

  function findItemName(key) { return snackItems[key] ? snackItems[key].name : key; }

  el.backToSeats2.addEventListener('click', function () { showStep(2); });
  el.toCheckout.addEventListener('click', function () {
    if (state.seats.length === 0) { showToast('Pick at least one seat.', 'error'); return; }
    showStep(4);
  });

  /* ---------- Step 4: Checkout ---------- */
  function renderCheckout() {
    var show = state.show;
    var film = films[show.filmKey];
    var hall = halls[show.hallId];
    var codes = state.seats.slice().sort(numeric).map(indexToCode);
    var unit = show.prices[state.ticketType];
    var subtotal = codes.length * unit;
    var discount = state.promo.discount;
    var afterDiscount = Math.max(0, subtotal - discount);
    var fee = fees.serviceFee;
    var tax = Math.round((afterDiscount + fee) * fees.taxRate * 100) / 100;
    var total = afterDiscount + fee + tax;

    el.orderLines.innerHTML = '';
    function addLine(label, text, amount) {
      var row = document.createElement('div'); row.className = 'order-line';
      var left = document.createElement('div');
      var l = document.createElement('span'); l.className = 'stub-label'; l.textContent = label;
      var v = document.createElement('span'); v.className = 'stub-value'; v.textContent = text;
      left.appendChild(l); left.appendChild(v); row.appendChild(left);
      if (amount !== undefined) {
        var a = document.createElement('span'); a.className = 'order-line-value'; a.textContent = formatPrice(amount); row.appendChild(a);
      }
      el.orderLines.appendChild(row);
    }
    addLine('Film', film.title + ' — ' + hall.name + ' · ' + hall.format);
    addLine('Showtime', show.date + ' · ' + show.time);
    addLine('Seats', codes.join(', ') + ' (' + codes.length + ' × ' + formatPrice(unit) + ' ' + ticketTypes[state.ticketType].label + ')', subtotal);
    if (discount) addLine('Discount (' + state.promo.code + ')', '− ' + state.promo.value + '%', -discount);
    state.cart.forEach(function (s) {
      addLine(findItemName(s.item), s.qty + '× ' + s.type + ' (' + s.size + ')', s.qty * getSizePrice(s.size));
    });
    addLine('Service fee', 'Per order', fee);
    addLine('Tax (5%)', 'On subtotal + fee', tax);

    el.orderSubtotal.textContent = formatPrice(subtotal);
    el.orderDiscount.textContent = discount ? '− ' + formatPrice(discount) : formatPrice(0);
    el.orderFee.textContent = formatPrice(fee);
    el.orderTax.textContent = formatPrice(tax);
    el.orderTotal.textContent = formatPrice(total);

    el.orderTotal.dataset.total = total;
    el.orderTotal.dataset.subtotal = subtotal;
  }

  /* Promo */
  el.applyPromo.addEventListener('click', function () {
    var code = el.promoCode.value.trim().toUpperCase();
    var subtotal = Number(el.orderTotal.dataset.subtotal || 0);
    if (!code) { el.promoMsg.textContent = 'Enter a code.'; return; }
    stubhouseApi.validatePromo(code, subtotal).then(function (res) {
      if (res.valid) {
        state.promo = { code: res.code, discount: res.discount };
        el.promoMsg.textContent = res.message;
        el.promoMsg.style.color = 'var(--seat-free)';
        el.promoDiscountLine.textContent = 'Discount: − ' + formatPrice(res.discount);
        renderCheckout();
      } else {
        el.promoMsg.textContent = res.message;
        el.promoMsg.style.color = 'var(--error)';
        el.promoDiscountLine.textContent = '';
      }
    });
  });

  /* Payment UI */
  el.paymentRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      state.payment = r.value;
      el.visaFields.style.display = r.value === 'card' ? 'grid' : 'none';
    });
  });

  el.payCardNumber.addEventListener('input', function () {
    var v = el.payCardNumber.value.replace(/\D/g, '').slice(0, 16);
    var groups = [];
    for (var i = 0; i < v.length; i += 4) groups.push(v.slice(i, i + 4));
    el.payCardNumber.value = groups.join(' ');
  });

  /* Card validation */
  function cardBrand(v) {
    if (/^4/.test(v)) return 'visa';
    if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)$/.test(v)) return 'mastercard';
    return null;
  }
  function luhnValid(v) {
    var d = v.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(d)) return false;
    var sum = 0, alt = false;
    for (var i = d.length - 1; i >= 0; i--) {
      var n = Number(d.charAt(i));
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }
  function expiryValid(v) {
    var m = v.trim().match(/^(\d{2})\/(\d{2})$/);
    if (!m) return false;
    var mo = Number(m[1]), yr = Number(m[2]) + 2000;
    if (mo < 1 || mo > 12) return false;
    var now = new Date();
    var limit = new Date(now.getFullYear(), now.getMonth(), 1);
    return yr > limit.getFullYear() || (yr === limit.getFullYear() && mo >= limit.getMonth());
  }
  function setValidity(input, errorEl, ok) {
    if (ok) { input.classList.remove('invalid'); errorEl.classList.remove('show'); }
    else { input.classList.add('invalid'); errorEl.classList.add('show'); }
  }

  /* Confirm & Pay */
  el.confirmBtn.addEventListener('click', function () {
    var totals = computeTotals();
    if (totals.codes.length === 0) { showToast('Pick at least one seat before confirming.', 'error'); return; }

    /* contact validation */
    var nameOk = el.contactName.value.trim().length > 0;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.contactEmail.value.trim());
    var phoneOk = /^01[0125]\d{8}$/.test(el.contactPhone.value.trim());
    byId('bkContactNameError').classList.toggle('show', !nameOk);
    byId('bkContactEmailError').classList.toggle('show', !emailOk);
    byId('bkContactPhoneError').classList.toggle('show', !phoneOk);
    el.contactName.classList.toggle('invalid', !nameOk);
    el.contactEmail.classList.toggle('invalid', !emailOk);
    el.contactPhone.classList.toggle('invalid', !phoneOk);
    if (!nameOk || !emailOk || !phoneOk) { showToast('Please fill in your contact details.', 'error'); return; }

    /* card validation if card */
    if (state.payment === 'card') {
      var raw = el.payCardNumber.value.replace(/\s/g, '');
      var brand = cardBrand(raw);
      var cv = el.payCvv.value.trim();
      var cvLen = brand === 'visa' ? 3 : 3;
      var cardOk = brand !== null && luhnValid(raw);
      var expOk = expiryValid(el.payExpiry.value);
      var cvvOk = new RegExp('^\\d{' + cvLen + '}$').test(cv);
      setValidity(el.payCardNumber, byId('payCardNumberError'), cardOk);
      setValidity(el.payExpiry, byId('payExpiryError'), expOk);
      setValidity(el.payCvv, byId('payCvvError'), cvvOk);
      if (!cardOk) byId('payCardNumberError').textContent = 'Invalid card number (unknown brand or failed Luhn check).';
      if (!expOk) byId('payExpiryError').textContent = 'Expiry date must be in the future.';
      if (!cvvOk) byId('payCvvError').textContent = 'CVV must be ' + cvLen + ' digits.';
      if (!cardOk || !expOk || !cvvOk) return;
      /* sandbox outcomes */
      el.confirmBtn.disabled = true;
      var orig = el.confirmBtn.textContent;
      el.confirmBtn.textContent = 'Processing…';
      setTimeout(function () {
        if (raw === '4000000000000002') {
          el.confirmBtn.disabled = false;
          el.confirmBtn.textContent = orig;
          showToast('Payment declined by the bank. Try another card or cash at counter.', 'error');
        } else {
          finishBooking('card', raw === '4111111111111111' ? 'paid' : 'paid', raw.slice(-4));
        }
      }, 1200);
      return;
    }
    finishBooking(state.payment, state.payment === 'cash' ? 'pending' : 'paid');
  });

  function computeTotals() {
    var show = state.show;
    var codes = state.seats.slice().sort(numeric).map(indexToCode);
    return { codes: codes, show: show };
  }

  function finishBooking(method, status, last4) {
    var show = state.show;
    var film = films[show.filmKey];
    var hall = halls[show.hallId];
    var codes = state.seats.slice().sort(numeric).map(indexToCode);
    var unit = show.prices[state.ticketType];
    var subtotal = codes.length * unit;
    var discount = state.promo.discount;
    var afterDiscount = Math.max(0, subtotal - discount);
    var fee = fees.serviceFee;
    var tax = Math.round((afterDiscount + fee) * fees.taxRate * 100) / 100;
    var total = afterDiscount + fee + tax;

    var booking = {
      ref: 'STB-' + bookingRef(),
      filmKey: show.filmKey,
      film: film.title,
      screen: hall.name,
      showtime: show.date + ' ' + show.time,
      showId: show.id,
      seats: codes,
      tickets: [{ type: ticketTypes[state.ticketType].label, qty: codes.length, unit: unit }],
      snacks: state.cart,
      subtotal: subtotal,
      discount: discount,
      fee: fee,
      tax: tax,
      total: total,
      currency: 'EGP',
      payment: { method: method, status: status, last4: last4 },
      contact: {
        name: el.contactName.value.trim(),
        email: el.contactEmail.value.trim(),
        phone: el.contactPhone.value.trim()
      },
      status: status === 'paid' ? 'confirmed' : 'pending',
      createdAt: new Date().toISOString()
    };

    stubhouseApi.addBooking(booking).then(function () {
      if (state.holdId) stubhouseApi.releaseHold(state.holdId);
      clearHoldTimer();
      var snackNote = state.cart.length ? ' including ' + formatPrice(snackTotal()) + ' of snacks' : '';
      if (method === 'cash') {
        showToast('Booked ' + codes.join(', ') + ' for ' + formatPrice(total) + snackNote + '. Pay at the counter within 30 minutes — booking expires otherwise.', 'success');
      } else if (status === 'pending') {
        showToast('Wallet payment pending. Code 123456 (demo).', 'success');
      } else {
        showToast('Booked ' + codes.join(', ') + ' for ' + formatPrice(total) + snackNote + ' — paid by ' + method + '.', 'success');
      }
      window.location.href = 'bookings.html';
    });
  }

  function snackTotal() {
    return state.cart.reduce(function (sum, s) { return sum + s.qty * getSizePrice(s.size); }, 0);
  }

  function bookingRef() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var ref = '';
    for (var i = 0; i < 6; i++) ref += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return ref;
  }

  /* ---------- Init ---------- */
  loadFilms();
  window.addEventListener('storage', function () { if (state.step > 1) loadSeatMap(); });

});
