/* js/script.js — Shared: nav, theme, auth, availability (index), bookings list.
   Needs js/seed.js (STUBHOUSE_FILMS) loaded first. All storage goes through
   stubhouseApi (js/api.js). Replaces the old inline localStorage code.
*/

function formatPrice(egp) {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 }).format(egp || 0);
}
window.stubhouseFormatPrice = formatPrice;

function stubhouseSeatCode(index) {
  var row = String.fromCharCode(65 + Math.floor(index / 10));
  var col = (index % 10) + 1;
  return row + col;
}

function byId(id) { return document.getElementById(id); }

/* ---------- Toast (replaces alert) ---------- */
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
  if (kind === 'error') { div.style.cssText = 'background:#ff7b7b; color:#140a08; padding:10px 16px; border-radius:6px; font-family:"Space Mono", monospace; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.35);'; }
  else if (kind === 'success') { div.style.cssText = 'background:#2ee59d; color:#140a08; padding:10px 16px; border-radius:6px; font-family:"Space Mono", monospace; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.35);'; }
  else { div.style.cssText = 'background:#f6b93b; color:#140a08; padding:10px 16px; border-radius:6px; font-family:"Space Mono", monospace; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.35);'; }
  container.appendChild(div);
  setTimeout(function () { div.remove(); }, 4000);
}

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Theme: system preference, then saved choice ---------- */
  var themeToggle = byId('themeToggle');
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-theme');
      if (themeToggle) themeToggle.checked = true;
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-mode');
      if (themeToggle) themeToggle.checked = false;
    }
  }
  stubhouseApi.getTheme().then(function (saved) {
    var theme = saved;
    if (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
    if (!theme) theme = 'light';
    applyTheme(theme);
  });
  if (themeToggle) {
    themeToggle.addEventListener('change', function () {
      var next = themeToggle.checked ? 'dark' : 'light';
      stubhouseApi.setTheme(next).then(function () { applyTheme(next); });
    });
  }

  /* ---------- Navbar ---------- */
  var navToggle = byId('navToggle');
  var navLinks = byId('navLinks');
  var ticketsDropdown = byId('ticketsDropdown');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () { navLinks.classList.toggle('open'); });
  }

  function closeDropdown() {
    if (ticketsDropdown) {
      ticketsDropdown.classList.remove('open');
      var btn = ticketsDropdown.querySelector('.dropdown-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  }

  if (ticketsDropdown) {
    var dropdownBtn = ticketsDropdown.querySelector('.dropdown-btn');
    if (dropdownBtn) {
      function setOpen(open) {
        ticketsDropdown.classList.toggle('open', open);
        dropdownBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      dropdownBtn.addEventListener('click', function (e) {
        e.preventDefault();
        setOpen(!ticketsDropdown.classList.contains('open'));
      });
      dropdownBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(!ticketsDropdown.classList.contains('open'));
        }
      });
    }
  }

  document.addEventListener('click', function (e) {
    if (ticketsDropdown && !ticketsDropdown.contains(e.target)) closeDropdown();
  });

  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 768 && link.getAttribute('href').indexOf('#') !== -1) {
        navLinks.classList.remove('open');
      }
    });
  });

  /* ---------- Footer year ---------- */
  var footerYear = byId('footerYear');
  if (footerYear) {
    footerYear.textContent = '© ' + new Date().getFullYear() + ' StubHouse. All rights reserved.';
  }

  /* ---------- Back to top ---------- */
  var backToTop = byId('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 500) backToTop.classList.add('show');
      else backToTop.classList.remove('show');
    });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Hero stub: real data, EGP (index.html) ---------- */
  var stubFilm = byId('stubFilm');
  var stubScreen = byId('stubScreen');
  var stubDate = byId('stubDate');
  var stubSeat = byId('stubSeat');
  var stubPrice = byId('stubPrice');
  if (stubPrice) {
    var hero = STUBHOUSE_FILMS.interstellar;
    if (stubFilm) stubFilm.textContent = hero.title;
    if (stubScreen) stubScreen.textContent = hero.screen;
    if (stubDate) stubDate.textContent = hero.showtime;
    if (stubSeat) stubSeat.textContent = stubhouseSeatCode(0);
    stubPrice.textContent = formatPrice(hero.price);
  }

  /* ---------- Most Watched: real percentages from stored bookings (index.html) ---------- */
  var skillContainer = document.querySelector('.about-grid');
  if (skillContainer) {
    stubhouseApi.getBookings().then(function (bookings) {
      var counts = {};
      Object.keys(STUBHOUSE_FILMS).forEach(function (k) { counts[k] = 0; });
      bookings.forEach(function (b) {
        if (b.status === 'confirmed' && counts[b.filmKey] !== undefined) counts[b.filmKey] += 1;
      });
      var max = 0;
      Object.keys(counts).forEach(function (k) { if (counts[k] > max) max = counts[k]; });
      if (max === 0) {
        skillContainer.style.display = 'none';
        return;
      }
      var grid = skillContainer.querySelector(':last-child');
      if (!grid) return;
      var skills = grid.querySelectorAll('.skill');
      skills.forEach(function (skill, index) {
        var keys = Object.keys(STUBHOUSE_FILMS);
        var key = keys[index];
        if (!key) return;
        var percent = Math.round(counts[key] / max * 100);
        var label = skill.querySelector('.skill-label');
        var spans = label.querySelectorAll('span');
        if (spans[1]) spans[1].textContent = percent + '%';
        var bar = skill.querySelector('.progress-bar');
        if (bar) bar.style.width = percent + '%';
      });
    });
  }

  /* ---------- Seat availability (index.html) ---------- */
  var seatMap = byId('seatMap');
  if (seatMap) {
    var filmSelect = byId('filmSelect');
    var availableCount = byId('availableCount');
    var totalSeatsLabel = byId('totalSeats');
    var bookSeatsLink = byId('bookSeatsLink');
    var currentFilm = filmSelect ? filmSelect.value : 'interstellar';

    function renderAvailability() {
      var data = STUBHOUSE_FILMS[currentFilm];
      seatMap.innerHTML = '';
      stubhouseApi.getTakenSeats(currentFilm, data.taken).then(function (taken) {
        for (var i = 0; i < STUBHOUSE_SEAT_COUNT; i++) {
          var seat = document.createElement('div');
          var isTaken = taken.indexOf(i) !== -1;
          seat.className = 'seat seat-static' + (isTaken ? ' taken' : '');
          seat.title = stubhouseSeatCode(i) + (isTaken ? ' — taken' : ' — available');
          seatMap.appendChild(seat);
        }
        availableCount.textContent = STUBHOUSE_SEAT_COUNT - taken.length;
        totalSeatsLabel.textContent = STUBHOUSE_SEAT_COUNT;
        if (bookSeatsLink) bookSeatsLink.setAttribute('href', 'book.html?film=' + currentFilm);
      });
    }

    if (filmSelect) {
      filmSelect.addEventListener('change', function () {
        currentFilm = filmSelect.value;
        renderAvailability();
      });
    }

    renderAvailability();
  }

  /* ---------- Forms helpers ---------- */
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function setFieldValidity(input, errorEl, isValid) {
    if (isValid) {
      input.classList.remove('invalid');
      errorEl.classList.remove('show');
    } else {
      input.classList.add('invalid');
      errorEl.classList.add('show');
    }
  }

  /* ---------- Sign in / sign up ---------- */
  var signInForm = byId('signInForm');
  var signUpForm = byId('signUpForm');

  if (signInForm) {
    var siEmail = byId('siEmail');
    var siPassword = byId('siPassword');
    var siEmailError = byId('siEmailError');
    var siPasswordError = byId('siPasswordError');
    var noAccountError = byId('noAccountError');
    var signInSuccess = byId('signInSuccess');

    signInForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailValid = isValidEmail(siEmail.value.trim());
      var passwordValid = siPassword.value.length >= 6;

      setFieldValidity(siEmail, siEmailError, emailValid);
      setFieldValidity(siPassword, siPasswordError, passwordValid);
      siPasswordError.textContent = 'Password must be at least 6 characters.'; // reset message each attempt (was persisting)
      noAccountError.style.display = 'none';
      signInSuccess.classList.remove('show');

      if (!emailValid || !passwordValid) return;

      stubhouseApi.authenticate(siEmail.value.trim(), siPassword.value).then(function (result) {
        if (result.locked || !result.ok) {
          setFieldValidity(siPassword, siPasswordError, false);
          siPasswordError.textContent = result.message;
          showToast(result.message, 'error');
          return;
        }
        stubhouseApi.setCurrentUser({ email: result.account.email, name: result.account.name }).then(function () {
          signInSuccess.classList.add('show');
          setTimeout(function () {
            signInSuccess.classList.remove('show');
            var next = new URLSearchParams(window.location.search).get('next');
            window.location.href = (next === 'book.html') ? 'book.html' : 'bookings.html';
          }, 900);
        });
      });
    });
  }

  if (signUpForm) {
    var suName = byId('suName');
    var suEmail = byId('suEmail');
    var suPassword = byId('suPassword');
    var suConfirm = byId('suConfirm');
    var signUpSuccess = byId('signUpSuccess');

    signUpForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameValid = suName.value.trim().length > 0;
      var emailValid = isValidEmail(suEmail.value.trim());
      var passwordValid = suPassword.value.length >= 6;
      var confirmValid = suConfirm.value === suPassword.value && suConfirm.value.length > 0;

      setFieldValidity(suName, byId('suNameError'), nameValid);
      setFieldValidity(suEmail, byId('suEmailError'), emailValid);
      setFieldValidity(suPassword, byId('suPasswordError'), passwordValid);
      setFieldValidity(suConfirm, byId('suConfirmError'), confirmValid);

      if (nameValid && emailValid && passwordValid && confirmValid) {
        stubhouseApi.createAccount({
          name: suName.value.trim(),
          email: suEmail.value.trim(),
          password: suPassword.value
        }).then(function () {
          signUpSuccess.classList.add('show');
          signUpForm.reset();
          setTimeout(function () {
            signUpSuccess.classList.remove('show');
            activateSignIn();
          }, 1500);
        }).catch(function (err) {
          setFieldValidity(suEmail, byId('suEmailError'), false);
          byId('suEmailError').textContent = err.message || 'Could not create account.';
          signUpSuccess.classList.remove('show');
        });
      } else {
        signUpSuccess.classList.remove('show');
      }
    });
  }

  var tabSignIn = byId('tabSignIn');
  var tabSignUp = byId('tabSignUp');
  if (tabSignIn && tabSignUp) {
    var goToSignUp = byId('goToSignUp');
    var goToSignIn = byId('goToSignIn');

    function activateSignIn() {
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      byId('signInForm').classList.remove('from-right');
      byId('signInForm').classList.add('active', 'from-right');
      byId('signUpForm').classList.remove('active', 'from-right');
    }

    function activateSignUp() {
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      byId('signUpForm').classList.remove('from-right');
      byId('signUpForm').classList.add('active');
      byId('signInForm').classList.remove('active', 'from-right');
    }

    tabSignIn.addEventListener('click', activateSignIn);
    tabSignUp.addEventListener('click', activateSignUp);
    goToSignUp.addEventListener('click', activateSignUp);
    goToSignIn.addEventListener('click', activateSignIn);

    var accountsCheck = null;
    stubhouseApi.getAccounts().then(function (accounts) {
      if (Object.keys(accounts).length === 0) activateSignUp();
    });
  }

  var signOutLink = byId('signOutLink');
  if (signOutLink) {
    signOutLink.addEventListener('click', function (e) {
      e.preventDefault();
      stubhouseApi.clearCurrentUser();
      window.location.href = 'signin.html';
    });
  }

  var navAuthLink = byId('navAuthLink');
  if (navAuthLink) {
    stubhouseApi.getCurrentUser().then(function (sessionUser) {
      if (sessionUser) {
        navAuthLink.textContent = 'Sign Out';
        navAuthLink.setAttribute('href', 'javascript:void(0)');
        navAuthLink.addEventListener('click', function (e) {
          e.preventDefault();
          stubhouseApi.clearCurrentUser();
          window.location.href = 'signin.html';
        });
      }
    });
  }

  /* ---------- My bookings list (bookings.html) — DOM only, no innerHTML ---------- */
  var bookingsList = byId('bookingsList');
  if (bookingsList) {
    stubhouseApi.getCurrentUser().then(function (loggedInUser) {
      if (!loggedInUser) {
        window.location.href = 'signin.html';
        return;
      }
      var welcomeName = byId('welcomeName');
      if (welcomeName) welcomeName.textContent = loggedInUser.name;

      stubhouseApi.getBookings().then(function (allBookings) {
        var list = allBookings.filter(function (b) {
          var email = (b.contact && b.contact.email) || b.userEmail;
          return email === loggedInUser.email;
        }).slice().reverse();

        bookingsList.innerHTML = '';
        if (list.length === 0) {
          var empty = document.createElement('p');
          empty.className = 'section-sub';
          empty.textContent = 'No bookings yet — head to the homepage and pick a seat.';
          bookingsList.appendChild(empty);
          return;
        }

        list.forEach(function (booking) {
          var stub = document.createElement('div');
          stub.className = 'ticket-stub my-booking-stub';

          var row1 = document.createElement('div'); row1.className = 'stub-row';
          var r1a = document.createElement('div'); var r1b = document.createElement('div');
          var l1 = document.createElement('span'); l1.className = 'stub-label'; l1.textContent = 'Feature';
          var v1 = document.createElement('span'); v1.className = 'stub-value'; v1.textContent = booking.film;
          var l2 = document.createElement('span'); l2.className = 'stub-label'; l2.textContent = 'Screen';
          var v2 = document.createElement('span'); v2.className = 'stub-value'; v2.textContent = booking.screen;
          r1a.appendChild(l1); r1a.appendChild(v1);
          r1b.appendChild(l2); r1b.appendChild(v2);
          row1.appendChild(r1a); row1.appendChild(r1b);

          var row2 = document.createElement('div'); row2.className = 'stub-row';
          var r2a = document.createElement('div'); var r2b = document.createElement('div');
          var l3 = document.createElement('span'); l3.className = 'stub-label'; l3.textContent = 'Date';
          var v3 = document.createElement('span'); v3.className = 'stub-value'; v3.textContent = booking.showtime;
          var l4 = document.createElement('span'); l4.className = 'stub-label'; l4.textContent = 'Seat';
          var v4 = document.createElement('span'); v4.className = 'stub-value'; v4.textContent = booking.seats.join(', ');
          r2a.appendChild(l3); r2a.appendChild(v3);
          r2b.appendChild(l4); r2b.appendChild(v4);
          row2.appendChild(r2a); row2.appendChild(r2b);

          var row3 = document.createElement('div'); row3.className = 'stub-row';
          var r3a = document.createElement('div'); var r3b = document.createElement('div');
          var l5 = document.createElement('span'); l5.className = 'stub-label'; l5.textContent = 'Booked By';
          var v5 = document.createElement('span'); v5.className = 'stub-value'; v5.textContent = (booking.contact && booking.contact.name) || booking.name;
          var l6 = document.createElement('span'); l6.className = 'stub-label'; l6.textContent = 'Payment';
          var v6 = document.createElement('span'); v6.className = 'stub-value'; v6.textContent = (booking.payment && booking.payment.method) || booking.payment;
          r3a.appendChild(l5); r3a.appendChild(v5);
          r3b.appendChild(l6); r3b.appendChild(v6);
          row3.appendChild(r3a); row3.appendChild(r3b);

          if (booking.snacks && booking.snacks.length) {
            var snackRow = document.createElement('div'); snackRow.className = 'stub-row';
            var sdiv = document.createElement('div'); var slabel = document.createElement('span'); slabel.className = 'stub-label'; slabel.textContent = 'Snacks';
            var sval = document.createElement('span'); sval.className = 'stub-value';
            var snackText = booking.snacks.map(function (sn) { return sn.qty + '× ' + sn.type + ' ' + sn.item + ' (' + sn.size + ')'; }).join(', ');
            sval.textContent = snackText;
            sdiv.appendChild(slabel); sdiv.appendChild(sval);
            snackRow.appendChild(sdiv);
            stub.appendChild(row1); stub.appendChild(row2); stub.appendChild(row3); stub.appendChild(snackRow);
          } else {
            stub.appendChild(row1); stub.appendChild(row2); stub.appendChild(row3);
          }

          var row4 = document.createElement('div'); row4.className = 'stub-row';
          var r4a = document.createElement('div'); var r4b = document.createElement('div');
          var l7 = document.createElement('span'); l7.className = 'stub-label'; l7.textContent = 'Admit';
          var v7 = document.createElement('span'); v7.className = 'stub-value'; v7.textContent = booking.seats.length;
          var l8 = document.createElement('span'); l8.className = 'stub-label'; l8.textContent = 'Total';
          var v8 = document.createElement('span'); v8.className = 'stub-value'; v8.textContent = formatPrice(booking.total);
          r4a.appendChild(l7); r4a.appendChild(v7);
          r4b.appendChild(l8); r4b.appendChild(v8);
          row4.appendChild(r4a); row4.appendChild(r4b);
          stub.appendChild(row4);

          var barcode = document.createElement('div'); barcode.className = 'stub-barcode';
          stub.appendChild(barcode);

          if (booking.ref) {
            var ticketLink = document.createElement('a');
            ticketLink.href = 'ticket.html?ref=' + encodeURIComponent(booking.ref);
            ticketLink.className = 'btn btn-outline';
            ticketLink.textContent = 'View Ticket';
            ticketLink.style.cssText = 'margin-top:var(--spacing-md); display:inline-block; padding:8px 14px; font-size:0.8rem;';
            stub.appendChild(ticketLink);
          }

          bookingsList.appendChild(stub);
        });
      });
    });
  }

  /* ---------- Contact form ---------- */
  var contactForm = byId('contactForm');
  if (contactForm) {
    var cName = byId('cName');
    var cEmail = byId('cEmail');
    var cMessage = byId('cMessage');
    var contactSuccess = byId('contactSuccess');

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameValid = cName.value.trim().length > 0;
      var emailValid = isValidEmail(cEmail.value.trim());
      var messageValid = cMessage.value.trim().length > 0;

      setFieldValidity(cName, byId('cNameError'), nameValid);
      setFieldValidity(cEmail, byId('cEmailError'), emailValid);
      setFieldValidity(cMessage, byId('cMessageError'), messageValid);

      if (nameValid && emailValid && messageValid) {
        contactSuccess.classList.add('show');
        contactForm.reset();
        setTimeout(function () { contactSuccess.classList.remove('show'); }, 4000);
      } else {
        contactSuccess.classList.remove('show');
      }
    });
  }

  /* ---------- Newsletter ---------- */
  var newsletterForm = byId('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailInput = byId('newsletterEmail');
      var msg = byId('newsletterMsg');
      if (isValidEmail(emailInput.value.trim())) {
        msg.classList.add('show');
        newsletterForm.reset();
        setTimeout(function () { msg.classList.remove('show'); }, 4000);
      }
    });
  }

  /* ---------- Slider (Now Showing carousel) ---------- */
  var slides = document.querySelectorAll('.slide');
  var sliderDots = byId('sliderDots');
  var prevBtn = byId('prevSlide');
  var nextBtn = byId('nextSlide');
  var currentSlide = 0;
  var slideInterval;

  if (slides.length > 0) {
    slides.forEach(function (slide, index) {
      var dot = document.createElement('button');
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', function () { goToSlide(index); resetSlideInterval(); });
      sliderDots.appendChild(dot);
    });

    function showSlide(index) {
      slides.forEach(function (slide) { slide.classList.remove('active'); });
      sliderDots.querySelectorAll('button').forEach(function (dot) { dot.classList.remove('active'); });
      slides[index].classList.add('active');
      sliderDots.querySelectorAll('button')[index].classList.add('active');
      currentSlide = index;
    }

    function goToSlide(index) {
      var newIndex = (index + slides.length) % slides.length;
      showSlide(newIndex);
    }

    function resetSlideInterval() {
      clearInterval(slideInterval);
      slideInterval = setInterval(function () { goToSlide(currentSlide + 1); }, 5000);
    }

    prevBtn.addEventListener('click', function () { goToSlide(currentSlide - 1); resetSlideInterval(); });
    nextBtn.addEventListener('click', function () { goToSlide(currentSlide + 1); resetSlideInterval(); });

    resetSlideInterval();
  }

  /* ---------- Seed demo bookings once (clearly marked sample data) ---------- */
  if (typeof STUBHOUSE_SEED_BOOKINGS !== 'undefined') {
    stubhouseApi.getBookings().then(function (bookings) {
      if (bookings.length === 0) {
        stubhouseApi.saveBookings(STUBHOUSE_SEED_BOOKINGS.slice());
      }
    });
  }

});
