/* Shared by index (availability view) and book.js (booking page) */
var STUBHOUSE_FILMS = {
  interstellar: { title: 'Interstellar', screen: '04', showtime: 'Fri, 8:45 PM', price: 15, taken: [3, 7, 14, 15, 22, 31, 38, 45, 52, 58] },
  '12angrymen': { title: '12 Angry Men', screen: '02', showtime: 'Fri, 6:30 PM', price: 10, taken: [1, 9, 18, 27, 33, 40, 49, 56] },
  turabelmas: { title: 'Turab El Mas', screen: '07', showtime: 'Fri, 9:15 PM', price: 12, taken: [5, 11, 19, 26, 34, 42, 47, 55, 59] },
  ibrahimelabyad: { title: 'Ibrahim El Abyad', screen: '01', showtime: 'Fri, 10:00 PM', price: 13, taken: [2, 8, 16, 24, 30, 36, 44, 51, 57] }
};
var STUBHOUSE_SEAT_COUNT = 60;

function stubhouseSeatCode(index) {
  var row = String.fromCharCode(65 + Math.floor(index / 10));
  var col = (index % 10) + 1;
  return row + col;
}

document.addEventListener('DOMContentLoaded', function () {

  var themeToggle = document.getElementById('themeToggle');
  var savedTheme = localStorage.getItem('stubhouseTheme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeToggle) themeToggle.checked = true;
  }
  if (themeToggle) {
    themeToggle.addEventListener('change', function () {
      if (themeToggle.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('stubhouseTheme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('stubhouseTheme', 'light');
      }
    });
  }

  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var ticketsDropdown = document.getElementById('ticketsDropdown');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
  }

  if (ticketsDropdown) {
    var dropdownLink = ticketsDropdown.querySelector('a');
    dropdownLink.addEventListener('click', function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        ticketsDropdown.classList.toggle('open');
      }
    });
  }

  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 768 && link.getAttribute('href').indexOf('#') !== -1) {
        navLinks.classList.remove('open');
      }
    });
  });

  var footerYear = document.getElementById('footerYear');
  if (footerYear) {
    footerYear.textContent = '© ' + new Date().getFullYear() + ' StubHouse. All rights reserved.';
  }

  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 500) {
        backToTop.classList.add('show');
      } else {
        backToTop.classList.remove('show');
      }
    });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  var slides = document.querySelectorAll('.slide');
  var sliderDots = document.getElementById('sliderDots');
  var prevBtn = document.getElementById('prevSlide');
  var nextBtn = document.getElementById('nextSlide');
  var currentSlide = 0;
  var slideInterval;

  if (slides.length > 0) {
    slides.forEach(function (slide, index) {
      var dot = document.createElement('button');
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', function () {
        goToSlide(index);
        resetSlideInterval();
      });
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

  var seatMap = document.getElementById('seatMap');
  if (seatMap) {
    var filmSelect = document.getElementById('filmSelect');
    var availableCount = document.getElementById('availableCount');
    var totalSeatsLabel = document.getElementById('totalSeats');
    var bookSeatsLink = document.getElementById('bookSeatsLink');
    var currentFilm = filmSelect ? filmSelect.value : 'interstellar';

    function renderAvailability() {
      var data = STUBHOUSE_FILMS[currentFilm];
      seatMap.innerHTML = '';
      for (var i = 0; i < STUBHOUSE_SEAT_COUNT; i++) {
        var seat = document.createElement('div');
        var isTaken = data.taken.indexOf(i) !== -1;
        seat.className = 'seat seat-static' + (isTaken ? ' taken' : '');
        seat.title = stubhouseSeatCode(i) + (isTaken ? ' — taken' : ' — available');
        seatMap.appendChild(seat);
      }
      availableCount.textContent = STUBHOUSE_SEAT_COUNT - data.taken.length;
      totalSeatsLabel.textContent = STUBHOUSE_SEAT_COUNT;
      bookSeatsLink.setAttribute('href', 'book.html?film=' + currentFilm);
    }

    if (filmSelect) {
      filmSelect.addEventListener('change', function () {
        currentFilm = filmSelect.value;
        renderAvailability();
      });
    }

    renderAvailability();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isValidEmail(value) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(value);
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

  var bookingsList = document.getElementById('bookingsList');
  if (bookingsList) {
    var loggedInUser = getCurrentUser();

    if (!loggedInUser) {
      window.location.href = 'signin.html';
    } else {
      var welcomeName = document.getElementById('welcomeName');
      if (welcomeName) {
        welcomeName.textContent = loggedInUser.name;
      }

      var allBookings = getBookings().filter(function (b) { return b.userEmail === loggedInUser.email; });

      if (allBookings.length === 0) {
        bookingsList.innerHTML = '<p class="section-sub">No bookings yet — head to the homepage and pick a seat.</p>';
      } else {
        allBookings.slice().reverse().forEach(function (booking) {
          var snackRow = '';
          if (booking.snacks && booking.snacks.length) {
            var snackText = booking.snacks.map(function (sn) {
              return sn.qty + '× ' + sn.type + ' ' + sn.item + ' (' + sn.size + ')';
            }).join(', ');
            snackRow =
              '<div class="stub-row">' +
                '<div><span class="stub-label">Snacks</span><span class="stub-value">' + escapeHtml(snackText) + '</span></div>' +
              '</div>';
          }
          var stub = document.createElement('div');
          stub.className = 'ticket-stub my-booking-stub';
          stub.innerHTML =
            '<div class="stub-row">' +
              '<div><span class="stub-label">Feature</span><span class="stub-value">' + booking.film + '</span></div>' +
              '<div><span class="stub-label">Screen</span><span class="stub-value">' + booking.screen + '</span></div>' +
            '</div>' +
            '<div class="stub-row">' +
              '<div><span class="stub-label">Date</span><span class="stub-value">' + booking.showtime + '</span></div>' +
              '<div><span class="stub-label">Seat</span><span class="stub-value">' + booking.seats.join(', ') + '</span></div>' +
            '</div>' +
            '<div class="stub-row">' +
              '<div><span class="stub-label">Booked By</span><span class="stub-value">' + booking.name + '</span></div>' +
              '<div><span class="stub-label">Payment</span><span class="stub-value">' + booking.payment + '</span></div>' +
            '</div>' +
            snackRow +
            '<div class="stub-row">' +
              '<div><span class="stub-label">Admit</span><span class="stub-value">' + booking.seats.length + '</span></div>' +
              '<div><span class="stub-label">Total</span><span class="stub-value">$' + booking.total.toFixed(0) + '.00</span></div>' +
            '</div>' +
            '<div class="stub-barcode"></div>';
          bookingsList.appendChild(stub);
        });
      }
    }
  }
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    var cName = document.getElementById('cName');
    var cEmail = document.getElementById('cEmail');
    var cMessage = document.getElementById('cMessage');
    var contactSuccess = document.getElementById('contactSuccess');

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameValid = cName.value.trim().length > 0;
      var emailValid = isValidEmail(cEmail.value.trim());
      var messageValid = cMessage.value.trim().length > 0;

      setFieldValidity(cName, document.getElementById('cNameError'), nameValid);
      setFieldValidity(cEmail, document.getElementById('cEmailError'), emailValid);
      setFieldValidity(cMessage, document.getElementById('cMessageError'), messageValid);

      if (nameValid && emailValid && messageValid) {
        contactSuccess.classList.add('show');
        contactForm.reset();
        setTimeout(function () { contactSuccess.classList.remove('show'); }, 4000);
      } else {
        contactSuccess.classList.remove('show');
      }
    });
  }

  var newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailInput = document.getElementById('newsletterEmail');
      var msg = document.getElementById('newsletterMsg');
      if (isValidEmail(emailInput.value.trim())) {
        msg.classList.add('show');
        newsletterForm.reset();
        setTimeout(function () { msg.classList.remove('show'); }, 4000);
      }
    });
  }

  var tabSignIn = document.getElementById('tabSignIn');
  var tabSignUp = document.getElementById('tabSignUp');
  var signInForm = document.getElementById('signInForm');
  var signUpForm = document.getElementById('signUpForm');
  var goToSignUp = document.getElementById('goToSignUp');
  var goToSignIn = document.getElementById('goToSignIn');

  function activateSignIn() {
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    signInForm.classList.remove('from-right');
    signInForm.classList.add('active', 'from-right');
    signUpForm.classList.remove('active', 'from-right');
  }

  function activateSignUp() {
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    signUpForm.classList.remove('from-right');
    signUpForm.classList.add('active');
    signInForm.classList.remove('active', 'from-right');
  }

  if (tabSignIn && tabSignUp) {
    tabSignIn.addEventListener('click', activateSignIn);
    tabSignUp.addEventListener('click', activateSignUp);
    goToSignUp.addEventListener('click', activateSignUp);
    goToSignIn.addEventListener('click', activateSignIn);
  }

  function getAccounts() {
    try {
      return JSON.parse(localStorage.getItem('stubhouseAccounts')) || {};
    } catch (err) {
      return {};
    }
  }

  function saveAccounts(accounts) {
    localStorage.setItem('stubhouseAccounts', JSON.stringify(accounts));
  }

  function setCurrentUser(email, name) {
    localStorage.setItem('stubhouseCurrentUser', JSON.stringify({ email: email, name: name }));
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('stubhouseCurrentUser'));
    } catch (err) {
      return null;
    }
  }

  function clearCurrentUser() {
    localStorage.removeItem('stubhouseCurrentUser');
  }

  function getBookings() {
    try {
      return JSON.parse(localStorage.getItem('stubhouseBookings')) || [];
    } catch (err) {
      return [];
    }
  }

  function saveBookings(bookings) {
    localStorage.setItem('stubhouseBookings', JSON.stringify(bookings));
  }

  function addBooking(booking) {
    var bookings = getBookings();
    bookings.push(booking);
    saveBookings(bookings);
  }

  var signOutLink = document.getElementById('signOutLink');
  if (signOutLink) {
    signOutLink.addEventListener('click', function (e) {
      e.preventDefault();
      clearCurrentUser();
      window.location.href = 'signin.html';
    });
  }

  var navAuthLink = document.getElementById('navAuthLink');
  if (navAuthLink) {
    var sessionUser = getCurrentUser();
    if (sessionUser) {
      navAuthLink.textContent = 'Sign Out';
      navAuthLink.setAttribute('href', 'javascript:void(0)');
      navAuthLink.addEventListener('click', function (e) {
        e.preventDefault();
        clearCurrentUser();
        window.location.href = 'signin.html';
      });
    }
  }

  if (tabSignIn && tabSignUp) {
    var accountsAtLoad = getAccounts();
    if (Object.keys(accountsAtLoad).length === 0) {
      activateSignUp();
    }
  }

  if (signInForm) {
    var siEmail = document.getElementById('siEmail');
    var siPassword = document.getElementById('siPassword');
    var signInSuccess = document.getElementById('signInSuccess');
    var noAccountError = document.getElementById('noAccountError');

    signInForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailValid = isValidEmail(siEmail.value.trim());
      var passwordValid = siPassword.value.length >= 6;

      setFieldValidity(siEmail, document.getElementById('siEmailError'), emailValid);
      setFieldValidity(siPassword, document.getElementById('siPasswordError'), passwordValid);
      noAccountError.style.display = 'none';

      if (!emailValid || !passwordValid) {
        signInSuccess.classList.remove('show');
        return;
      }

      var accounts = getAccounts();
      var account = accounts[siEmail.value.trim().toLowerCase()];

      if (!account) {
        noAccountError.style.display = 'block';
        signInSuccess.classList.remove('show');
        return;
      }

      if (account.password !== siPassword.value) {
        setFieldValidity(siPassword, document.getElementById('siPasswordError'), false);
        document.getElementById('siPasswordError').textContent = 'Incorrect password.';
        return;
      }

      setCurrentUser(siEmail.value.trim().toLowerCase(), account.name);
      signInSuccess.classList.add('show');
      setTimeout(function () {
        signInSuccess.classList.remove('show');
        var next = new URLSearchParams(window.location.search).get('next');
        window.location.href = (next === 'book.html') ? 'book.html' : 'bookings.html';
      }, 900);
    });
  }

  if (signUpForm) {
    var suName = document.getElementById('suName');
    var suEmail = document.getElementById('suEmail');
    var suPassword = document.getElementById('suPassword');
    var suConfirm = document.getElementById('suConfirm');
    var signUpSuccess = document.getElementById('signUpSuccess');

    signUpForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameValid = suName.value.trim().length > 0;
      var emailValid = isValidEmail(suEmail.value.trim());
      var passwordValid = suPassword.value.length >= 6;
      var confirmValid = suConfirm.value === suPassword.value && suConfirm.value.length > 0;

      setFieldValidity(suName, document.getElementById('suNameError'), nameValid);
      setFieldValidity(suEmail, document.getElementById('suEmailError'), emailValid);
      setFieldValidity(suPassword, document.getElementById('suPasswordError'), passwordValid);
      setFieldValidity(suConfirm, document.getElementById('suConfirmError'), confirmValid);

      if (nameValid && emailValid && passwordValid && confirmValid) {
        var accounts = getAccounts();
        accounts[suEmail.value.trim().toLowerCase()] = {
          name: suName.value.trim(),
          password: suPassword.value
        };
        saveAccounts(accounts);

        signUpSuccess.classList.add('show');
        signUpForm.reset();
        setTimeout(function () {
          signUpSuccess.classList.remove('show');
          activateSignIn();
        }, 1500);
      } else {
        signUpSuccess.classList.remove('show');
      }
    });
  }

});
