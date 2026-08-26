# MemeStudio Error Pages

Custom 400, 401, 403, 404, 500, 502 and 503 pages are included.

### VS Code Live Server
Live Server normally displays `Cannot GET ...` for an unknown URL. This package includes a service worker that replaces 404 navigation responses with the custom 404 page after you open the website once.

For the most reliable local test, open a terminal in this `sitebtn` folder and run `python server.py`, then visit `http://127.0.0.1:5500/` and a random URL.

GitHub Pages automatically uses `404.html`. Apache and Netlify configuration files are also included.

## SEO deployment note

Before publishing, replace every occurrence of `YOUR-DOMAIN.com` in `robots.txt` and `sitemap.xml` with the site's real public domain. The HTML pages use deployment-safe relative canonical URLs; after the final domain is known, absolute `og:url` and `og:image` tags can also be added if desired.

The site includes canonical tags, robots directives, Open Graph metadata, Twitter cards, JSON-LD WebApplication/WebSite structured data, and a sitemap/robots file. Error pages are marked `noindex,nofollow,noarchive`.

Favicon: Option 3 classic meme face. Favicon filenames are versioned to prevent browser/service-worker cache from serving an older icon.
