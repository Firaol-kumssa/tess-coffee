/* =====================================================================
   TESS COFFEE · SITE CONTENT
   ---------------------------------------------------------------------
   This is the ONLY file you need to edit to change what the site says:
   menu, prices, cup sizes, stock, address, map pin, hours and contacts.
   Save the file, refresh the page. No build step, no tools.

   >> Everything marked  PLACEHOLDER  is invented. Replace it with your
      real details, then set  showPlaceholderBanner  to false.

   Editing tips
   - Keep the commas and quotes exactly as you see them.
   - Times use the 24-hour clock: "07:00", "13:30", "21:00".
   - Prices are plain numbers (no currency sign): 150, not "150 Br".
   - If the page goes blank after an edit, there is a typo here
     (usually a missing comma or quote). Undo your last change.

   Sections in this file
     1. settings ..... currency, placeholder banner
     2. shop ......... phone and social links
     3. location ..... address, map pin, directions
     4. hours ........ opening times, holidays
     5. sizes ........ cup sizes (S / M / L)
     6. today ........ what is sold out / running low   <- update daily
     7. menu ......... every section, item and price
     8. board ........ which sections show on "On the bar today"
   ===================================================================== */

window.TESS = {

  /* 1. SETTINGS ------------------------------------------------------ */
  settings: {
    // Shows a slim "these are placeholders" notice at the top of the page.
    // Set to false once the real menu, prices, stock and address are in.
    showPlaceholderBanner: true,

    // Change the currency here. The whole site follows.
    currency: {
      symbol: "Br",        // e.g. "Br", "ETB", "$", "€", "£"
      name: "Ethiopian birr", // shown above the menu
      position: "after",   // "after" -> 150 Br    "before" -> $4
      space: true,         // a space between the number and the symbol
      decimals: 0          // 0 -> 150    2 -> 4.50
    }
  },

  /* 2. SHOP --------------------------------------------------------- */
  shop: {
    name: "Tess Coffee",
    phone: "+251 911 234 567",      // PLACEHOLDER
    telegram: "tesscoffee",         // PLACEHOLDER  (your t.me/ username, or "" to hide)
    instagram: "tesscoffee",        // PLACEHOLDER  (your instagram username, or "" to hide)
    tiktok: ""                      // optional, "" hides it
  },

  /* 3. LOCATION ----------------------------------------------------- */
  location: {
    // PLACEHOLDER: the map pin. To get yours: open Google Maps, long-press
    // your front door, and copy the two numbers it shows (latitude, longitude).
    lat: 8.99690,
    lng: 38.78670,

    area: "Bole, Addis Ababa",                       // PLACEHOLDER  (short, used at the top of the page)
    address: ["Off Cameroon Street, Bole", "Addis Ababa, Ethiopia"], // PLACEHOLDER
    landmark: "Right across the street from Feven Restaurant's blue neon sign.", // PLACEHOLDER (we spotted the sign in your photos; please check)

    // PLACEHOLDER: 3 to 5 short steps. The last one is shown next to the photo of your door.
    directions: [
      { title: "Get to Bole Medhanialem", text: "Every ride driver knows the big church on Bole Road. Start there." },
      { title: "Walk down Cameroon Street", text: "Head away from Bole Road for about four minutes, past the pharmacy on the corner." },
      { title: "Find the blue neon", text: "Feven Restaurant's blue sign glows across the street from us, day and night." },
      { title: "Look for the cup on the glass", text: "A big coffee cup is painted on our glass door. Push it open and follow the smell." }
    ],
    parking: "Street parking out front. Easiest before 09:00." // PLACEHOLDER
  },

  /* 4. HOURS -------------------------------------------------------- */
  hours: {
    timeZone: "Africa/Addis_Ababa", // the shop's time zone, so "Open now" is right for every visitor

    // PLACEHOLDER: opening hours. [] means closed all day.
    // Split day example: [["07:00", "12:00"], ["14:00", "20:00"]]
    week: {
      mon: [["07:00", "20:00"]],
      tue: [["07:00", "20:00"]],
      wed: [["07:00", "20:00"]],
      thu: [["07:00", "20:00"]],
      fri: [["07:00", "21:00"]],
      sat: [["08:00", "21:00"]],
      sun: [["08:00", "18:00"]]
    },

    // PLACEHOLDER: holidays and one-off changes. These override the week above.
    special: [
      { date: "2027-01-07", label: "Genna (Ethiopian Christmas)", hours: [["10:00", "16:00"]] },
      { date: "2027-01-19", label: "Timket", hours: [] }
    ]
  },

  /* 5. CUP SIZES ---------------------------------------------------- */
  // Items priced by size (see "sizes:" in the menu) use these three.
  sizes: {
    S: { name: "Small",  ml: 240 },
    M: { name: "Medium", ml: 350 },
    L: { name: "Large",  ml: 470 }
  },

  /* 6. TODAY: STOCK  (update this every day) ------------------------ */
  // Anything NOT listed here shows as available.
  // Use the item ids from the menu below (the  id: "..."  next to each item).
  //
  //   status: "out"   sold out          status: "low"   running low
  //   left: 3         how many are left (optional)
  //   next: "15:30"   next fresh batch, shows a live countdown (optional)
  //   note: "..."     a short note for customers (optional)
  today: {
    updated: "07:45",          // PLACEHOLDER  when you last updated this list (24h). A full date also works: "2026-10-01 07:45"
    updatedBy: "the morning shift", // PLACEHOLDER  optional, "" hides it

    items: {                   // PLACEHOLDER  example stock
      "oat-milk":         { status: "out", note: "Delivery due tomorrow morning" },
      "harrar":           { status: "out", note: "Next lot arrives Friday" },
      "banana-bread":     { status: "out", next: "15:30" },
      "pain-au-chocolat": { status: "out", note: "Back tomorrow from 07:00" },
      "croissant":        { status: "low", left: 3 },
      "carrot-cake":      { status: "low", left: 2 },
      "guji":             { status: "low", note: "Last few cups of this lot" },
      "beans-guji":       { status: "low", left: 2, note: "Bags left on the shelf" },
      "cookie":           { next: "12:30", note: "A fresh tray comes out mid-day" }
    }
  },

  /* 7. MENU --------------------------------------------------------- */
  // Each section has items. Each item needs a unique id and ONE way of pricing:
  //   price: 120                                   one price
  //   sizes: { S: 110, M: 140, L: 170 }            cup sizes (leave out sizes you do not sell)
  //   options: [["Single", 70], ["Double", 100]]   anything else (weights, portions...)
  //
  // Optional extras on an item:
  //   tags: ["signature"]   shows a small label. Known tags: signature, local-favourite, new, vegan, vegetarian, ceremony
  //   cup: "latte"          puts the drink in the 3D cup at the top of the page.
  //                         Looks: espresso, macchiato, cappuccino, latte, americano, mocha, spiced, tea, chocolate
  //   roasted: "2026-09-26" roast date for beans (shows how fresh they are)
  //
  // A section can have  served: ["07:00", "11:30"]  if it is only available part of the day.
  menu: [
    {
      id: "espresso",
      title: "Espresso bar",
      note: "Pulled on the La Cimbali from our house blend of Sidama and Guji.", // PLACEHOLDER blend
      items: [ // PLACEHOLDER items and prices
        { id: "espresso",     name: "Espresso",       desc: "Short and syrupy, with a bright berry finish.", options: [["Single", 70], ["Double", 100]] },
        { id: "macchiato",    name: "Macchiato",      desc: "The Addis classic: espresso under a cap of silky foam.", sizes: { S: 80, M: 100 }, tags: ["local-favourite"], cup: "macchiato" },
        { id: "cortado",      name: "Cortado",        desc: "Equal parts espresso and warm milk.", price: 110 },
        { id: "cappuccino",   name: "Cappuccino",     desc: "Deep foam, a dusting of cocoa if you like.", sizes: { S: 120, M: 150, L: 180 }, cup: "cappuccino" },
        { id: "latte",        name: "Caffè latte",    desc: "Long, gentle and milky.", sizes: { S: 130, M: 160, L: 190 }, cup: "latte" },
        { id: "flat-white",   name: "Flat white",     desc: "Double ristretto with thin, velvet milk.", sizes: { S: 140 }, cup: "cappuccino" },
        { id: "americano",    name: "Americano",      desc: "Espresso stretched with hot water.", sizes: { S: 90, M: 110, L: 130 }, cup: "americano" },
        { id: "mocha",        name: "Mocha",          desc: "Espresso, dark chocolate, steamed milk.", sizes: { M: 180, L: 210 }, cup: "mocha" },
        { id: "spiced-latte", name: "Tess spiced latte", desc: "Cardamom, cinnamon and a spoon of honey.", sizes: { M: 170, L: 200 }, tags: ["signature"], cup: "spiced" },
        { id: "iced-latte",   name: "Iced latte",     desc: "Double shot over ice and cold milk.", sizes: { M: 170, L: 200 } }
      ]
    },
    {
      id: "slow",
      title: "Slow bar",
      note: "Single origins brewed by hand, in the V60 or the glass siphon. Ask what's on today.",
      items: [ // PLACEHOLDER origins and prices
        { id: "yirgacheffe", name: "Yirgacheffe · Kochere", desc: "Washed. Jasmine, bergamot, lemon tea.", options: [["V60", 170], ["Siphon", 220]] },
        { id: "guji",        name: "Guji · Hambela",        desc: "Natural. Blueberry, cacao nib, a little wine.", options: [["V60", 180], ["Siphon", 230]] },
        { id: "sidama",      name: "Sidama · Bensa",        desc: "Honey process. Stone fruit and brown sugar.", options: [["V60", 175], ["Siphon", 225]] },
        { id: "harrar",      name: "Harrar · Longberry",    desc: "Natural. Mocha, dried apricot, warm spice.", options: [["V60", 170], ["Siphon", 220]] },
        { id: "cold-brew",   name: "Cold brew",             desc: "Steeped for 18 hours, served over ice.", sizes: { M: 150, L: 180 } }
      ]
    },
    {
      id: "classics",
      title: "Ethiopian classics",
      note: "Coffee the way it's poured at home.",
      items: [ // PLACEHOLDER
        { id: "jebena-buna", name: "Jebena buna", desc: "Roasted, ground and boiled in a clay jebena, poured into small sini cups. Tena adam on request.", options: [["One sini", 60], ["Jebena for the table (4–6)", 300]], tags: ["ceremony"] },
        { id: "kolo",        name: "Kolo & fendisha", desc: "Roasted barley and popcorn, the ceremony's crunchy sidekicks.", price: 60, tags: ["vegan"] },
        { id: "shai",        name: "Shai",            desc: "Black tea with cinnamon, clove and cardamom.", sizes: { S: 50, M: 70 }, cup: "tea", tags: ["vegan"] }
      ]
    },
    {
      id: "not-coffee",
      title: "Not coffee",
      items: [ // PLACEHOLDER
        { id: "hot-chocolate", name: "Hot chocolate", desc: "Dark chocolate melted into steamed milk.", sizes: { M: 150, L: 180 }, cup: "chocolate" },
        { id: "spris",         name: "Spris",         desc: "Layered avocado, mango and papaya juice. Eat it with a spoon.", sizes: { M: 140, L: 170 }, tags: ["local-favourite", "vegan"] },
        { id: "avocado-juice", name: "Avocado juice", desc: "Thick, cold, with a squeeze of lime.", price: 130, tags: ["vegan"] },
        { id: "lemonade",      name: "Ginger & mint lemonade", desc: "Fresh lemon, ginger and mint over ice.", price: 120, tags: ["vegan"] },
        { id: "ambo",          name: "Ambo mineral water", desc: "Ethiopia's own sparkling water.", price: 40 }
      ]
    },
    {
      id: "breakfast",
      title: "Breakfast",
      served: ["07:00", "11:30"], // PLACEHOLDER
      note: "Served until 11:30, every day.",
      items: [ // PLACEHOLDER
        { id: "chechebsa",      name: "Chechebsa",       desc: "Torn flatbread fried in spiced butter, with honey and yogurt.", price: 190, tags: ["local-favourite"] },
        { id: "fetira",         name: "Fetira",          desc: "Flaky layered bread with egg and honey.", price: 210 },
        { id: "ful",            name: "Ful",             desc: "Slow-cooked fava beans, tomato, onion, egg and warm bread.", price: 170, tags: ["vegetarian"] },
        { id: "enkulal-firfir", name: "Enkulal firfir",  desc: "Scrambled eggs with tomato, onion and green chilli.", price: 160, tags: ["vegetarian"] },
        { id: "avocado-toast",  name: "Avocado toast",   desc: "Sourdough, smashed avocado, chilli and lime.", price: 220, tags: ["vegan"] },
        { id: "granola",        name: "Granola bowl",    desc: "House granola, thick yogurt, honey and seasonal fruit.", price: 180, tags: ["vegetarian"] }
      ]
    },
    {
      id: "bakery",
      title: "Bakery & sweets",
      note: "Baked in small batches. They go fast.",
      items: [ // PLACEHOLDER
        { id: "pound-cake",       name: "Pound cake",       desc: "The one under the glass dome on the counter. Butter and vanilla.", price: 90, tags: ["vegetarian"] },
        { id: "banana-bread",     name: "Banana bread",     desc: "Dark, sticky, toasted to order.", price: 100, tags: ["vegetarian"] },
        { id: "croissant",        name: "Butter croissant", desc: "Baked every morning.", price: 110, tags: ["vegetarian"] },
        { id: "pain-au-chocolat", name: "Pain au chocolat", desc: "Two bars of dark chocolate inside.", price: 130, tags: ["vegetarian"] },
        { id: "carrot-cake",      name: "Carrot cake",      desc: "Spiced sponge, cream-cheese frosting.", price: 140, tags: ["vegetarian"] },
        { id: "cookie",           name: "Brown-butter cookie", desc: "Crisp edges, soft middle, flaky salt.", price: 60, tags: ["vegetarian"] }
      ]
    },
    {
      id: "extras",
      title: "Milk & extras",
      items: [ // PLACEHOLDER
        { id: "oat-milk",    name: "Oat milk",    desc: "For any milk drink.", price: 40, tags: ["vegan"] },
        { id: "extra-shot",  name: "Extra shot",  desc: "Make it stronger.", price: 40 },
        { id: "syrup",       name: "Syrup",       desc: "Vanilla or caramel.", price: 30 }
      ]
    },
    {
      id: "beans",
      title: "Beans to take home",
      note: "Whole bean, or ground for your brewer while you wait.",
      items: [ // PLACEHOLDER
        { id: "beans-house",       name: "House espresso blend", desc: "Sidama and Guji. Chocolate, cherry, honey.", options: [["250 g", 550], ["500 g", 1000], ["1 kg", 1900]], roasted: "2026-09-28" },
        { id: "beans-yirgacheffe", name: "Yirgacheffe beans",    desc: "Kochere, washed, light roast. Floral and bright.", options: [["250 g", 700], ["500 g", 1300]], roasted: "2026-09-25" },
        { id: "beans-guji",        name: "Guji beans",           desc: "Hambela, natural, light roast. Blueberry jam.", options: [["250 g", 750], ["500 g", 1400]], roasted: "2026-09-23" },
        { id: "beans-jebena",      name: "Jebena roast",         desc: "Darker roast, ground fine for the jebena.", options: [["250 g", 450], ["500 g", 850]], roasted: "2026-09-29" }
      ]
    }
  ],

  /* 8. BOARD -------------------------------------------------------- */
  // Menu sections that change during the day, shown as lit shelves in
  // "On the bar today". Use the section ids from the menu above.
  board: {
    shelves: ["slow", "bakery", "breakfast", "beans", "extras"]
  }
};
