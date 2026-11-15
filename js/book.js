/* ==========================================================
   book.js — logic for the booking page (book.html) only.
   Flow: 1) pick seats  ->  2) pick snacks  ->  3) checkout.
   Needs js/seed.js and js/script.js loaded first.
   Bookings go through stubhouseApi (js/api.js) — the only
   module that touches localStorage.
   ========================================================== */
document.addEventListener('DOMContentLoaded', function () {

  var seatMapEl = byId('bkSeatMap');
  if (!seatMapEl) return;

  var films = STUBHOUSE_FILMS;
  var SEAT_COUNT = STUBHOUSE_SEAT_COUNT;
  var seatCode = stubhouseSeatCode;
  var MAX_SEATS = 8;

  function byId(id) { return document.getElementById(id); }

  var filmSelect = byId('bkFilmSelect');
  var filmInfo = byId('bkFilmInfo');
  var selectedSeatsLabel = byId('bkSelectedSeats');
  var seatTotalLabel = byId('bkSeatTotal');
  var toSnacksBtn = byId('toSnacks');

  var panels = [byId('stepSeats'), byId('stepSnacks'), byId('stepCheckout')];
  var stepItems = document.querySelectorAll('#bkSteps li');

  var cartList = byId('snackCart');
  var orderLines = byId('orderLines');
  var orderTotalLabel = byId('orderTotal');
  var confirmBtn = byId('confirmPay');

  var snackCards = {
    popcorn: { name: 'Popcorn', type: byId('popcornType'), size: byId('popcornSize'), qty: byId('popcornQty'), price: byId('popcornPrice') },
    drink: { name: 'Drink', type: byId('drinkType'), size: byId('drinkSize'), qty: byId('drinkQty'), price: byId('drinkPrice') }
  };
  var qty = { popcorn: 1, drink: 1 };

  var state = { film: 'interstellar', selected: {}, cart: [], step: 1 };
  Object.keys(films).forEach(function (key) { state.selected[key] = []; });

  /* ---------- Seat capacity message (inline) ---------- */
  var capMessage = document.createElement('p');
  capMessage.id = 'seatCapMessage';
  capMessage.className = 'form-error';
  capMessage.style.cssText = 'margin:8px auto 0; text-align:center; font-family:"Space Mono", monospace; font-size:0.78rem;';
  seatMapEl.parentNode.insertBefore(capMessage, seatMapEl.nextSibling);
  function hideCapMessage() { capMessage.classList.remove('show'); capMessage.textContent = ''; }
  function showCapMessage(text) { capMessage.textContent = text; capMessage.classList.add('show'); }

  function getCurrentUser() {
    return stubhouseApi.getCurrentUser();
  }

  function unitPrice(item, size) {
    var options = snackCards[item].size.options;
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === size) return Number(options[i].getAttribute('data-price'));
    }
    return null;
  }

  function hasOption(selectEl, value) {
    for (var i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === value) return true;
    }
    return false;
  }

  function cleanCartEntry(entry) {
    if (!entry || !snackCards[entry.item]) return null;
    var card = snackCards[entry.item];
    var q = Math.floor(Number(entry.qty));
    if (!hasOption(card.type, entry.type) || unitPrice(entry.item, entry.size) === null) return null;
    if (!(q >= 1)) return null;
    return { item: entry.item, type: entry.type, size: entry.size, qty: Math.min(q, 20) };
  }

  function saveDraft() {
    try {
      sessionStorage.setItem('stubhouseDraft', JSON.stringify({
        film: state.film,
        selected: state.selected,
        cart: state.cart,
        step: state.step
      }));
    } catch (err) {}
  }

  function loadDraft() {
    var draft;
    try {
      draft = JSON.parse(sessionStorage.getItem('stubhouseDraft'));
    } catch (err) {
      return;
    }
    if (!draft || typeof draft !== 'object') return;

    if (draft.film && films[draft.film]) state.film = draft.film;

    if (draft.selected) {
      Object.keys(films).forEach(function (key) {
        if (!Array.isArray(draft.selected[key])) return;
        state.selected[key] = draft.selected[key].filter(function (n, i, arr) {
          return typeof n === 'number' && n >= 0 && n < SEAT_COUNT &&
                 arr.indexOf(n) === i;
        });
      });
    }

    if (Array.isArray(draft.cart)) {
      draft.cart.forEach(function (entry) {
        var clean = cleanCartEntry(entry);
        if (clean) state.cart.push(clean);
      });
    }

    if (draft.step === 2 || draft.step === 3) state.step = draft.step;
  }

  function numeric(a, b) { return a - b; }

  function currentSeatCodes() {
    return state.selected[state.film].slice().sort(numeric).map(function (s) { return seatCode(s); });
  }

  function updateFilmInfo() {
    var data = films[state.film];
    filmInfo.textContent = 'Screen ' + data.screen + ' · ' + data.showtime + ' · ' + formatPrice(data.price) + ' per seat';
  }

  function updateSeatSummary() {
    var codes = currentSeatCodes();
    selectedSeatsLabel.textContent = codes.length ? codes.join(', ') : 'None';
    seatTotalLabel.textContent = formatPrice(codes.length * films[state.film].price);
    toSnacksBtn.disabled = codes.length === 0;
    hideCapMessage();
  }

  function renderSeats() {
    seatMapEl.innerHTML = '';
    var data = films[state.film];
    var selected = state.selected[state.film];

    stubhouseApi.getTakenSeats(state.film, data.taken).then(function (taken) {
      for (var i = 0; i < SEAT_COUNT; i++) {
        (function (i) {
          var seatBtn = document.createElement('button');
          seatBtn.type = 'button';
          seatBtn.classList.add('seat');
          seatBtn.setAttribute('aria-label', 'Seat ' + seatCode(i));
          seatBtn.setAttribute('role', 'checkbox');
          seatBtn.setAttribute('aria-checked', 'false');
          if (taken.indexOf(i) !== -1) {
            seatBtn.classList.add('taken');
            seatBtn.disabled = true;
            seatBtn.setAttribute('aria-checked', 'false');
            seatBtn.setAttribute('aria-disabled', 'true');
          }
          if (selected.indexOf(i) !== -1) {
            seatBtn.classList.add('selected');
            seatBtn.setAttribute('aria-checked', 'true');
          }
          seatBtn.addEventListener('click', function () {
            if (seatBtn.classList.contains('taken')) return;
            var already = selected.indexOf(i) !== -1;
            if (already) {
              seatBtn.classList.remove('selected');
              seatBtn.setAttribute('aria-checked', 'false');
              state.selected[state.film] = state.selected[state.film].filter(function (s) { return s !== i; });
            } else {
              if (selected.length >= MAX_SEATS) {
                showCapMessage('Maximum ' + MAX_SEATS + ' seats per booking. Remove a seat first.');
                return;
              }
              seatBtn.classList.add('selected');
              seatBtn.setAttribute('aria-checked', 'true');
              state.selected[state.film].push(i);
            }
            updateSeatSummary();
            saveDraft();
          });
          seatMapEl.appendChild(seatBtn);
        })(i);
      }
      updateFilmInfo();
      updateSeatSummary();
    });
  }

  filmSelect.addEventListener('change', function () {
    state.film = filmSelect.value;
    renderSeats();
    saveDraft();
  });

  function updateCardPrice(item) {
    var card = snackCards[item];
    card.qty.textContent = qty[item];
    card.price.textContent = formatPrice(unitPrice(item, card.size.value) * qty[item]);
  }

  document.querySelectorAll('.qty-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.getAttribute('data-item');
      var next = qty[item] + Number(btn.getAttribute('data-delta'));
      qty[item] = Math.max(1, Math.min(10, next));
      updateCardPrice(item);
    });
  });

  Object.keys(snackCards).forEach(function (item) {
    snackCards[item].size.addEventListener('change', function () { updateCardPrice(item); });
  });

  function renderCart() {
    cartList.innerHTML = '';
    if (state.cart.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'cart-empty';
      empty.textContent = 'Nothing added yet — snacks are optional.';
      cartList.appendChild(empty);
      return;
    }
    state.cart.forEach(function (entry, index) {
      var li = document.createElement('li');

      var label = document.createElement('span');
      label.textContent = entry.qty + '× ' + entry.type + ' ' + snackCards[entry.item].name + ' (' + entry.size + ')';

      var right = document.createElement('span');
      right.className = 'cart-line-right';

      var price = document.createElement('span');
      price.textContent = formatPrice(entry.qty * unitPrice(entry.item, entry.size));

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cart-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', function () {
        state.cart.splice(index, 1);
        renderCart();
        saveDraft();
      });

      right.appendChild(price);
      right.appendChild(remove);
      li.appendChild(label);
      li.appendChild(right);
      cartList.appendChild(li);
    });
  }

  function addToCart(item) {
    var card = snackCards[item];
    var type = card.type.value;
    var size = card.size.value;

    var existing = null;
    state.cart.forEach(function (entry) {
      if (entry.item === item && entry.type === type && entry.size === size) existing = entry;
    });

    if (existing) {
      existing.qty = Math.min(existing.qty + qty[item], 20);
    } else {
      state.cart.push({ item: item, type: type, size: size, qty: qty[item] });
    }
    renderCart();
    saveDraft();
  }

  document.querySelectorAll('.snack-add').forEach(function (btn) {
    var originalText = btn.textContent;
    var resetTimer;
    btn.addEventListener('click', function () {
      addToCart(btn.getAttribute('data-item'));
      btn.textContent = 'Added ✓';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { btn.textContent = originalText; }, 900);
    });
  });

  function computeTotals() {
    var data = films[state.film];
    var codes = currentSeatCodes();
    var ticketsTotal = codes.length * data.price;
    var snacks = state.cart.map(function (entry) {
      return { item: snackCards[entry.item].name, type: entry.type, size: entry.size, qty: entry.qty, unit: unitPrice(entry.item, entry.size) };
    });
    var snacksTotal = snacks.reduce(function (sum, sn) { return sum + sn.qty * sn.unit; }, 0);
    return { codes: codes, ticketsTotal: ticketsTotal, snacks: snacks, snacksTotal: snacksTotal, total: ticketsTotal + snacksTotal };
  }

  function addOrderLine(label, text, amount) {
    var row = document.createElement('div');
    row.className = 'order-line';

    var left = document.createElement('div');
    var labelEl = document.createElement('span');
    labelEl.className = 'stub-label';
    labelEl.textContent = label;
    var textEl = document.createElement('span');
    textEl.className = 'stub-value';
    textEl.textContent = text;
    left.appendChild(labelEl);
    left.appendChild(textEl);
    row.appendChild(left);

    if (amount !== undefined) {
      var amountEl = document.createElement('span');
      amountEl.className = 'order-line-value';
      amountEl.textContent = formatPrice(amount);
      row.appendChild(amountEl);
    }
    orderLines.appendChild(row);
  }

  function renderCheckout() {
    var data = films[state.film];
    var totals = computeTotals();
    orderLines.innerHTML = '';

    addOrderLine('Film', data.title + ' — Screen ' + data.screen + ', ' + data.showtime);
    addOrderLine('Seats (' + totals.codes.length + ' × ' + formatPrice(data.price) + ')', totals.codes.join(', '), totals.ticketsTotal);
    totals.snacks.forEach(function (sn) {
      addOrderLine(sn.item, sn.qty + '× ' + sn.type + ' (' + sn.size + ')', sn.qty * sn.unit);
    });

    orderTotalLabel.textContent = formatPrice(totals.total);
  }

  function showStep(n, scroll) {
    state.step = n;
    panels.forEach(function (panel, i) { panel.classList.toggle('active', i === n - 1); });
    stepItems.forEach(function (li) {
      var num = Number(li.getAttribute('data-step'));
      li.classList.toggle('active', num === n);
      li.classList.toggle('done', num < n);
    });
    if (n === 2) renderCart();
    if (n === 3) {
      renderCheckout();
    }
    saveDraft();
    if (scroll) {
      window.scrollTo({ top: stepsBarOffset() + window.scrollY - 110, behavior: 'smooth' });
    }
  }

  function stepsBarOffset() {
    var bar = byId('bkSteps');
    return bar ? bar.getBoundingClientRect().top : 0;
  }

  function requireSeats() {
    if (currentSeatCodes().length === 0) {
      showToast('Pick at least one seat first.', 'error');
      showStep(1, true);
      return false;
    }
    return true;
  }

  toSnacksBtn.addEventListener('click', function () { if (requireSeats()) showStep(2, true); });
  byId('backToSeats').addEventListener('click', function () { showStep(1, true); });
  byId('toCheckout').addEventListener('click', function () { if (requireSeats()) showStep(3, true); });
  byId('backToSnacks').addEventListener('click', function () { showStep(2, true); });

  /* ---------- Card validation (sandbox demo) ---------- */
  function cardBrand(value) {
    var v = value.replace(/\s/g, '');
    if (/^4/.test(v)) return 'visa';
    if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)$/.test(v)) return 'mastercard';
    return null;
  }

  function luhnValid(value) {
    var digits = value.replace(/\s/g, '');
    if (!/^\d+$/.test(digits) || digits.length < 13 || digits.length > 19) return false;
    var sum = 0;
    var alternate = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = Number(digits.charAt(i));
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  function formatCardInput(value) {
    var v = value.replace(/\D/g, '');
    if (v.length > 16) v = v.slice(0, 16);
    var groups = [];
    for (var i = 0; i < v.length; i += 4) groups.push(v.slice(i, i + 4));
    return groups.join(' ');
  }

  function isValidExpiry(value) {
    var m = value.trim().match(/^(\d{2})\/(\d{2})$/);
    if (!m) return false;
    var month = Number(m[1]);
    var year = Number(m[2]) + 2000;
    if (month < 1 || month > 12) return false;
    var now = new Date();
    var limit = new Date(now.getFullYear(), now.getMonth(), 1);
    return year > limit.getFullYear() || (year === limit.getFullYear() && month >= limit.getMonth());
  }

  function cvvLength(brand) {
    return brand === 'visa' ? 3 : 3;
  }

  var cardInput = byId('payCardNumber');
  if (cardInput) {
    cardInput.addEventListener('input', function () {
      cardInput.value = formatCardInput(cardInput.value);
    });
  }

  function setValidity(input, errorEl, isValid) {
    if (isValid) {
      input.classList.remove('invalid');
      errorEl.classList.remove('show');
    } else {
      input.classList.add('invalid');
      errorEl.classList.add('show');
    }
  }

  /* ---------- Confirm & pay ---------- */
  confirmBtn.addEventListener('click', function () {
    var totals = computeTotals();
    if (totals.codes.length === 0) {
      showToast('Pick at least one seat before confirming.', 'error');
      showStep(1, true);
      return;
    }

    stubhouseApi.getTakenSeats(state.film, films[state.film].taken).then(function (taken) {
      var takenNow = totals.codes.filter(function (s) { return taken.indexOf(s) !== -1; });
      if (takenNow.length) {
        showToast('Some seats were just taken by someone else. Please pick again.', 'error');
        renderSeats();
        showStep(1, true);
        return;
      }

      var paymentMethod = document.querySelector('input[name="bkPayment"]:checked').value;
      if (paymentMethod === 'visa') {
        var ci = byId('payCardNumber');
        var ei = byId('payExpiry');
        var cvi = byId('payCvv');
        var raw = ci.value.replace(/\s/g, '');
        var brand = cardBrand(raw);
        var cardValid = brand !== null && luhnValid(raw);
        var expiryValid = isValidExpiry(ei.value);
        var cvvValid = new RegExp('^\\d{' + cvvLength(brand) + '}$').test(cvi.value.trim());

        setValidity(ci, byId('payCardNumberError'), cardValid);
        setValidity(ei, byId('payExpiryError'), expiryValid);
        setValidity(cvi, byId('payCvvError'), cvvValid);

        if (!cardValid || !expiryValid || !cvvValid) {
          if (!cardValid) byId('payCardNumberError').textContent = 'Invalid card number (unknown brand or failed Luhn check).';
          if (!expiryValid) byId('payExpiryError').textContent = 'Expiry date must be in the future.';
          if (!cvvValid) byId('payCvvError').textContent = 'CVV must be 3 digits.';
          return;
        }

        /* Sandbox demo outcomes (see README): 4111...1111 success, 4000...0002 decline,
           any other Luhn-valid number success. No card data is stored. */
        confirmBtn.disabled = true;
        var originalLabel = confirmBtn.textContent;
        confirmBtn.textContent = 'Processing…';
        setTimeout(function () {
          if (raw === '4111111111111111') {
            finishBooking(totals, 'card', 'paid', raw.slice(-4));
          } else if (raw === '4000000000000002') {
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalLabel;
            showToast('Payment declined by the bank. Try another card or cash at counter.', 'error');
          } else {
            finishBooking(totals, 'card', 'paid', raw.slice(-4));
          }
        }, 1200);
        return;
      }

      finishBooking(totals, paymentMethod, paymentMethod === 'cash' ? 'pending' : 'paid');
    });
  });

  function finishBooking(totals, method, status, last4) {
    var data = films[state.film];
    var contact = { name: '', email: '', phone: '' };

    var booking = {
      ref: 'STB-' + bookingRef(),
      filmKey: state.film,
      film: data.title,
      screen: data.screen,
      showtime: data.showtime,
      seats: totals.codes,
      tickets: [{ type: 'Adult', qty: totals.codes.length, unit: data.price }],
      snacks: totals.snacks,
      subtotal: totals.total,
      discount: 0,
      total: totals.total,
      currency: 'EGP',
      payment: { method: method, status: status, last4: last4 },
      contact: contact,
      status: status === 'paid' ? 'confirmed' : 'pending',
      createdAt: new Date().toISOString()
    };

    stubhouseApi.addBooking(booking).then(function () {
      try { sessionStorage.removeItem('stubhouseDraft'); } catch (err) {}
      var snackNote = totals.snacks.length ? ' including ' + formatPrice(totals.snacksTotal) + ' of snacks' : '';
      if (method === 'cash') {
        showToast('Booked ' + totals.codes.join(', ') + ' for ' + formatPrice(totals.total) + snackNote + '. Pay at the counter within 30 minutes or the booking expires.', 'success');
      } else {
        showToast('Booked ' + totals.codes.join(', ') + ' for ' + formatPrice(totals.total) + snackNote + ' — paid by ' + method + '.', 'success');
      }
      window.location.href = 'bookings.html';
    });
  }

  function bookingRef() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var ref = '';
    for (var i = 0; i < 6; i++) ref += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return ref;
  }

  loadDraft();

  var filmParam = new URLSearchParams(window.location.search).get('film');
  if (filmParam && films[filmParam]) {
    state.film = filmParam;
    state.step = 1;
  }

  if (state.step > 1 && state.selected[state.film].length === 0) state.step = 1;

  filmSelect.value = state.film;
  renderSeats();
  updateCardPrice('popcorn');
  updateCardPrice('drink');
  renderCart();
  showStep(state.step, false);

  window.addEventListener('storage', function () { showStep(state.step, false); });
  window.addEventListener('pageshow', function () { showStep(state.step, false); });

});
