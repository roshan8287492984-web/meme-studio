# GIF Template Library Setup

This update adds a complete GIF-template workflow:

- `gif_templates` Supabase table
- public read-only RLS policy for the browser
- `gif-templates.html` searchable GIF library
- `Choose a GIF template` panel inside `gif-editor.html`
- `Explore all GIF templates` button
- selecting a template opens/loads it in the GIF editor
- `sitemap.xml` entries for the GIF editor and GIF template library

## 1. Create the database table

Open **Supabase → SQL Editor → New query**, paste the contents of `gif_templates_schema.sql`, and run it.

The site only needs public `SELECT` access. Do not expose a Supabase secret key in the frontend.

## 2. Store the GIF files

For reliable browser loading and GIF export, use a Supabase Storage bucket named `gif-templates` and make the required template objects publicly readable. Upload your `.gif` files there.

Use each file's public URL as `image_url` and, optionally, a small preview URL as `thumbnail_url`.

Example values:

- `image_url`: `https://YOUR_PROJECT.supabase.co/storage/v1/object/public/gif-templates/drake-reaction.gif`
- `thumbnail_url`: same URL, or a smaller preview image

The GIF editor fetches the GIF and decodes all frames locally in the browser.

## 3. Import template rows

`gif_templates_import.csv` contains a starter list of popular GIF-template names/categories. The URL columns are intentionally blank so you can use your own uploaded GIF files instead of hotlinking third-party assets.

In Supabase Table Editor:

1. Open `gif_templates`.
2. Choose **Insert → Import data from CSV**.
3. Select `gif_templates_import.csv`.
4. Map the columns.
5. Import.
6. Fill `image_url` (and optional `thumbnail_url`) with your Supabase Storage public URLs.

## 4. Test

Open `gif-editor.html` with Live Server. The left side should show **Choose a GIF template**.

Click **Explore all GIF templates** to open `gif-templates.html`.

Click **Use GIF Template**. The GIF should load into the editor and begin animating.

## Important

The frontend uses the existing Supabase publishable key. Never put the Supabase secret key in HTML or JavaScript.
