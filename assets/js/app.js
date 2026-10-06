/* =====================================================================
   Tess Coffee · site behaviour
   Everything the page shows comes from content.js (window.TESS).
   ===================================================================== */
(function () {
  "use strict";

  var T = window.TESS;
  if (!T) {
    var msg = document.createElement("p");
    msg.className = "placeholder-banner";
    msg.textContent = "content.js could not be read. It probably has a typo (a missing comma or quote). Undo the last change and refresh.";
    document.body.insertBefore(msg, document.body.firstChild);
    console.error("Tess: window.TESS is missing. Check content.js for a syntax error.");
    return;
  }

  /* ---------- helpers ---------- */
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };
  var reduceMQ = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var reduced = function () { return reduceMQ.matches; };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safe(fn, name) {
    try { fn(); } catch (e) { console.error("Tess: " + name + " failed", e); }
  }
  function icon(id, cls) {
    return '<svg class="icon' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  var CUR = (T.settings && T.settings.currency) || {};
  function money(n) {
    var d = CUR.decimals || 0;
    var num = Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    var sym = CUR.symbol || "", sp = CUR.space === false ? "" : "\u00a0";
    return CUR.position === "before" ? sym + sp + num : num + sp + sym;
  }

  var toastTimer;
  function toast(text) {
    var t = $("[data-toast]");
    if (!t) return;
    t.textContent = text;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2600);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  /* ---------- time, in the shop's time zone ---------- */
  var DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  var DAY_NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var HOURS = T.hours || {};
  var TZ = HOURS.timeZone || "Africa/Addis_Ababa";
  var dtf;
  try {
    dtf = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    console.warn("Tess: unknown time zone \"" + TZ + "\" in content.js, using the visitor's clock.");
    dtf = new Intl.DateTimeFormat("en-US", { hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  var CITY = TZ.split("/").pop().replace(/_/g, " ");

  function shopNow() {
    var p = {};
    dtf.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var hr = +p.hour % 24;
    var key = p.weekday.toLowerCase().slice(0, 3);
    return { date: p.year + "-" + p.month + "-" + p.day, key: key, mins: hr * 60 + (+p.minute) };
  }
  function hm(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }
  function fmt(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    return String(Math.floor(mins / 60)).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0");
  }
  function addDays(date, n) {
    var d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function dayKey(date) { return DAYS[new Date(date + "T12:00:00Z").getUTCDay()]; }
  function daysBetween(a, b) { return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5); }
  function prettyDate(date) {
    var d = new Date(date + "T12:00:00Z");
    return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
  }
  function inMins(n) {
    if (n < 1) return "under a minute";
    if (n < 60) return n + " min";
    var h = Math.floor(n / 60), m = n % 60;
    return h + " h" + (m ? " " + m + " min" : "");
  }

  function slotsFor(date) {
    var sp = (HOURS.special || []).filter(function (s) { return s.date === date; })[0];
    var list = sp ? sp.hours : (HOURS.week || {})[dayKey(date)];
    return (list || []).map(function (s) {
      var o = hm(s[0]), c = hm(s[1]);
      if (o == null || c == null) return null;
      if (c <= o) c += 1440;
      return [o, c];
    }).filter(Boolean);
  }

  function openState(now) {
    var today = slotsFor(now.date), i;
    var y = slotsFor(addDays(now.date, -1));
    for (i = 0; i < y.length; i++) {
      if (y[i][1] > 1440 && now.mins < y[i][1] - 1440) return { open: true, closes: y[i][1] - 1440, left: y[i][1] - 1440 - now.mins };
    }
    for (i = 0; i < today.length; i++) {
      if (now.mins >= today[i][0] && now.mins < today[i][1]) return { open: true, closes: today[i][1], left: today[i][1] - now.mins };
    }
    for (var d = 0; d < 8; d++) {
      var date = addDays(now.date, d), slots = slotsFor(date);
      for (i = 0; i < slots.length; i++) {
        if (d > 0 || slots[i][0] > now.mins) return { open: false, day: d, date: date, opens: slots[i][0] };
      }
    }
    return { open: false };
  }
  function openText(st) {
    if (st.open) {
      if (st.left <= 60) return { long: "Open now, closing in " + inMins(st.left), short: "Closes " + fmt(st.closes), soon: true };
      return { long: "Open now until " + fmt(st.closes), short: "Open till " + fmt(st.closes) };
    }
    if (st.day == null) return { long: "Closed", short: "Closed" };
    var when = st.day === 0 ? "at " + fmt(st.opens) : st.day === 1 ? "tomorrow at " + fmt(st.opens) : DAY_NAMES[dayKey(st.date)] + " at " + fmt(st.opens);
    var shortWhen = st.day === 0 ? fmt(st.opens) : (st.day === 1 ? "tmrw " : DAY_NAMES[dayKey(st.date)].slice(0, 3) + " ") + fmt(st.opens);
    return { long: "Closed now. We open " + when, short: "Opens " + shortWhen };
  }

  // Ethiopian clock: hours are counted from 6 in the morning, so 07:00 is 1 o'clock.
  function ethClock(mins) {
    var h = Math.floor(mins / 60) % 24, m = mins % 60;
    var eh = ((h - 6) % 12 + 12) % 12 || 12;
    var part = h >= 6 && h < 12 ? "ጠዋት" : h >= 12 && h < 18 ? "ከሰዓት" : h >= 18 ? "ማታ" : "ሌሊት";
    return eh + ":" + String(m).padStart(2, "0") + " " + part;
  }

  /* ---------- menu index + stock ---------- */
  var SIZES = T.sizes || {};
  var SIZE_KEYS = Object.keys(SIZES);
  var MENU = T.menu || [];
  var ITEMS = {};
  MENU.forEach(function (cat) {
    (cat.items || []).forEach(function (it) {
      if (ITEMS[it.id]) console.warn("Tess: two menu items share the id \"" + it.id + "\". Ids must be unique.");
      ITEMS[it.id] = { item: it, cat: cat };
    });
  });
  var TODAY = T.today || {};
  var STOCK = TODAY.items || {};
  var SIZED = MENU.some(function (cat) { return (cat.items || []).some(function (it) { return it.sizes; }); });
  Object.keys(STOCK).forEach(function (id) {
    if (!ITEMS[id]) console.warn("Tess: today.items mentions \"" + id + "\", but no menu item has that id.");
  });

  function prices(it) {
    if (it.sizes) return SIZE_KEYS.filter(function (k) { return it.sizes[k] != null; }).map(function (k) { return { key: k, label: SIZES[k].name, short: k, price: it.sizes[k] }; });
    if (it.options) return it.options.map(function (o) { return { label: o[0], price: o[1] }; });
    if (it.price != null) return [{ price: it.price }];
    console.warn("Tess: menu item \"" + it.id + "\" has no price.");
    return [];
  }
  function fromPrice(it) {
    var ps = prices(it);
    if (!ps.length) return "";
    var min = Math.min.apply(null, ps.map(function (p) { return p.price; }));
    return (ps.length > 1 ? "from " : "") + money(min);
  }

  function stockOf(id, now) {
    var rec = ITEMS[id], s = STOCK[id] || {}, it = rec.item, cat = rec.cat;
    var status = s.status === "out" || s.status === "low" ? s.status : "in";
    var out = { status: status, label: "", meta: [], left: null, note: s.note || "" };
    if (status === "low" && typeof s.left === "number") out.left = s.left;

    if (cat.served && status !== "out") {
      var a = hm(cat.served[0]), b = hm(cat.served[1]);
      if (a != null && b != null && (now.mins < a || now.mins >= b)) {
        out.status = "later";
        out.label = now.mins < a ? "From " + fmt(a) : "Back tomorrow";
        out.meta.push("Served " + fmt(a) + "–" + fmt(b));
        return out;
      }
    }

    if (out.status === "in") out.label = cat.id === "beans" ? "On the shelf" : cat.id === "slow" ? "On the bar" : "Available";
    if (out.status === "low") out.label = out.left != null ? out.left + " left" : "Running low";
    if (out.status === "out") out.label = "Sold out";

    if (s.next) {
      var n = hm(s.next);
      if (n != null) {
        var diff = n - now.mins;
        if (diff > 0) out.meta.push((out.status === "out" ? "Next batch " : "Fresh batch ") + fmt(n) + " · in " + inMins(diff));
        else if (diff > -90 && out.status !== "out") { out.meta.push("Fresh out of the oven at " + fmt(n)); out.fresh = true; }
        else if (out.status === "out" && diff > -180) out.meta.push("Batch due " + fmt(n) + ". Ask at the counter");
      }
    }
    if (it.roasted && /^\d{4}-\d{2}-\d{2}$/.test(it.roasted)) {
      var days = Math.max(0, daysBetween(it.roasted, now.date));
      out.roastDays = days;
      out.meta.push("Roasted " + prettyDate(it.roasted) + " · " + (days === 0 ? "today" : days === 1 ? "yesterday" : days + " days ago"));
    }
    if (s.note) out.meta.push(s.note);
    return out;
  }

  var TAGS = { signature: "Signature", "local-favourite": "Local favourite", ethiopian: "Ethiopian", fasting: "Fasting", new: "New", vegan: "Vegan", vegetarian: "Vegetarian", ceremony: "Ceremony" };
  function tagLabel(t) { return TAGS[t] || String(t).replace(/-/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }); }

  // Photo names used in content.js. Every photo has 480, 800 and 1200 px versions.
  var PHOTO_INFO = {
    "sign": { w: 1728, h: 2160, alt: "The round sign over our entrance: ተስ ቡና above the Tess Coffee logo and its gold leaves." },
    "slow-bar": { w: 1920, h: 2400 },
    "painting-market": { w: 1574, h: 2048 },
    "painting-wall": { w: 1920, h: 2400 },
    "counter-logo": { w: 1728, h: 2160 },
    "behind-bar": { w: 1920, h: 2400 },
    "corner": { w: 1920, h: 1920 },
    "bar-ledge": { w: 1536, h: 1920 },
    "shelf": { w: 1920, h: 1080 },
    "planter": { w: 1728, h: 1728 },
    "door": { w: 1651, h: 2064 }
  };
  function photoHTML(name, alt, sizes) {
    var info = PHOTO_INFO[name] || {}, base = "assets/img/photos/" + encodeURIComponent(name);
    var set = function (ext) { return [480, 800, 1200].map(function (w) { return base + "-" + w + "." + ext + " " + w + "w"; }).join(", "); };
    return '<picture><source type="image/avif" srcset="' + set("avif") + '" sizes="' + sizes + '"><source type="image/webp" srcset="' + set("webp") + '" sizes="' + sizes + '">' +
      '<img src="' + base + '-800.jpg"' + (info.w ? ' width="' + info.w + '" height="' + info.h + '"' : "") + ' loading="lazy" decoding="async" alt="' + esc(alt || info.alt || "") + '"></picture>';
  }

  /* ---------- small bits of content ---------- */
  var LOC = T.location || {};
  var SHOP = T.shop || {};

  function renderBasics() {
    $$("[data-area]").forEach(function (n) { if (LOC.area) n.textContent = LOC.area; });
    var cn = $("[data-currency-note]");
    if (cn && CUR.name) cn.textContent = "Prices in " + CUR.name;
    $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });

    if (T.settings && T.settings.showPlaceholderBanner) {
      var foot = $("[data-placeholder-footnote]");
      if (foot) foot.hidden = false;
      var banner = $("[data-placeholder-banner]");
      var dismissed = false;
      try { dismissed = sessionStorage.getItem("tess-banner") === "off"; } catch (e) { /* storage blocked */ }
      if (banner && !dismissed) {
        banner.hidden = false;
        $("[data-placeholder-close]").addEventListener("click", function () {
          banner.hidden = true;
          try { sessionStorage.setItem("tess-banner", "off"); } catch (e) { /* storage blocked */ }
        });
      }
    }
  }

  /* ---------- opening hours ---------- */
  var ethOn = false;
  function renderHours() {
    var now = shopNow(), st = openState(now), txt = openText(st);
    var dotCls = "status-dot" + (st.open ? (txt.soon ? " is-soon" : " is-open") : "");

    var pill = $("[data-open-pill]");
    if (pill) {
      pill.classList.toggle("is-open", st.open && !txt.soon);
      $("[data-open-short]", pill).textContent = txt.short;
      pill.setAttribute("aria-label", txt.long + ". See hours and directions");
    }
    var long = $("[data-open-long]");
    if (long) long.innerHTML = '<span class="' + dotCls + '" aria-hidden="true"></span><span>' + esc(txt.long) + "</span>";
    var detail = $("[data-open-detail]");
    if (detail) detail.innerHTML = '<span class="' + dotCls + '" aria-hidden="true"></span><span>' + esc(txt.long) + "</span>";

    var rows = $("[data-hours-rows]");
    if (rows) {
      var order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], todayKey = now.key, html = "";
      // show this week's real dates so holidays land on the right row
      var offset = (order.indexOf(todayKey) + 7) % 7;
      order.forEach(function (k, i) {
        var date = addDays(now.date, i - offset);
        var slots = slotsFor(date);
        var cell = slots.length ? slots.map(function (s) {
          var t = fmt(s[0]) + "–" + fmt(s[1]);
          return ethOn ? t + '<span class="eth" lang="am">' + ethClock(s[0]) + " – " + ethClock(s[1] % 1440) + "</span>" : t;
        }).join("<br>") : '<span class="closed">Closed</span>';
        var sp = (HOURS.special || []).filter(function (s) { return s.date === date; })[0];
        html += '<tr class="' + (k === todayKey ? "is-today" : "") + '"><th scope="row">' + DAY_NAMES[k] + (sp ? '<span class="sr-only"> (' + esc(sp.label) + ")</span>" : "") + "</th><td>" + cell + "</td></tr>";
      });
      rows.innerHTML = html;
    }
    var special = $("[data-hours-special]");
    if (special) {
      var up = (HOURS.special || []).filter(function (s) { return s.date >= now.date; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 2);
      special.innerHTML = up.map(function (s) {
        var sl = (s.hours || []).map(function (x) { return x[0] + "–" + x[1]; }).join(", ");
        return "<strong>" + esc(s.label) + "</strong>, " + prettyDate(s.date) + ": " + (sl || "closed");
      }).join("<br>");
    }
    var fh = $("[data-footer-hours]");
    if (fh) {
      var ts = slotsFor(now.date);
      fh.textContent = ts.length ? "Today " + ts.map(function (s) { return fmt(s[0]) + "–" + fmt(s[1]); }).join(", ") : "Closed today";
    }
    var fst = $("[data-footer-status]");
    if (fst) fst.innerHTML = '<span class="' + dotCls + '" aria-hidden="true"></span><span>' + esc(txt.long) + "</span>";
    return st;
  }

  /* ---------- "On the bar today" ---------- */
  var boardFilter = "all", lastBoardSig = "", litShelves = {};
  function updatedText(now) {
    var u = String(TODAY.updated || "").trim();
    if (!u) return "";
    var m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})$/.exec(u), date, mins;
    if (m) { date = m[1]; mins = hm(m[2]); }
    else { mins = hm(u); date = now.date; if (mins != null && mins > now.mins) date = addDays(now.date, -1); }
    if (mins == null) return "";
    var ago = daysBetween(date, now.date) * 1440 + now.mins - mins;
    var who = TODAY.updatedBy ? " by " + TODAY.updatedBy : "";
    var when = date === now.date ? "at " + fmt(mins) : daysBetween(date, now.date) === 1 ? "yesterday at " + fmt(mins) : prettyDate(date);
    var rel = ago < 2 ? "just now" : ago < 60 * 24 ? inMins(ago) + " ago" : Math.round(ago / 1440) + " days ago";
    var stale = ago > 60 * 36 ? " · ask at the counter for the latest" : "";
    return "Updated " + when + who + " · " + rel + stale;
  }

  function tileHTML(id, now, i) {
    var it = ITEMS[id].item, s = stockOf(id, now);
    var meta = s.meta.slice(0, 2).map(esc).join("<br>");
    var dots = s.left != null && s.left <= 12 ? '<span class="dots" aria-hidden="true">' + new Array(s.left + 1).join("<i></i>") + "</span>" : "";
    var fresh = "";
    if (s.roastDays != null) {
      var pos = Math.min(s.roastDays / 30, 1) * 100;
      fresh = '<div class="fresh" aria-hidden="true"><span class="fresh__peak" style="left:' + (5 / 30 * 100) + "%;width:" + (16 / 30 * 100) + '%"></span><span class="fresh__now" style="left:' + pos + '%"></span></div>';
    }
    var stCls = s.status === "in" ? "st-in" : s.status === "low" ? "st-low" : s.status === "out" ? "st-out" : "st-later";
    return '<li class="tile is-' + s.status + '" data-status="' + s.status + '" style="--i:' + i + '">' +
      '<a class="tile__link" href="#item-' + esc(id) + '" data-id="' + esc(id) + '"><span class="sr-only">' + esc(it.name) + ": " + esc(s.label) + ". See it on the menu</span></a>" +
      '<div class="tile__top"><span class="tile__bulb" aria-hidden="true"></span><span class="tile__price">' + esc(fromPrice(it)) + "</span></div>" +
      '<h4 class="tile__name" aria-hidden="true">' + esc(it.name) + "</h4>" +
      '<p class="tile__status ' + stCls + '" aria-hidden="true">' + esc(s.label) + dots + "</p>" +
      (meta ? '<p class="tile__meta">' + meta + "</p>" : "") + fresh +
      (s.status === "out" ? '<span class="tile__stamp" aria-hidden="true">Sold out</span>' : "") +
      "</li>";
  }

  function renderBoard(force) {
    var wrap = $("[data-shelves]");
    if (!wrap) return;
    var now = shopNow();
    var shelfIds = ((T.board && T.board.shelves) || []).filter(function (id) {
      var ok = MENU.some(function (c) { return c.id === id; });
      if (!ok) console.warn("Tess: board.shelves lists \"" + id + "\", but there is no menu section with that id.");
      return ok;
    });

    // summary across the whole menu
    var outs = [], lows = [], counts = { all: 0, in: 0, out: 0 };
    MENU.forEach(function (cat) {
      cat.items.forEach(function (it) {
        var s = stockOf(it.id, now);
        if (s.status === "out") outs.push(it.name);
        if (s.status === "low") lows.push(it.name + (s.left != null ? " (" + s.left + " left)" : ""));
      });
    });
    shelfIds.forEach(function (cid) {
      MENU.filter(function (c) { return c.id === cid; })[0].items.forEach(function (it) {
        var s = stockOf(it.id, now).status;
        counts.all++;
        if (s === "in" || s === "low") counts.in++;
        if (s === "out") counts.out++;
      });
    });
    var list = function (a) { return a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0]; };
    var st = openState(now);
    var sum = (st.open ? "" : '<span class="today__closed">' + esc(openText(st).long) + "</span> ") +
      (outs.length ? "Sold out right now: <strong>" + esc(list(outs)) + "</strong>. " : "<strong>Everything on the menu is available.</strong> ") +
      (lows.length ? "Running low: " + esc(list(lows)) + "." : "");

    var sig = JSON.stringify([shelfIds.map(function (cid) {
      return MENU.filter(function (c) { return c.id === cid; })[0].items.map(function (it) { var s = stockOf(it.id, now); return [s.status, s.label, s.meta]; });
    }), boardFilter, sum]);
    if (!force && sig === lastBoardSig) return;
    lastBoardSig = sig;

    $("[data-today-summary]").innerHTML = sum;
    $$("[data-board-filters] button").forEach(function (b) {
      var f = b.getAttribute("data-filter");
      var label = f === "all" ? "Everything" : f === "in" ? "Available" : "Sold out";
      b.innerHTML = label + '<span class="count">' + counts[f] + "</span>";
      b.setAttribute("aria-pressed", String(f === boardFilter));
    });

    var focusedId = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("data-id");
    wrap.innerHTML = shelfIds.map(function (cid) {
      var cat = MENU.filter(function (c) { return c.id === cid; })[0];
      var ids = cat.items.map(function (it) { return it.id; }).filter(function (id) {
        var s = stockOf(id, now).status;
        return boardFilter === "all" || (boardFilter === "in" ? s === "in" || s === "low" : s === "out");
      });
      var avail = cat.items.filter(function (it) { var s = stockOf(it.id, now).status; return s === "in" || s === "low"; }).length;
      var served = "";
      if (cat.served) {
        var a = hm(cat.served[0]), b = hm(cat.served[1]);
        if (now.mins < a || now.mins >= b) served = '<p class="shelf__note">' + esc(cat.title) + " is served " + fmt(a) + "–" + fmt(b) + (now.mins >= b ? ". Back tomorrow." : ".") + "</p>";
      }
      var tiles = ids.length ? ids.map(function (id, i) { return tileHTML(id, now, i); }).join("") :
        '<li class="shelf__empty">' + (boardFilter === "out" ? "Nothing sold out on this shelf." : "Nothing available here right now.") + "</li>";
      return '<div class="shelf' + (litShelves[cid] ? " is-lit" : "") + '" role="group" data-shelf="' + esc(cid) + '" aria-labelledby="shelf-' + esc(cid) + '">' +
        '<div class="shelf__head"><h3 class="shelf__title" id="shelf-' + esc(cid) + '">' + esc(cat.title) + "</h3>" +
        '<span class="shelf__count">' + avail + " of " + cat.items.length + " available</span></div>" + served +
        '<div class="shelf__rail"><div class="shelf__strip" aria-hidden="true"></div><ul class="shelf__items">' + tiles + "</ul></div></div>";
    }).join("");

    // the LED reaches each tile in turn
    $$(".shelf", wrap).forEach(function (shelf) {
      var rail = $(".shelf__rail", shelf), wd = rail.clientWidth || 1;
      $$(".tile", shelf).forEach(function (t) {
        t.style.setProperty("--d", Math.round(150 + (t.offsetLeft / wd) * 1100 + (t.offsetTop > 20 ? 120 : 0)) + "ms");
      });
      observeShelf(shelf);
    });
    if (focusedId) { var f = $('.tile__link[data-id="' + focusedId + '"]', wrap); if (f) f.focus({ preventScroll: true }); }
  }

  var shelfIO = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-lit");
      litShelves[e.target.getAttribute("data-shelf")] = true;
      shelfIO.unobserve(e.target);
    });
  }, { threshold: 0.35 }) : null;
  function observeShelf(shelf) {
    if (shelf.classList.contains("is-lit")) return;
    if (!shelfIO || reduced()) { shelf.classList.add("is-lit"); litShelves[shelf.getAttribute("data-shelf")] = true; return; }
    shelfIO.observe(shelf);
  }

  function renderClock() {
    var now = shopNow();
    var c = $("[data-shop-clock]");
    if (c) {
      var hhmm = fmt(now.mins).split(":");
      c.innerHTML = DAY_NAMES[now.key] + " " + hhmm[0] + '<span class="colon">:</span>' + hhmm[1] + " in " + esc(CITY);
    }
    var u = $("[data-updated]");
    if (u) u.textContent = updatedText(now);
  }

  function initBoard() {
    var filters = $("[data-board-filters]");
    if (filters) filters.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-filter]");
      if (!b) return;
      boardFilter = b.getAttribute("data-filter");
      renderBoard(true);
    });
    $("[data-shelves]").addEventListener("click", function (e) {
      var a = e.target.closest(".tile__link");
      if (!a) return;
      e.preventDefault();
      goToItem(a.getAttribute("data-id"));
    });
    renderBoard(true);
  }

  /* ---------- the menu ---------- */
  var menuSig = "";
  function cupIcon(k, base) {
    var scale = { S: 0.82, M: 1, L: 1.18 }[k] || 1, em = ((base || 1.15) * scale).toFixed(2);
    return '<svg class="icon" aria-hidden="true" style="width:' + em + "em;height:" + em + 'em"><use href="#i-cup"/></svg>';
  }

  function itemHTML(it, cat, now, sized) {
    var s = stockOf(it.id, now), ps = prices(it), priceHTML, kind;
    if (it.sizes) {
      kind = "sizes";
      priceHTML = SIZE_KEYS.map(function (k) {
        if (it.sizes[k] == null) return sized ? '<span class="pp pp--na" aria-hidden="true">–</span>' : "";
        return '<span class="pp"><abbr aria-hidden="true">' + esc(k) + '</abbr><span class="sr-only">' + esc(SIZES[k].name) + " " + esc(SIZES[k].ml) + " ml: </span>" +
          '<span class="price-v">' + esc(money(it.sizes[k])) + "</span></span>";
      }).join("");
    } else if (it.options) {
      kind = "opts";
      priceHTML = ps.map(function (p) { return '<span class="pp"><span class="pp-label">' + esc(p.label) + '</span> <span class="price-v">' + esc(money(p.price)) + "</span></span>"; }).join("");
    } else {
      kind = "single";
      priceHTML = ps.map(function (p) { return '<span class="pp"><span class="price-v">' + esc(money(p.price)) + "</span></span>"; }).join("");
    }
    var flags = (it.tags || []).map(function (t) { return '<span class="tag">' + esc(tagLabel(t)) + "</span>"; }).join("");
    if (s.status === "out") flags += '<span class="flag flag--out">Sold out today</span>';
    else if (s.status === "low") flags += '<span class="flag flag--low">' + esc(s.left != null ? "Only " + s.left + " left" : "Running low") + "</span>";
    else if (s.status === "later") flags += '<span class="flag flag--later">' + esc(s.label) + "</span>";
    if (s.fresh) flags += '<span class="flag flag--fresh">Fresh batch</span>';
    if (it.cup && CUP_IDS.indexOf(it.id) > -1) flags += '<button class="cup-link" type="button" data-cup-go="' + esc(it.id) + '">' + icon("i-cup") + "See it in the cup</button>";
    var note = s.note && (s.status === "out" || s.status === "low") ? '<p class="menu-item__desc">' + esc(s.note) + "</p>" : "";
    var search = [it.name, it.desc, (it.tags || []).map(tagLabel).join(" "), cat.title, s.status === "out" ? "sold out" : ""].join(" ").toLowerCase();
    return '<li class="menu-item is-' + s.status + '" id="item-' + esc(it.id) + '" data-status="' + s.status + '" data-search="' + esc(search) + '">' +
      '<div class="menu-item__main"><h4 class="menu-item__name">' + esc(it.name) + "</h4>" +
      (it.desc ? '<p class="menu-item__desc">' + esc(it.desc) + "</p>" : "") + note + "</div>" +
      '<div class="menu-item__prices menu-item__prices--' + kind + '">' + priceHTML + "</div>" +
      '<div class="menu-item__aside"><div class="menu-item__flags">' + flags + "</div></div></li>";
  }

  function renderMenu(force) {
    var body = $("[data-menu]");
    if (!body) return;
    var now = shopNow();
    var sig = JSON.stringify(MENU.map(function (c) { return c.items.map(function (it) { var s = stockOf(it.id, now); return [s.status, s.label, s.fresh]; }); }));
    if (!force && sig === menuSig) return;
    menuSig = sig;

    body.innerHTML = MENU.map(function (cat) {
      var sized = cat.items.some(function (it) { return it.sizes; });
      var served = "";
      if (cat.served) {
        var a = hm(cat.served[0]), b = hm(cat.served[1]), on = now.mins >= a && now.mins < b;
        served = '<span class="menu-cat__served' + (on ? "" : " is-closed") + '">' + icon("i-clock") + fmt(a) + "–" + fmt(b) + "</span>";
      }
      var cols = sized ? '<div class="menu-cat__cols" aria-hidden="true">' + SIZE_KEYS.map(function (k) {
        return "<span>" + cupIcon(k, 1.9) + "<b>" + esc(k) + "</b>" + esc(SIZES[k].ml) + " ml</span>";
      }).join("") + "</div>" : "";
      return '<section class="menu-cat" id="cat-' + esc(cat.id) + '" aria-labelledby="cat-' + esc(cat.id) + '-t" data-cat="' + esc(cat.id) + '">' +
        '<div class="menu-cat__head"><h3 class="menu-cat__title" id="cat-' + esc(cat.id) + '-t">' + esc(cat.title) + served + "</h3>" + cols +
        (cat.note ? '<p class="menu-cat__note">' + esc(cat.note) + "</p>" : "") + "</div>" +
        '<ul class="menu-list">' + cat.items.map(function (it) { return itemHTML(it, cat, now, sized); }).join("") + "</ul></section>";
    }).join("");
    renderFeatured(now);

    var nav = $("[data-menu-cats]");
    if (nav && !nav.childElementCount) {
      nav.innerHTML = MENU.map(function (cat) { return '<a href="#cat-' + esc(cat.id) + '" data-cat-link="' + esc(cat.id) + '">' + esc(cat.title) + "</a>"; }).join("");
    }
    applyMenuFilters();
    observeCats();
  }

  function renderFeatured(now) {
    var wrap = $("[data-featured-wrap]"), ul = $("[data-featured]");
    if (!wrap || !ul) return;
    var ids = (T.featured || []).filter(function (id) {
      if (!ITEMS[id]) console.warn("Tess: featured lists \"" + id + "\", but no menu item has that id.");
      return !!ITEMS[id];
    });
    wrap.hidden = !ids.length;
    ul.innerHTML = ids.map(function (id, i) {
      var it = ITEMS[id].item, s = stockOf(id, now);
      var flag = s.status === "out" ? '<span class="flag flag--out">Sold out today</span>' :
        s.status === "low" ? '<span class="flag flag--low">' + esc(s.left != null ? "Only " + s.left + " left" : "Running low") + "</span>" : "";
      var action = CUP_IDS.indexOf(id) > -1 ?
        '<button class="cup-link" type="button" data-cup-go="' + esc(id) + '">' + icon("i-cup") + "See it in the cup</button>" :
        '<a class="feat__link" href="#item-' + esc(id) + '" data-go-item="' + esc(id) + '">On the menu →</a>';
      return '<li class="feat is-' + s.status + '">' +
        '<svg class="feat__mark" viewBox="0 0 214.2 181.2" aria-hidden="true"><use href="#tess-leaves"/></svg>' +
        '<p class="feat__no" aria-hidden="true">' + String(i + 1).padStart(2, "0") + "</p>" +
        '<h4 class="feat__name">' + esc(it.name) + "</h4>" +
        (it.desc ? '<p class="feat__desc">' + esc(it.desc) + "</p>" : "") +
        '<div class="feat__foot"><span class="feat__price">' + esc(fromPrice(it)) + "</span>" + flag + action + "</div></li>";
    }).join("");
  }

  function applyMenuFilters() {
    var q = ($("[data-menu-search]") || {}).value || "";
    var terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var availOnly = ($("[data-available-only]") || {}).checked;
    var shown = 0;
    $$(".menu-cat").forEach(function (cat) {
      var any = false;
      $$(".menu-item", cat).forEach(function (li) {
        var text = li.getAttribute("data-search"), st = li.getAttribute("data-status");
        var ok = terms.every(function (t) { return text.indexOf(t) > -1; }) && (!availOnly || st === "in" || st === "low");
        li.hidden = !ok;
        if (ok) { any = true; shown++; }
      });
      cat.hidden = !any;
      var link = $('[data-cat-link="' + cat.getAttribute("data-cat") + '"]');
      if (link) link.hidden = !any;
    });
    var empty = $("[data-menu-empty]");
    if (empty) {
      empty.hidden = shown > 0;
      if (!shown) {
        empty.innerHTML = (q ? "Nothing on the menu matches \u201c" + esc(q) + "\u201d" : "Nothing matches") + '. <button class="btn btn--small btn--outline" type="button" data-menu-reset>Show everything</button>';
      }
    }
  }

  var catIO, catSeen = {};
  function observeCats() {
    if (!("IntersectionObserver" in window)) return;
    if (catIO) catIO.disconnect();
    catSeen = {};
    var nav = $("[data-menu-cats]");
    catIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { catSeen[e.target.getAttribute("data-cat")] = e.isIntersecting; });
      // in the two-column layout several sections share the band; follow reading order
      var id = MENU.map(function (c) { return c.id; }).filter(function (c) { return catSeen[c]; })[0];
      if (!id) return;
      $$("a", nav).forEach(function (a) {
        var on = a.getAttribute("data-cat-link") === id;
        if (on && a.getAttribute("aria-current") !== "true") {
          a.setAttribute("aria-current", "true");
          nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2, behavior: reduced() ? "auto" : "smooth" });
        } else if (!on) a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-30% 0px -55% 0px" });
    $$(".menu-cat").forEach(function (c) { catIO.observe(c); });
  }

  function goToItem(id) {
    var li = document.getElementById("item-" + id);
    if (!li) return;
    if (li.hidden) {
      var s = $("[data-menu-search]"), a = $("[data-available-only]");
      if (s) s.value = "";
      if (a) a.checked = false;
      applyMenuFilters();
    }
    li.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
    li.classList.remove("flash");
    void li.offsetWidth;
    li.classList.add("flash");
    li.setAttribute("tabindex", "-1");
    li.focus({ preventScroll: true });
  }

  function initMenu() {
    renderMenu(true);
    var legend = $("[data-sizes-legend]");
    if (legend && !SIZED) legend.hidden = true;
    else if (legend) {
      legend.innerHTML = '<ul class="sizes-legend" aria-label="Cup sizes">' + SIZE_KEYS.map(function (k) {
        return "<li>" + cupIcon(k, 1.7) + "<b>" + esc(SIZES[k].name) + "</b>" + esc(SIZES[k].ml) + " ml</li>";
      }).join("") + "</ul>";
    }
    var search = $("[data-menu-search]");
    if (search) search.addEventListener("input", applyMenuFilters);
    var avail = $("[data-available-only]");
    if (avail) avail.addEventListener("change", applyMenuFilters);
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-menu-reset]")) {
        if (search) search.value = "";
        if (avail) avail.checked = false;
        applyMenuFilters();
        if (search) search.focus();
      }
      var go = e.target.closest("[data-cup-go]");
      if (go) pickDrink(go.getAttribute("data-cup-go"), true);
      var feat = e.target.closest("[data-featured] [data-go-item]");
      if (feat) { e.preventDefault(); goToItem(feat.getAttribute("data-go-item")); }
    });
  }

  /* ---------- the cup ---------- */
  var CUP_IDS = [], cup = null, cupState = { id: null, size: "M", lid: false, light: true };
  MENU.forEach(function (cat) {
    cat.items.forEach(function (it) { if (it.cup && (it.sizes || it.price != null)) CUP_IDS.push(it.id); });
  });

  function cupSizesFor(it) {
    if (it.sizes) return SIZE_KEYS.filter(function (k) { return it.sizes[k] != null; });
    return ["M"];
  }

  function renderCupReadout() {
    var out = $("[data-cup-readout]");
    if (!out || !cupState.id) return;
    var it = ITEMS[cupState.id].item, s = stockOf(it.id, shopNow());
    var price = it.sizes ? it.sizes[cupState.size] : it.price;
    var sz = SIZES[cupState.size] || { name: "", ml: "" };
    out.innerHTML = "<b>" + esc(it.name) + "</b>" + (it.sizes ? '<span class="r-size">' + esc(sz.name) + " · " + esc(sz.ml) + " ml</span>" : "") +
      '<span class="r-price">' + esc(money(price)) + "</span>" + (s.status === "out" ? '<span class="r-out">Sold out today</span>' : "");
    var canvas = $("[data-cup-canvas]");
    if (canvas) canvas.setAttribute("aria-label", "A Tess Coffee takeaway cup: " + it.name + (it.sizes ? ", " + sz.name.toLowerCase() : "") + ", " + money(price) + (cupState.lid ? ", lid off so you can see inside" : "") + ". Drag it, or use the left and right arrow keys, to spin it.");
  }

  function renderCupSizes() {
    var box = $("[data-cup-sizes]");
    if (!box || !cupState.id) return;
    var it = ITEMS[cupState.id].item, ok = cupSizesFor(it);
    if (ok.indexOf(cupState.size) < 0) cupState.size = ok.indexOf("M") > -1 ? "M" : ok[0];
    var group = $("[data-cup-sizes-group]");
    if (group) group.hidden = !it.sizes;
    box.innerHTML = SIZE_KEYS.map(function (k) {
      var avail = ok.indexOf(k) > -1, p = it.sizes ? it.sizes[k] : (k === "M" ? it.price : null);
      return '<label><input type="radio" name="cup-size" value="' + esc(k) + '"' + (k === cupState.size ? " checked" : "") + (avail ? "" : " disabled") + ">" +
        "<span>" + esc(k) + "<small>" + (avail && p != null ? esc(money(p)) : "–") + '</small><span class="sr-only"> ' + esc(SIZES[k].name) + ", " + esc(SIZES[k].ml) + " ml" + (avail ? "" : ", not available for this drink") + "</span></span></label>";
    }).join("");
    if (cup) cup.setSize(cupState.size);
  }

  function pickDrink(id, scroll) {
    var input = $('[data-cup-drinks] input[value="' + id + '"]');
    if (!input) return;
    input.checked = true;
    selectDrink(id, true);
    if (scroll) {
      var stage = $("[data-stage]");
      if (stage) stage.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
      setTimeout(function () { input.focus({ preventScroll: true }); }, reduced() ? 0 : 700);
    }
  }

  function selectDrink(id, peek) {
    cupState.id = id;
    var it = ITEMS[id].item;
    if (cup) cup.setDrink(it.cup);
    renderCupSizes();
    if (peek) setLid(true);
    renderCupReadout();
  }

  function setLid(off) {
    cupState.lid = off;
    if (cup) cup.setLid(off);
    var b = $("[data-cup-lid]");
    if (b) {
      b.setAttribute("aria-pressed", String(off));
      $("span", b).textContent = off ? "Lid back on" : "Peek inside";
      $("use", b).setAttribute("href", off ? "#i-lid" : "#i-eye");
    }
    renderCupReadout();
  }

  function initCup() {
    var drinks = $("[data-cup-drinks]");
    if (!drinks || !CUP_IDS.length) { var st = $("[data-stage]"); if (st) st.hidden = true; return; }
    var now = shopNow();
    drinks.innerHTML = CUP_IDS.map(function (id) {
      var it = ITEMS[id].item, out = stockOf(id, now).status === "out";
      return '<label class="chip"><input type="radio" name="cup-drink" value="' + esc(id) + '"><span>' + esc(it.name) + (out ? "<small>Sold out</small>" : "") + "</span></label>";
    }).join("");
    var first = (T.featured || []).filter(function (id) { return CUP_IDS.indexOf(id) > -1; })[0] ||
      (CUP_IDS.indexOf("cappuccino") > -1 ? "cappuccino" : CUP_IDS[0]);
    $('input[value="' + first + '"]', drinks).checked = true;

    var stage = $("[data-stage]"), canvas = $("[data-cup-canvas]"), arch = $(".stage__arch", stage);
    var hint = $("[data-cup-hint]");
    if (window.TessCup && canvas) {
      cup = window.TessCup.create(canvas, {
        reducedMotion: reduced(),
        onInteract: function () { if (hint) hint.classList.add("is-gone"); },
        onLayout: function (l) {
          arch.style.setProperty("--counter-back", (l.back * 100).toFixed(2) + "%");
          arch.style.setProperty("--floor", (l.base * 100).toFixed(2) + "%");
          arch.style.setProperty("--counter-front", (l.front * 100).toFixed(2) + "%");
        },
        onLost: fallback
      });
    }
    if (!cup) fallback();
    function fallback() {
      cup = null;
      canvas.hidden = true;
      if (hint) hint.hidden = true;
      $("[data-cup-fallback]").hidden = false;
      var lid = $("[data-cup-lid]");
      if (lid) lid.hidden = true;
      stage.classList.add("no-webgl");
    }
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", function () { if (cup) cup.setReducedMotion(reduced()); });

    selectDrink(first, false);
    drinks.addEventListener("change", function (e) { if (e.target.name === "cup-drink") selectDrink(e.target.value, true); });
    $("[data-cup-sizes]").addEventListener("change", function (e) {
      if (e.target.name !== "cup-size") return;
      cupState.size = e.target.value;
      if (cup) cup.setSize(cupState.size);
      renderCupReadout();
    });
    $("[data-cup-lid]").addEventListener("click", function () { setLid(!cupState.lid); });
    var lamp = $("[data-lamp]");
    if (lamp) lamp.addEventListener("click", function () {
      cupState.light = !cupState.light;
      lamp.setAttribute("aria-pressed", String(cupState.light));
      arch.classList.toggle("lights-off", !cupState.light);
      if (cup) cup.setLight(cupState.light);
      toast(cupState.light ? "Lights on." : "Lights off. Tap the lamp again to switch it back on.");
    });
  }

  /* ---------- inside: hotspots, photo strip, lightbox ---------- */
  function initTour() {
    var card = $("[data-spot-card]"), spots = $$("[data-spot]");
    spots.forEach(function (b, i) {
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-controls", "spot-card");
      b.addEventListener("click", function () {
        spots.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        var stock = "";
        var id = b.getAttribute("data-item");
        if (id && ITEMS[id]) {
          var s = stockOf(id, shopNow());
          stock = '<p class="spot-card__stock ' + (s.status === "out" ? "st-out" : s.status === "low" ? "st-low" : "st-in") + '">' + esc(s.status === "in" ? "On the counter right now" : s.label) + " · " + esc(fromPrice(ITEMS[id].item)) + "</p>";
        }
        var link = b.getAttribute("data-link");
        card.innerHTML = '<p class="spot-card__kicker">' + (i + 1) + " of " + spots.length + "</p>" +
          '<h3 class="spot-card__title">' + esc(b.getAttribute("data-title")) + "</h3>" +
          '<p class="spot-card__text">' + esc(b.getAttribute("data-text")) + "</p>" + stock +
          (link ? '<a class="spot-card__link" href="' + esc(link) + '"' + (id ? ' data-go-item="' + esc(id) + '"' : "") + ">" + esc(b.getAttribute("data-link-label") || "Take me there") + " →</a>" : "");
        card.classList.remove("is-swapping"); void card.offsetWidth; card.classList.add("is-swapping");
      });
    });
    if (card) {
      card.id = "spot-card";
      card.addEventListener("click", function (e) {
        var a = e.target.closest("[data-go-item]");
        if (a) { e.preventDefault(); goToItem(a.getAttribute("data-go-item")); }
      });
    }
  }

  function initStrip() {
    var list = $("[data-strip-list]"), prev = $("[data-strip-prev]"), next = $("[data-strip-next]");
    if (!list) return;
    function update() {
      prev.disabled = list.scrollLeft < 8;
      next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 8;
    }
    function go(dir) { list.scrollBy({ left: dir * list.clientWidth * 0.75, behavior: reduced() ? "auto" : "smooth" }); }
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    list.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    initLightbox($$("[data-lightbox]", list));
  }

  function initLightbox(buttons) {
    var dlg = $("[data-lightbox-dialog]");
    if (!dlg || !buttons.length || typeof dlg.showModal !== "function") return;
    var pic = $("[data-lightbox-picture]", dlg), cap = $("[data-lightbox-caption]", dlg), idx = 0, opener = null;
    function show(i) {
      idx = (i + buttons.length) % buttons.length;
      var b = buttons[idx], name = b.getAttribute("data-lightbox"), img = $("img", b);
      var base = "assets/img/photos/" + name;
      pic.innerHTML = '<source type="image/avif" srcset="' + base + "-800.avif 800w, " + base + '-1200.avif 1200w" sizes="94vw">' +
        '<source type="image/webp" srcset="' + base + "-800.webp 800w, " + base + '-1200.webp 1200w" sizes="94vw">' +
        '<img src="' + base + '-800.jpg" width="' + b.getAttribute("data-w") + '" height="' + b.getAttribute("data-h") + '" alt="' + esc(img.getAttribute("alt")) + '">';
      cap.textContent = b.getAttribute("data-caption") + "  (" + (idx + 1) + " of " + buttons.length + ")";
    }
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { opener = b; show(i); dlg.showModal(); });
    });
    $("[data-lightbox-close]", dlg).addEventListener("click", function () { dlg.close(); });
    $("[data-lightbox-prev]", dlg).addEventListener("click", function () { show(idx - 1); });
    $("[data-lightbox-next]", dlg).addEventListener("click", function () { show(idx + 1); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
      if (e.key === "Escape") { e.preventDefault(); dlg.close(); }
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.classList.contains("lightbox__inner")) dlg.close();
    });
    var sx = null;
    dlg.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    dlg.addEventListener("pointerup", function (e) {
      if (sx == null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
    dlg.addEventListener("close", function () {
      pic.innerHTML = "";
      if (opener) opener.focus();
    });
  }

  /* ---------- visit: map, address, directions ---------- */
  function addressText() {
    return [SHOP.name || "Tess Coffee"].concat(LOC.address || []).join(", ");
  }

  function initVisit() {
    var lat = +LOC.lat, lng = +LOC.lng, hasPin = isFinite(lat) && isFinite(lng) && (lat || lng);
    var addr = $("[data-address]");
    if (addr) addr.innerHTML = (LOC.address || []).map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("");
    var lm = $("[data-landmark]");
    if (lm) { if (LOC.landmark) lm.textContent = LOC.landmark; else lm.parentNode.hidden = true; }
    var fa = $("[data-footer-address]");
    if (fa) fa.innerHTML = (LOC.address || []).map(esc).join("<br>");

    var steps = $("[data-directions]");
    if (steps) {
      steps.innerHTML = (LOC.directions || []).map(function (d) {
        return '<li class="route__step"><h4>' + esc(d.title) + "</h4><p>" + esc(d.text) + "</p>" +
          (d.photo ? '<div class="route__photo">' + photoHTML(d.photo, d.photoAlt, "150px") + "</div>" : "") + "</li>";
      }).join("");
      if (LOC.parking) {
        var note = document.createElement("p");
        note.className = "route__note";
        note.innerHTML = icon("i-pin") + "<span><strong>Coming by car?</strong> " + esc(LOC.parking) + "</span>";
        steps.parentNode.insertBefore(note, steps.nextSibling);
      }
    }

    var contact = [], footerContact = [];
    if (SHOP.phone) contact.push(["tel:" + SHOP.phone.replace(/[^\d+]/g, ""), "i-phone", SHOP.phone, "Call"]);
    if (SHOP.telegram) contact.push(["https://t.me/" + SHOP.telegram.replace(/^@/, ""), "i-telegram", "Telegram", "Telegram"]);
    if (SHOP.instagram) contact.push(["https://instagram.com/" + SHOP.instagram.replace(/^@/, ""), "i-instagram", "Instagram", "Instagram"]);
    if (SHOP.tiktok) contact.push(["https://www.tiktok.com/@" + SHOP.tiktok.replace(/^@/, ""), "i-link", "TikTok", "TikTok"]);
    var c = $("[data-contact]");
    if (c) c.innerHTML = contact.map(function (x) {
      var ext = x[0].indexOf("http") === 0;
      return '<li><a class="btn btn--small btn--outline" href="' + esc(x[0]) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + icon(x[1]) + esc(x[2]) + "</a></li>";
    }).join("");
    var fc = $("[data-footer-contact]");
    if (fc) fc.innerHTML = contact.map(function (x) {
      var ext = x[0].indexOf("http") === 0;
      return '<li><a href="' + esc(x[0]) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + icon(x[1]) + esc(x[2]) + "</a></li>";
    }).join("");

    var g = $("[data-dir-google]"), ap = $("[data-dir-apple]");
    if (hasPin) {
      if (g) g.href = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng;
      if (ap) ap.href = "https://maps.apple.com/?daddr=" + lat + "," + lng + "&q=" + encodeURIComponent(SHOP.name || "Tess Coffee");
    } else {
      if (g) g.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addressText());
      if (ap) ap.hidden = true;
    }
    if (g) g.setAttribute("aria-label", "Directions in Google Maps (opens in a new tab)");
    if (ap) ap.setAttribute("aria-label", "Directions in Apple Maps (opens in a new tab)");

    $$("[data-copy-address]").forEach(function (b) {
      b.addEventListener("click", function () {
        copyText(addressText()).then(function () { toast("Address copied. Paste it into your ride app."); }, function () { toast(addressText()); });
      });
    });

    var distBtn = $("[data-distance]"), distOut = $("[data-distance-out]");
    if (distBtn) {
      if (!navigator.geolocation || !hasPin) distBtn.hidden = true;
      else distBtn.addEventListener("click", function () {
        distOut.textContent = "Finding you…";
        navigator.geolocation.getCurrentPosition(function (pos) {
          var km = haversine(pos.coords.latitude, pos.coords.longitude, lat, lng);
          var walk = Math.round(km * 1.3 / 4.8 * 60);
          if (km < 0.08) distOut.innerHTML = "<strong>You're basically here.</strong> Look for the cup on the glass door.";
          else if (km < 6) distOut.innerHTML = "You're about <strong>" + km.toFixed(km < 1 ? 2 : 1) + " km</strong> away, roughly <strong>" + walk + " minutes</strong> on foot.";
          else if (km < 60) distOut.innerHTML = "You're about <strong>" + Math.round(km) + " km</strong> away. A ride is your friend: tap Directions.";
          else distOut.innerHTML = "You're about <strong>" + Math.round(km).toLocaleString("en-US") + " km</strong> away. Worth the trip.";
        }, function () {
          distOut.textContent = "We couldn't get your location. No problem: tap Directions instead.";
        }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
      });
    }

    initMap(hasPin, lat, lng);
  }

  function haversine(a1, o1, a2, o2) {
    var R = 6371, r = Math.PI / 180, da = (a2 - a1) * r, dob = (o2 - o1) * r;
    var x = Math.sin(da / 2) * Math.sin(da / 2) + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dob / 2) * Math.sin(dob / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function initMap(hasPin, lat, lng) {
    var box = $("[data-map]");
    if (!box) return;
    var ph = $("[data-map-placeholder]", box), explore = $("[data-map-explore]", box), pin = $("[data-map-pin]", box);
    if (!hasPin) { ph.innerHTML = "<p>Add the shop's latitude and longitude to content.js to show the map.</p>"; pin.hidden = true; return; }
    var dx = 0.0042, dy = 0.0028;
    var bbox = [lng - dx, lat - dy, lng + dx, lat + dy].map(function (n) { return n.toFixed(5); }).join(",");
    var base = "https://www.openstreetmap.org/export/embed.html?bbox=" + bbox + "&layer=mapnik";
    var iframe;
    function load() {
      if (iframe) return;
      if (navigator.onLine === false) {
        ph.innerHTML = "<p>The map needs an internet connection. The address and the steps below will get you here.</p>";
        return;
      }
      iframe = document.createElement("iframe");
      iframe.title = "Map: Tess Coffee is at the centre";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.src = base;
      iframe.addEventListener("load", function () { box.classList.add("is-loaded"); explore.hidden = false; });
      box.insertBefore(iframe, box.firstChild);
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { load(); io.disconnect(); }
      }, { rootMargin: "400px 0px" });
      io.observe(box);
    } else load();

    explore.addEventListener("click", function () {
      var live = !box.classList.contains("is-live");
      box.classList.toggle("is-live", live);
      iframe.src = live ? base + "&marker=" + lat.toFixed(5) + "," + lng.toFixed(5) : base;
      explore.innerHTML = live ? icon("i-pin") + " Back to the pin" : icon("i-expand") + " Explore the map";
      if (live) iframe.focus();
    });
  }

  /* ---------- coffee tour ---------- */
  var TOUR = T.tours || {};
  var ACT_ICONS = { milk: "i-milk", run: "i-run", horse: "i-horse", bike: "i-bike" };

  function activityHTML(a, i, n) {
    return '<div class="trip__media"><span class="medal" aria-hidden="true">' + icon(ACT_ICONS[a.icon] || "i-cup") + "</span>" +
      '<span class="trip__step">' + (i + 1) + " of " + n + "</span></div>" +
      '<div class="trip__body">' +
      '<p class="trip__where">' + esc(TOUR.name || "Coffee tour") + (TOUR.duration ? " · " + esc(TOUR.duration) : "") + "</p>" +
      '<h4 class="trip__title">' + esc(a.title) + "</h4>" +
      (a.text ? '<p class="trip__text">' + esc(a.text) + "</p>" : "") +
      '<a class="btn btn--gold" href="#trip-request" data-trip-book>' + icon("i-message") + "Request this tour</a>" +
      "</div>";
  }

  function initTours() {
    var sec = $("[data-tours]");
    if (!sec) return;
    if (TOUR.show === false || !TOUR.name) {
      sec.hidden = true;
      $$('[data-nav="tours"]').forEach(function (a) { a.hidden = true; });
      return;
    }
    var badge = $("[data-tours-badge]");
    if (badge && TOUR.badge) { badge.textContent = TOUR.badge; badge.hidden = false; }
    var title = $("[data-tours-title]");
    if (title && TOUR.title) title.innerHTML = esc(TOUR.title).replace(/(\S+?)([.!?]?)$/, "<em>$1</em>$2");
    var intro = $("[data-tours-intro]");
    if (intro) intro.textContent = TOUR.intro || "";

    var acts = (TOUR.activities || []).filter(function (a) { return a && a.title; });
    $("[data-tour-name]").textContent = TOUR.name;
    $("[data-tour-price]").textContent = TOUR.price || "Price on request";
    $("[data-tour-price-note]").textContent = [TOUR.priceNote, TOUR.duration].filter(Boolean).join(" · ");
    $("[data-tour-included]").innerHTML = acts.map(function (a) { return a.title; }).concat(TOUR.included || []).map(function (x) {
      return "<li>" + icon("i-check") + esc(x) + "</li>";
    }).join("");

    var trail = $("[data-trail]"), panel = $("[data-trip]"), form = $("[data-trip-form]");
    var date = $("[data-trip-date]"), people = $("[data-trip-people]");
    var current = 0;

    function select(i, focus) {
      current = (i + acts.length) % acts.length;
      $$(".trail__stop", trail).forEach(function (b, j) {
        var on = j === current;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      trail.style.setProperty("--at", acts.length > 1 ? current / (acts.length - 1) : 0);
      panel.setAttribute("aria-labelledby", "act-tab-" + current);
      panel.innerHTML = activityHTML(acts[current], current, acts.length);
      panel.classList.remove("is-swapping"); void panel.offsetWidth; panel.classList.add("is-swapping");
    }

    if (acts.length) {
      trail.style.setProperty("--n", acts.length);
      trail.insertAdjacentHTML("beforeend", acts.map(function (a, i) {
        return '<button class="trail__stop" type="button" role="tab" id="act-tab-' + i + '" aria-controls="trip-panel" aria-selected="false" tabindex="-1" data-act="' + i + '">' +
          '<span class="trail__icon">' + icon(ACT_ICONS[a.icon] || "i-cup") + "</span>" +
          '<span class="trail__label">' + String(i + 1).padStart(2, "0") + "</span>" +
          '<span class="trail__title">' + esc(a.title) + "</span></button>";
      }).join(""));
      trail.addEventListener("click", function (e) {
        var b = e.target.closest("[data-act]");
        if (b) select(+b.getAttribute("data-act"));
      });
      trail.addEventListener("keydown", function (e) {
        var i = e.key === "ArrowRight" ? current + 1 : e.key === "ArrowLeft" ? current - 1 : e.key === "Home" ? 0 : e.key === "End" ? acts.length - 1 : null;
        if (i == null) return;
        e.preventDefault();
        select(i, true);
      });
      panel.addEventListener("click", function (e) {
        if (!e.target.closest("[data-trip-book]")) return;
        e.preventDefault();
        form.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
        setTimeout(function () { date.focus({ preventScroll: true }); }, reduced() ? 0 : 600);
      });
      select(0);
    } else {
      $$(".trips__sub, [data-trail], [data-trip]", sec).forEach(function (n) { n.hidden = true; });
    }
    date.min = shopNow().date;

    var phone = String(TOUR.phone || SHOP.phoneIntl || SHOP.phone || "").replace(/[^\d+]/g, "");
    var wa = String(TOUR.whatsapp || "").replace(/\D/g, "");
    $('[data-send="whatsapp"]', form).hidden = !wa;
    $('[data-send="sms"]', form).hidden = !phone;
    var call = $("[data-trip-call]", form);
    if (phone) { call.href = "tel:" + phone; $("span", call).textContent = "Call " + (SHOP.phone || phone); }
    else call.hidden = true;

    var via = "sms";
    form.addEventListener("click", function (e) { var b = e.target.closest("[data-send]"); if (b) via = b.getAttribute("data-send"); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (e.submitter && e.submitter.hasAttribute("data-send")) via = e.submitter.getAttribute("data-send");
      var f = form.elements, n = Math.max(1, Math.floor(+people.value || 1));
      var d = new Date(f.date.value + "T12:00:00Z");
      var when = isNaN(d) ? f.date.value : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()] + " " + prettyDate(f.date.value) + " " + d.getUTCFullYear();
      var msg = "Hello Tess Coffee! I would like to request the " + TOUR.name + " on " + when + " for " + n + (n === 1 ? " person" : " people") +
        ". My name is " + f.name.value.trim() + "." + (f.note.value.trim() ? " " + f.note.value.trim() : "");
      if (via === "copy") {
        copyText(msg).then(function () { toast("Request copied. Paste it into a message to " + (SHOP.phone || phone) + "."); }, function () { toast(msg); });
      } else if (via === "whatsapp") {
        window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
      } else {
        toast("Opening your messages app…");
        window.location.href = "sms:" + phone + "?&body=" + encodeURIComponent(msg);
      }
    });
  }

  /* ---------- header, dock, scroll spy, reveals ---------- */
  function initChrome() {
    var header = $("[data-header]"), root = document.documentElement;
    var onScroll = function () {
      var y = window.scrollY || window.pageYOffset;
      header.classList.toggle("is-scrolled", y > 8);
      root.classList.toggle("dock-on", y > window.innerHeight * 0.55);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var heroLogo = $(".hero__logo");
    if (heroLogo && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        header.classList.toggle("show-brand", !es[0].isIntersecting);
      }, { rootMargin: "-" + 60 + "px 0px 0px 0px" }).observe(heroLogo);
    } else header.classList.add("show-brand");

    var links = $$("[data-nav]");
    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = e.target.id;
          links.forEach(function (a) {
            if (a.getAttribute("data-nav") === id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      ["top", "today", "menu", "inside", "tours", "visit"].forEach(function (id) { var s = document.getElementById(id); if (s && !s.hidden) spy.observe(s); });
    }

    // the LED strips switch on as their section arrives
    var leds = $$(".led").map(function (l) { return l.parentNode; });
    var reveal = $$(".today__head, .today__summary, .menu__head, .inside__intro, .tour, .strip__head, .trips__head, .ticket, .visit__head, .map-card, .visit__info, .route");
    reveal.forEach(function (n, i) { n.setAttribute("data-reveal", ""); n.style.setProperty("--rd", (i % 2) * 90 + "ms"); });
    if (!("IntersectionObserver" in window) || reduced()) {
      leds.forEach(function (s) { s.classList.add("is-lit"); });
      reveal.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.hasAttribute("data-reveal") ? "is-visible" : "is-lit");
        io.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    leds.concat(reveal).forEach(function (n) { io.observe(n); });
  }

  function initShare() {
    var b = $("[data-share]");
    if (!b) return;
    b.addEventListener("click", function () {
      var data = { title: SHOP.name || "Tess Coffee", text: "Coffee from where coffee began. Menu, what's in stock today, and how to find us.", url: location.href.split("#")[0] };
      if (navigator.share) { navigator.share(data).catch(function () { /* closed */ }); return; }
      copyText(data.url).then(function () { toast("Link copied. Send it to someone who needs a coffee."); }, function () { toast(data.url); });
    });
  }

  function initFooter() {
    var foot = $("[data-footer]");
    if (!foot) return;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { foot.classList.toggle("is-inview", es[0].isIntersecting); }).observe(foot);
    } else foot.classList.add("is-inview");

    var ring = $("[data-to-top]", foot), queued = false;
    function progress() {
      queued = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      ring.style.setProperty("--p", max > 0 ? Math.min(1, window.scrollY / max).toFixed(3) : "0");
    }
    if (ring) {
      window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(progress); } }, { passive: true });
      progress();
    }

    // tilt, sheen and parallax only for a real mouse, and never with reduced motion
    if (reduced() || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    $$("[data-glass]", foot).forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        card.style.setProperty("--rx", ((0.5 - y) * 6).toFixed(2) + "deg");
        card.style.setProperty("--ry", ((x - 0.5) * 8).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", function () {
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
    foot.addEventListener("pointermove", function (e) {
      var r = foot.getBoundingClientRect();
      foot.style.setProperty("--ax", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      foot.style.setProperty("--ay", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  }

  function initEthClock() {
    var t = $("[data-eth-clock]");
    if (t) t.addEventListener("change", function () { ethOn = t.checked; renderHours(); });
  }

  // Structured data for search engines, only once the real details are in.
  function initSchema() {
    if (T.settings && T.settings.showPlaceholderBanner) return;
    var map = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
    var spec = [];
    Object.keys(HOURS.week || {}).forEach(function (k) {
      (HOURS.week[k] || []).forEach(function (s) { spec.push({ "@type": "OpeningHoursSpecification", dayOfWeek: map[k], opens: s[0], closes: s[1] }); });
    });
    var data = {
      "@context": "https://schema.org", "@type": "CafeOrCoffeeShop", name: SHOP.name || "Tess Coffee",
      address: { "@type": "PostalAddress", streetAddress: (LOC.address || [])[0], addressLocality: (LOC.address || [])[1] },
      geo: { "@type": "GeoCoordinates", latitude: LOC.lat, longitude: LOC.lng },
      telephone: SHOP.phone || undefined, servesCuisine: "Coffee", openingHoursSpecification: spec, hasMenu: location.href.split("#")[0] + "#menu"
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  /* ---------- go ---------- */
  safe(renderBasics, "basics");
  safe(renderHours, "hours");
  safe(initEthClock, "ethiopian clock");
  safe(initMenu, "menu");
  safe(initCup, "cup");
  safe(initBoard, "board");
  safe(renderClock, "clock");
  safe(initTour, "tour");
  safe(initStrip, "photos");
  safe(initVisit, "visit");
  safe(initTours, "tours");
  safe(initChrome, "header");
  safe(initShare, "share");
  safe(initFooter, "footer");
  safe(initSchema, "schema");

  // keep the clock, open status, countdowns and stock labels current
  setInterval(function () {
    safe(renderClock, "clock");
    safe(renderHours, "hours");
    safe(function () { renderBoard(false); }, "board");
    safe(function () { renderMenu(false); }, "menu");
    safe(renderCupReadout, "cup readout");
  }, 20000);
})();
