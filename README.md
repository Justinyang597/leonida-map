# Leonida: interactive GTA VI map

An unofficial, fan-made interactive map of GTA VI's Leonida. It has 4,300+ landmarks placed on the real game map, in-game vs real-life photo comparisons, personal pins, and community pins.

Not affiliated with Rockstar Games.

## Credits

Map tiles, landmark photos and landmark data come from **[gtadb.org](https://map.gtadb.org) and its contributors**, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This site regroups the landmarks into its own categories. Per gtadb's request, the site never requests anything from gtadb.org live. Data is pulled from their [GitHub repo](https://github.com/rolux/gtadb.org) at build time.

Map rendering uses [Leaflet](https://leafletjs.com). The icons are original.

## Run locally

```sh
# one-time: fetch tiles, photos and data (~620 MB)
git clone --depth 1 --filter=blob:none --sparse https://github.com/rolux/gtadb.org.git vendor/gtadb
git -C vendor/gtadb sparse-checkout set maps/tiles/6/day map/data/6 map/photos/6

python -m http.server 8765
```

Then open http://localhost:8765.

## Deploy (GitHub Pages, nothing to keep running)

1. Push this repo to GitHub.
2. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow runs on every push and once a week. It fetches gtadb's data and publishes the site.

## Community pins (Supabase, free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste in [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. Open **Project Settings → API**, copy the **Project URL** and the **anon public** key into [`config.js`](config.js), then push.

How it works:

- **Read access:** visitors can only read pins that haven't been hidden.
- **Write access:** visitors can only add pins, vote and report through three database functions. They can't write to the tables directly.
- **Rate limit:** each visitor can add 10 pins per hour, counted by hashed IP.
- **Auto-hide:** a pin is hidden once its score drops to -5 or it gets 3 reports.
- **Moderation:** to remove a pin yourself, open **Table Editor → community_pins** in Supabase and delete the row.

The anon key is meant to be public. The database rules in `schema.sql` are what protect the data.
