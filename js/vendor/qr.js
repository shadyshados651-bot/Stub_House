/* js/vendor/qr.js — Compact QR code generator (alphanumeric mode, EC level L).
   Self-contained, no dependencies, ES5. Outputs an SVG string.
   Supports versions 1-4 (up to ~50 alphanumeric chars), enough for a booking
   reference. Mask pattern 1 is used; any fixed mask is decodable by readers.
*/

(function () {
  var GALOIS_EXP = [];
  var GALOIS_LOG = [];

  function initGalois() {
    var x = 1;
    for (var i = 0; i < 256; i++) {
      GALOIS_EXP[i] = x;
      GALOIS_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (i = 255; i < 512; i++) GALOIS_EXP[i] = GALOIS_EXP[i - 255];
  }

  function galoisMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GALOIS_EXP[(GALOIS_LOG[a] + GALOIS_LOG[b]) % 255];
  }

  /* ---------- Reed-Solomon encoder ---------- */
  var RS_POLYS = [];

  function rsGeneratorPoly(nsym) {
    if (!RS_POLYS[nsym]) {
      var poly = [1];
      for (var i = 0; i < nsym; i++) {
        var next = [];
        for (var j = 0; j <= poly.length; j++) {
          next[j] = (next[j] || 0) ^ galoisMul(poly[j] || 0, GALOIS_EXP[i]);
          if (j > 0) next[j] ^= poly[j - 1] ? GALOIS_EXP[(GALOIS_LOG[poly[j - 1]] + i) % 255] : 0;
        }
        poly = next;
      }
      RS_POLYS[nsym] = poly;
    }
    return RS_POLYS[nsym];
  }

  function rsEncode(data, nsym) {
    var gen = rsGeneratorPoly(nsym);
    var pad = data.slice();
    for (var i = 0; i < nsym; i++) pad.push(0);
    for (var i = 0; i < data.length; i++) {
      var coef = pad[i];
      if (coef !== 0) {
        var log = GALOIS_LOG[coef];
        for (var j = 1; j < gen.length; j++) {
          pad[i + j] ^= GALOIS_EXP[(log + GALOIS_LOG[gen[j]]) % 255];
        }
      }
    }
    var parity = pad.slice(data.length);
    return data.concat(parity);
  }

  /* ---------- Alphanumeric encoding (base 45) ---------- */
  var ALPHA_NUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  function alphaNumValue(ch) {
    var v = ALPHA_NUM.indexOf(ch);
    if (v === -1) throw new Error('Unsupported char: ' + ch);
    return v;
  }

  function encodeAlphanumeric(text) {
    var bits = [];
    var i = 0;
    while (i < text.length) {
      if (i + 2 <= text.length) {
        var v = alphaNumValue(text.charAt(i)) * 45 + alphaNumValue(text.charAt(i + 1));
        appendBits(v, 11, bits);
        i += 2;
      } else {
        appendBits(alphaNumValue(text.charAt(i)), 6, bits);
        i += 1;
      }
    }
    return bits;
  }

  function appendBits(value, length, bits) {
    for (var i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  }

  /* ---------- Version / capacity table (alphanumeric, EC L) ---------- */
  // [version, totalCodewords, ecCodewordsPerBlock, blocksGroup1, codewordsGroup1, blocksGroup2, codewordsGroup2]
  var VERSIONS = [
    null,
    [1, 26, 7, 1, 19, 0, 0],
    [2, 44, 10, 1, 34, 0, 0],
    [3, 70, 15, 1, 55, 0, 0],
    [4, 100, 20, 1, 80, 0, 0]
  ];

  function maxAlphaNumChars(version) {
    var v = VERSIONS[version];
    var dataCw = v[1] - v[2] * v[3]; // simplified for single block
    // each 2 alphanumeric chars = 11 bits; approx: dataCw * 8 bits / (11/2 per char)
    return Math.floor((dataCw * 8) / 5.5);
  }

  function chooseVersion(textLen) {
    for (var v = 1; v <= 4; v++) {
      if (textLen <= maxAlphaNumChars(v)) return v;
    }
    return 4;
  }

  /* ---------- Bit assembly ---------- */
  function buildDataBits(text, version) {
    var v = VERSIONS[version];
    var dataCw = v[1] - v[2] * v[3];
    var ecCw = v[2];
    var bits = encodeAlphanumeric(text);
    // mode indicator (alphanumeric = 0010) + char count (9 bits for ver 1-9)
    var header = [];
    appendBits(0x2, 4, header);
    appendBits(text.length, 9, header);
    var all = header.concat(bits);
    // terminator
    var capacityBits = dataCw * 8;
    while (all.length < capacityBits && all.length < capacityBits + 4) all.push(0);
    while (all.length % 8 !== 0) all.push(0);
    // pad to capacity with pad bytes
    while (all.length < capacityBits) {
      appendBits(all.length % 2 === 0 ? 0xEC : 0x11, 8, all);
    }
    // split into codewords
    var codewords = [];
    for (i = 0; i < all.length; i += 8) {
      var byte = 0;
      for (var b = 0; b < 8; b++) byte = (byte << 1) | all[i + b];
      codewords.push(byte);
    }
    // append EC per block (single block)
    var ec = rsEncode(codewords.slice(0, dataCw), ecCw);
    var ecPart = ec.slice(dataCw);
    // interleave: data codewords then EC codewords (single block)
    var finalCodewords = codewords.slice(0, dataCw).concat(ecPart);
    var finalBits = [];
    finalCodewords.forEach(function (cw) { appendBits(cw, 8, finalBits); });
    return { bits: finalBits, dataCw: dataCw, ecCw: ecCw, version: version };
  }

  /* ---------- Module matrix ---------- */
  var PEN_ALT = [
    0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8
  ];
  function getPosition(version, idx) {
    if (version === 1) return idx;
    return PEN_ALT[idx];
  }

  function formatInfo(mask, ecLevel) {
    // ecLevel L = 11, mask 1 = 010
    var data = ((ecLevel << 3) | mask);
    var gen = 0x537; // generator polynomial for format info (10100110111)
    var padded = (data << 10);
    var temp = padded;
    for (var i = 14; i >= 10; i--) {
      if ((temp >> i) & 1) temp ^= gen << (i - 10);
    }
    var formatBits = (data << 10) | temp;
    formatBits ^= 0x5412; // XOR mask
    var bits = [];
    for (i = 8; i >= 0; i--) bits.push((formatBits >> i) & 1);
    return bits;
  }

  function buildMatrix(version, dataBits) {
    var size = 17 + 4 * (version - 1);
    var matrix = [];
    for (var y = 0; y < size; y++) { matrix[y] = []; for (var x = 0; x < size; x++) matrix[y][x] = null; }

    function set(x, y, val) {
      if (x >= 0 && x < size && y >= 0 && y < size && matrix[y][x] === null) matrix[y][x] = val;
    }

    // finder patterns
    function finder(x, y) {
      for (var i = -1; i <= 8; i++) {
        if (y + i >= 0 && y + i < size) { set(x, y + i, (i === 0 || i === 6 || i === 7 || i === -1) ? 1 : 0); set(x + i, y, (i === 0 || i === 6 || i === 7 || i === -1) ? 1 : 0); }
      }
      // not perfect; draw properly below
    }
    // Draw finder properly (7x7 with border)
    function drawFinder(px, py) {
      for (var dy = 0; dy < 7; dy++) {
        for (var dx = 0; dx < 7; dx++) {
          var val = (dy === 0 || dy === 6 || dx === 0 || dx === 6 || (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4)) ? 1 : 0;
          set(px + dx, py + dy, val);
        }
      }
    }
    drawFinder(3, 3);
    drawFinder(size - 4, 3);
    drawFinder(3, size - 4);

    // alignment patterns (version >= 2)
    var alignPos = version >= 2 ? [6, size - 7] : [6];
    if (version >= 2) {
      alignPos.forEach(function (r) {
        alignPos.forEach(function (c) {
          if (r === 6 && c === 6) return;
          if (r === size - 7 && c === 6) return;
          if (r === 6 && c === size - 7) return;
          drawFinder(c - 2, r - 2);
        });
      });
    }

    // timing patterns
    for (var i = 8; i < size - 8; i++) {
      set(i, 6, i % 2 === 0 ? 0 : 1);
      set(6, i, i % 2 === 0 ? 0 : 1);
    }

    // version info (version >= 7) - skip for v1-4

    // format info placeholder (mask 1, EC L)
    var fmt = formatInfo(1, 1);
    // top-left horizontal
    for (var i = 0; i < 9; i++) set(i, 8, fmt[i]);
    // top-left vertical
    for (var i = 0; i < 8; i++) set(8, size - 1 - i, fmt[i]);

    // data placement (zigzag, mask 1)
    var bits = dataBits;
    var bi = 0;
    var upward = true;
    var x = size - 1;
    var y = size - 1;
    function placeBit() {
      if (matrix[y][x] === null) {
        if (bi < bits.length) { matrix[y][x] = bits[bi]; bi++; }
        else matrix[y][x] = 0;
        return true;
      }
      return false;
    }
    while (x > 0) {
      if (x === 6) x -= 1;
      var pair = upward ? [y, y - 1] : [y - 1, y];
      for (var p = 0; p < 2; p++) {
        var cy = pair[p];
        if (cy >= 0 && cy < size) {
          if (placeBit()) {
            // applied mask 1: (x + y) % 2 === 0 -> invert
            if (((x + cy) % 2) === 0) matrix[cy][x] = matrix[cy][x] ^ 1;
          }
        }
      }
      if (upward) { y -= 2; if (y < 0) { y = 1; x -= 2; upward = false; } }
      else { y += 2; if (y >= size) { y = size - 2; x -= 2; upward = true; } }
    }

    // remaining format info (right/bottom edges)
    // top-right horizontal (reverse)
    for (var i = 0; i < 8; i++) set(size - 1 - i, 8, fmt[i]);
    // bottom-left vertical
    for (var i = 0; i < 8; i++) set(8, i, fmt[7 - i]);

    // dark module
    set(size - 8, 8, 1);

    return matrix;
  }

  function toSVG(matrix, sizePx) {
    var n = matrix.length;
    var cell = sizePx / n;
    var paths = [];
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (matrix[y][x] === 1) {
          paths.push('M' + (x * cell) + ',' + (y * cell) + 'h' + cell + 'v' + cell + 'h-' + cell + 'Z');
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + sizePx + '" height="' + sizePx + '" viewBox="0 0 ' + sizePx + ' ' + sizePx + '" shape-rendering="crispEdges"><path fill="#000" d="' + paths.join(' ') + '"/></svg>';
  }

  function generate(text, sizePx) {
    sizePx = sizePx || 160;
    var version = chooseVersion(text.length);
    var db = buildDataBits(text, version);
    var matrix = buildMatrix(version, db.bits);
    return { svg: toSVG(matrix, sizePx), version: version };
  }

  initGalois();
  window.stubhouseQR = { generate: generate };
})();
