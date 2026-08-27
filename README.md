# MemeStudio Error Pages

Custom 400, 401, 403, 404, 500, 502 and 503 pages are included.

### VS Code Live Server
Live Server normally displays `Cannot GET ...` for an unknown URL. This package includes a service worker that replaces 404 navigation responses with the custom 404 page after you open the website once.

For the most reliable local test, open a terminal in this `sitebtn` folder and run `python server.py`, then visit `http://127.0.0.1:5500/` and a random URL.

GitHub Pages automatically uses `404.html`. Apache and Netlify configuration files are also included.

## SEO deployment note

The site is configured for its public domain `https://www.freememeai.com/`. `robots.txt`, `sitemap.xml`, canonical URLs, Open Graph URLs, and the homepage WebSite structured-data URL use the final public domain.

The site includes canonical tags, robots directives, Open Graph metadata, Twitter cards, JSON-LD WebApplication/WebSite structured data, and a sitemap/robots file. Error pages are marked `noindex,nofollow,noarchive`.

Favicon: Option 3 classic meme face. Favicon filenames are versioned to prevent browser/service-worker cache from serving an older icon.


## Template API / SEO fix
The live template pages now call the same-origin `/api/templates` endpoint. Netlify proxies that endpoint to Imgflip, so browser JavaScript no longer directly calls `api.imgflip.com`. The Templates page also contains crawlable static template-format content and supports `?q=` links for internal template searches.
