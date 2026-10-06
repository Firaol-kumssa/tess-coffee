TESS COFFEE WEBSITE
===================

OPEN IT
- Double-click index.html. It works straight from the folder, no install,
  no build step. (The map needs an internet connection; everything else
  works offline.)

PUT IT ONLINE
- Upload THIS folder (tess-coffee-site) to any static host, e.g. Netlify
  (drag and drop), Cloudflare Pages, GitHub Pages or Vercel. Vercel's free
  plan is for non-commercial use only, so a business site needs its Pro plan.
- Once you know the web address, open index.html and change the og:image
  line near the top to the full address, e.g.
  https://yourdomain.com/assets/img/og-image.jpg
  so link previews show the picture when people share the site.

EDIT THE CONTENT
Everything a visitor reads is in ONE file: content.js
Open it in any text editor, change the text, save, refresh the page.
The sections are numbered inside the file:

  1. settings ... CURRENCY (symbol, before/after the number, decimals)
                  and the "placeholder" notice (showPlaceholderBanner)
  2. shop ....... phone, Telegram, Instagram
  3. location ... MAP PIN (lat, lng), address, landmark, directions
  4. hours ...... opening hours and holidays
  5. sizes ...... cup sizes (Small / Medium / Large, in ml)
  6. today ...... STOCK: what is sold out or running low. Update daily.
  7. menu ....... the full MENU and PRICES (from your printed menu)
  8. board ...... which menu sections appear on "On the bar today"
  9. tours ...... the FULL-DAY COFFEE TOUR: price, the day's activities,
                  and the phone number requests are sent to. show: false hides it.

Anything marked PLACEHOLDER is invented. Replace it with the real details,
then set showPlaceholderBanner to false.

If the page goes blank after an edit, content.js has a typo (usually a
missing comma or quote). Undo the last change and refresh.

FOLDER
  index.html ........ the page
  content.js ........ all the words, prices, stock, hours, location
  assets/css, js .... design and behaviour (no need to touch)
  assets/img ........ logo (SVG), icons, optimized photos
  assets/fonts ...... Fraunces and Jost (free OFL licence, included)
