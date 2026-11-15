/* ==========================================================
   book.js — logic for the booking page (book.html) only.

   Flow: 1) pick seats  ->  2) pick snacks  ->  3) checkout.
   Needs script.js loaded first (shared film data + seat codes,
   theme toggle, nav). Bookings are saved to the same
   localStorage key that My Bookings reads from.
   ========================================================== */
document.addEventListener('DOMContentLoaded', function () {

  var seatMapEl = document.getElementById('bkSeatMap');
  if (!seatMapEl) return;

  var films = STUBHOUSE_FILMS;
  var SEAT_COUNT = STUBHOUSE_SEAT_COUNT;
  var seatCode = stubhouseSeatCode;

  var DRAFT_KEY = 'stubhouseDraft';
  var MAX_QTY = 10;
  var MAX_LINE_QTY = 20;

  function byId(id) { return document.getElementById(id); }

  var filmSelect = byId('bkFilmSelect');
  var filmInfo = byId('bkFilmInfo');
  var selectedSeatsLabel = byId('bkSelectedSeats');
  var seatTotalLabel = byId('bkSeatTotal');
  var toSnacksBtn = byId('toSnacks');

  var panels = [byId('stepSeats'), byId('stepSnacks'), byId('stepCheckout')];
  var stepItems = document.querySelectorAll('#bkSteps li');
  var stepsBar = byId('bkSteps');

  var cartList = byId('snackCart');
  var orderLines = byId('orderLines');
  var orderTotalLabel = byId('orderTotal');
  var authNotice = byId('authNotice');
  var signedInNote = byId('signedInNote');
  var confirmBtn = byId('confirmPay');

  var snackCards = {
    popcorn: { name: 'Popcorn', type: byId('popcornType'), size: byId('popcornSize'), qty: byId('popcornQty'), price: byId('popcornPrice') },
    drink: { name: 'Drink', type: byId('drinkType'), size: byId('drinkSize'), qty: byId('drinkQty'), price: byId('drinkPrice') }
  };
  var qty = { popcorn: 1, drink: 1 };

  var state = { film: 'interstellar', selected: {}, cart: [], step: 1 };
  Object.keys(films).forEach(function (key) { state.selected[key] = []; });

  function getCurrentUser() {
    try {
      var user = JSON.parse(localStorage.getItem('stubhouseCurrentUser'));
      return (user && user.email) ? user : null;
    } catch (err) {
      return null;
    }
  }

  function getBookings() {
    try {
      return JSON.parse(localStorage.getItem('stubhouseBookings')) || [];
    } catch (err) {
      return [];
    }
  }

  function addBooking(booking) {
    var bookings = getBookings();
    bookings.push(booking);
    localStorage.setItem('stubhouseBookings', JSON.stringify(bookings));
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
    return { item: entry.item, type: entry.type, size: entry.size, qty: Math.min(q, MAX_LINE_QTY) };
  }

  function saveDraft() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
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
      draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
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
                 films[key].taken.indexOf(n) === -1 && arr.indexOf(n) === i;
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
    filmInfo.textContent = 'Screen ' + data.screen + ' · ' + data.showtime + ' · $' + data.price + ' per seat · ' +
      (SEAT_COUNT - data.taken.length) + ' seats available';
  }

  function updateSeatSummary() {
    var codes = currentSeatCodes();
    selectedSeatsLabel.textContent = codes.length ? codes.join(', ') : 'None';
    seatTotalLabel.textContent = (codes.length * films[state.film].price).toFixed(0);
    toSnacksBtn.disabled = codes.length === 0;
  }

  function renderSeats() {
    seatMapEl.innerHTML = '';
    var data = films[state.film];
    var selected = state.selected[state.film];

    for (var i = 0; i < SEAT_COUNT; i++) {
      (function (i) {
        var seatBtn = document.createElement('button');
        seatBtn.type = 'button';
        seatBtn.classList.add('seat');
        seatBtn.setAttribute('aria-label', 'Seat ' + seatCode(i));
        if (data.taken.indexOf(i) !== -1) {
          seatBtn.classList.add('taken');
          seatBtn.disabled = true;
        }
        if (selected.indexOf(i) !== -1) {
          seatBtn.classList.add('selected');
        }
        seatBtn.addEventListener('click', function () {
          this.classList.toggle('selected');
          if (this.classList.contains('selected')) {
            state.selected[state.film].push(i);
          } else {
            state.selected[state.film] = state.selected[state.film].filter(function (s) { return s !== i; });
          }
          updateSeatSummary();
          saveDraft();
        });
        seatMapEl.appendChild(seatBtn);
      })(i);
    }
    updateFilmInfo();
    updateSeatSummary();
  }

  filmSelect.addEventListener('change', function () {
    state.film = filmSelect.value;
    renderSeats();
    saveDraft();
  });

  function updateCardPrice(item) {
    var card = snackCards[item];
    card.qty.textContent = qty[item];
    card.price.textContent = '$' + (unitPrice(item, card.size.value) * qty[item]).toFixed(2);
  }

  document.querySelectorAll('.qty-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.getAttribute('data-item');
      var next = qty[item] + Number(btn.getAttribute('data-delta'));
      qty[item] = Math.max(1, Math.min(MAX_QTY, next));
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
      price.textContent = '$' + (entry.qty * unitPrice(entry.item, entry.size)).toFixed(2);

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
      existing.qty = Math.min(existing.qty + qty[item], MAX_LINE_QTY);
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
      amountEl.textContent = '$' + amount.toFixed(2);
      row.appendChild(amountEl);
    }
    orderLines.appendChild(row);
  }

  function renderCheckout() {
    var data = films[state.film];
    var totals = computeTotals();
    orderLines.innerHTML = '';

    addOrderLine('Film', data.title + ' — Screen ' + data.screen + ', ' + data.showtime);
    addOrderLine('Seats (' + totals.codes.length + ' × $' + data.price + ')', totals.codes.join(', '), totals.ticketsTotal);
    totals.snacks.forEach(function (sn) {
      addOrderLine(sn.item, sn.qty + '× ' + sn.type + ' (' + sn.size + ')', sn.qty * sn.unit);
    });

    orderTotalLabel.textContent = totals.total.toFixed(0);
  }

  function refreshAuthState() {
    var user = getCurrentUser();
    authNotice.hidden = !!user;
    signedInNote.hidden = !user;
    if (user) signedInNote.textContent = 'Signed in as ' + user.name;
    confirmBtn.disabled = !user;
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
      refreshAuthState();
    }
    saveDraft();
    if (scroll) {
      window.scrollTo({ top: stepsBar.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
    }
  }

  function requireSeats() {
    if (currentSeatCodes().length === 0) {
      alert('Pick at least one seat first.');
      showStep(1, true);
      return false;
    }
    return true;
  }

  toSnacksBtn.addEventListener('click', function () { if (requireSeats()) showStep(2, true); });
  byId('backToSeats').addEventListener('click', function () { showStep(1, true); });
  byId('toCheckout').addEventListener('click', function () { if (requireSeats()) showStep(3, true); });
  byId('backToSnacks').addEventListener('click', function () { showStep(2, true); });

  function isValidCardNumber(value) {
    return /^\d{16}$/.test(value.replace(/\s/g, ''));
  }

  function isValidExpiry(value) {
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(value.trim());
  }

  function isValidCvv(value) {
    return /^\d{3}$/.test(value.trim());
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

  confirmBtn.addEventListener('click', function () {
    var totals = computeTotals();
    if (totals.codes.length === 0) {
      alert('Pick at least one seat before confirming.');
      showStep(1, true);
      return;
    }

    var user = getCurrentUser();
    if (!user) {
      alert('Please sign in before paying.');
      saveDraft();
      window.location.href = 'signin.html?next=book.html';
      return;
    }

    var paymentMethod = document.querySelector('input[name="bkPayment"]:checked').value;

    if (paymentMethod === 'visa') {
      var cardInput = byId('payCardNumber');
      var expiryInput = byId('payExpiry');
      var cvvInput = byId('payCvv');

      var cardValid = isValidCardNumber(cardInput.value);
      var expiryValid = isValidExpiry(expiryInput.value);
      var cvvValid = isValidCvv(cvvInput.value);

      setValidity(cardInput, byId('payCardNumberError'), cardValid);
      setValidity(expiryInput, byId('payExpiryError'), expiryValid);
      setValidity(cvvInput, byId('payCvvError'), cvvValid);

      if (!cardValid || !expiryValid || !cvvValid) return;
    }

    var data = films[state.film];
    var payLabel = paymentMethod === 'cash' ? 'Cash at counter' : 'Visa card';

    addBooking({
      userEmail: user.email,
      name: user.name,
      film: data.title,
      screen: data.screen,
      showtime: data.showtime,
      seats: totals.codes,
      price: data.price,
      ticketsTotal: totals.ticketsTotal,
      snacks: totals.snacks,
      snacksTotal: totals.snacksTotal,
      total: totals.total,
      payment: payLabel
    });

    try { sessionStorage.removeItem(DRAFT_KEY); } catch (err) {}

    var snackNote = totals.snacks.length ? ' (including $' + totals.snacksTotal + '.00 of snacks)' : '';
    alert('Booked seats ' + totals.codes.join(', ') + ' for $' + totals.total + '.00' + snackNote +
          ' — paying by ' + payLabel + '. Find your stub under My Bookings.');
    window.location.href = 'bookings.html';
  });

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
  refreshAuthState();
  showStep(state.step, false);

  window.addEventListener('storage', refreshAuthState);
  window.addEventListener('pageshow', refreshAuthState);
});