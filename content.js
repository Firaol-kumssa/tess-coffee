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
     7. menu ......... every section, item and price (from your printed menu)
     8. board ........ which sections show on "On the bar today"
     9. tours ........ your full-day coffee tour (show: false hides it)
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
    phone: "0915 53 11 11",         // as printed on the menu
    phoneIntl: "+251915531111",      // the same number in international form, used for tap-to-call and SMS
    telegram: "tesscoffee",         // PLACEHOLDER  (your t.me/ username, or "" to hide)
    instagram: "tesscoffee",        // PLACEHOLDER  (your instagram username, or "" to hide)
    tiktok: ""                      // optional, "" hides it
  },

  /* 3. LOCATION ----------------------------------------------------- */
  location: {
    // The map pin (confirmed 2026-11-12). To change it: open Google Maps, long-press
    // your front door, and copy the two numbers it shows (latitude, longitude).
    lat: 8.996205,
    lng: 38.791927,

    area: "Bole, Addis Ababa",                       // PLACEHOLDER  (short, used at the top of the page)
    address: ["Off Cameroon Street, Bole", "Addis Ababa, Ethiopia"], // PLACEHOLDER
    landmark: "Right across the street from Feven Restaurant's blue neon sign.", // PLACEHOLDER (we spotted the sign in your photos; please check)

    // 3 to 5 short steps. The last one is shown next to the photo of your door.
    // photo: "sign" shows one of the photos in assets/img/photos next to a step.
    directions: [
      { title: "Get to Bole Medhanialem", text: "Every ride driver knows the big church on Bole Road. Start there." }, // PLACEHOLDER
      { title: "Walk down Cameroon Street", text: "Head away from Bole Road for about four minutes, past the pharmacy on the corner." }, // PLACEHOLDER
      { title: "Look up for the round sign", text: "A round white sign with ተስ ቡና and the gold Tess leaves hangs over the entrance.", photo: "sign" },
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
      "banana-cake":            { status: "out", next: "15:30", note: "A fresh loaf is in the oven" },
      "chicken-wrap":           { status: "out", note: "Back tomorrow morning" },
      "english-cake":           { status: "low", left: 3 },
      "iced-matcha-strawberry": { status: "low", note: "Last few strawberries today" }
    }
  },

  /* 7. MENU --------------------------------------------------------- */
  // Names and prices are from your printed "Coffee & Breakfast" menu.
  // The short descriptions are suggestions: edit them, or delete  desc: "..."  to show none.
  //
  // Each item needs a unique id and ONE way of pricing:
  //   price: 120                                   one price
  //   sizes: { S: 110, M: 140, L: 170 }            cup sizes (the size picker appears once any drink has them)
  //   options: [["Single", 70], ["Double", 100]]   anything else (weights, portions...)
  //
  // Optional extras on an item:
  //   tags: ["signature"]   shows a small label. Known tags: signature, local-favourite, ethiopian, fasting, new, vegan, vegetarian
  //   cup: "latte"          puts the drink in the 3D cup at the top of the page.
  //                         Looks: espresso, macchiato, cappuccino, latte, americano, mocha, spiced, tea, chocolate
  //
  // A section can have  served: ["07:00", "11:30"]  if it is only available part of the day.

  // The three drinks on the front of the printed menu, shown as cards above the menu.
  featured: ["tess-coffee", "filter-coffee", "iced-matcha"],

  menu: [
    {
      id: "coffee",
      title: "Coffee",
      note: "Ethiopian Arabica, from a quick macchiato to a slow filter.",
      items: [
        { id: "tess-coffee",       name: "Tess Coffee",       desc: "A pure single-origin black coffee, sourced directly from Ethiopia. A true taste of its terroir.", price: 160, tags: ["signature"], cup: "americano" },
        { id: "filter-coffee",     name: "Filter Coffee",     desc: "Our signature blend of medium-roasted Arabica, brewed for a clean, smooth, full-bodied cup.", price: 250, tags: ["signature"] },
        { id: "macchiato",         name: "Macchiato",         desc: "The Addis classic: espresso under a cap of foamed milk.", price: 160, tags: ["local-favourite"], cup: "macchiato" },
        { id: "fasting-macchiato", name: "Fasting Macchiato", desc: "Made without dairy, for fasting days.", price: 200, tags: ["fasting"] },
        { id: "espresso",          name: "Espresso",          desc: "A short, strong shot.", price: 160 },
        { id: "espris",            name: "Espris",            desc: "Coffee and tea in one glass, the Ethiopian way.", price: 160, tags: ["ethiopian"] }, // check this description
        { id: "americano",         name: "Americano",         desc: "Espresso lengthened with hot water.", price: 160, cup: "americano" },
        { id: "cappuccino",        name: "Cappuccino",        desc: "Espresso under deep, velvety milk foam.", price: 250, cup: "cappuccino" },
        { id: "mocha-latte",       name: "Mocha Latte",       desc: "Espresso, chocolate and steamed milk.", price: 250, cup: "mocha" }
      ]
    },
    {
      id: "cold",
      title: "Iced & matcha",
      items: [
        { id: "iced-matcha",            name: "Iced Matcha",            desc: "Premium stone-ground matcha whisked with cold milk, over ice, with honey.", price: 400, tags: ["signature"] },
        { id: "iced-matcha-strawberry", name: "Iced Matcha Strawberry", price: 450 },
        { id: "iced-matcha-chocolate",  name: "Iced Matcha Chocolate",  price: 450 },
        { id: "iced-latte",             name: "Iced Latte",             desc: "Espresso over ice and cold milk.", price: 250 }
      ]
    },
    {
      id: "tea",
      title: "Tea & more",
      items: [
        { id: "special-tea",   name: "Special Tea",   price: 250, cup: "tea" },
        { id: "green-tea",     name: "Green Tea",     price: 100 },
        { id: "mint-tea",      name: "Mint Tea",      price: 100 },
        { id: "lemon-tea",     name: "Lemon Tea",     price: 80 },
        { id: "ginger-tea",    name: "Ginger Tea",    price: 70 },
        { id: "hot-chocolate", name: "Hot Chocolate", desc: "Chocolate and steamed milk.", price: 250, cup: "chocolate" },
        { id: "milk",          name: "Milk",          desc: "A glass of hot milk.", price: 200 },
        { id: "water",         name: "Water",         desc: "Half-litre bottle.", price: 60 }
      ]
    },
    {
      id: "breakfast",
      title: "Breakfast",
      items: [
        { id: "omelette",          name: "Omelette",          price: 400 },
        { id: "special-omelette",  name: "Special Omelette",  price: 450 },
        { id: "scrambled-egg",     name: "Scrambled Egg",     price: 350 },
        { id: "shakshuka",         name: "Shakshuka",         desc: "Eggs cooked in a spiced tomato and pepper sauce.", price: 400 },
        { id: "normal-foul",       name: "Normal Foul",       desc: "Ethiopian-style fava beans, served with bread.", price: 400, tags: ["ethiopian"] },
        { id: "special-foul",      name: "Special Foul",      price: 480, tags: ["ethiopian"] },
        { id: "foul-avocado",      name: "Foul with Avocado", price: 450, tags: ["ethiopian"] },
        { id: "chechebsa",         name: "Chechebsa",         desc: "Torn flatbread tossed in spiced butter, often eaten with honey.", price: 350, tags: ["ethiopian"] },
        { id: "special-chechebsa", name: "Special Chechebsa", price: 480, tags: ["ethiopian"] },
        { id: "kinche",            name: "Kinche",            desc: "Cracked wheat cooked with spiced butter.", price: 300, tags: ["ethiopian"] },
        { id: "pancake",           name: "Pancake",           price: 350 }
      ]
    },
    {
      id: "sandwiches",
      title: "Sandwiches & wraps",
      items: [
        { id: "egg-sandwich",     name: "Egg Sandwich",     price: 300 },
        { id: "tuna-sandwich",    name: "Tuna Sandwich",    price: 450 },
        { id: "chicken-sandwich", name: "Chicken Sandwich", price: 850 },
        { id: "chicken-wrap",     name: "Chicken Wrap",     price: 850 }
      ]
    },
    {
      id: "cakes",
      title: "Cakes",
      note: "By the slice, from under the glass dome on the counter.",
      items: [
        { id: "english-cake", name: "English Cake", price: 200 },
        { id: "banana-cake",  name: "Banana Cake",  price: 200 }
      ]
    }
  ],

  /* 8. BOARD -------------------------------------------------------- */
  // Menu sections that change during the day, shown as lit shelves in
  // "On the bar today". Use the section ids from the menu above.
  board: {
    shelves: ["cakes", "breakfast", "sandwiches", "cold"]
  },

  /* 9. COFFEE TOUR -------------------------------------------------- */
  // Your full-day coffee tour. Set  show: false  to hide the whole section.
  // Requests come to you as a text message, a WhatsApp message or a call. No booking system needed.
  tours: {
    show: true,
    badge: "New",                  // a small label above the title, "" hides it
    title: "Milk, run, ride, cycle.",
    intro: "One full day out with Tess: milking on a farm, marathon training, horse riding and a bike tour, with a coach assigned to you and transport all day.",
    name: "Full-day coffee tour",
    price: "About $3,200",         // shown exactly as written
    priceNote: "",                 // CHECK: add "per person" or "per group" so guests know what the price covers
    duration: "Full day",
    phone: "+251915531111",        // calls and text-message requests go here
    whatsapp: "",                  // optional: your WhatsApp number without + or spaces, e.g. "251915531111"

    // The day, in order. icon: milk, run, horse or bike.
    // The short texts are suggestions: change them to describe your day.
    activities: [
      { icon: "milk",  title: "Milking",           text: "Get hands-on at a farm and try milking by hand." },
      { icon: "run",   title: "Marathon training", text: "Train the way Ethiopia's famous distance runners do, with a coach setting the pace." },
      { icon: "horse", title: "Horse riding",      text: "Head out on horseback and take in the land at an easier pace." },
      { icon: "bike",  title: "Bike tour",         text: "Explore on two wheels on a guided bike tour." }
    ],
    included: ["A coach assigned to you", "Transportation"]
  }
};
