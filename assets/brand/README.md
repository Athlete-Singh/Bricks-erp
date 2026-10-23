# Brand assets — single source of truth

Everything the web app and the phone app show as "the logo" comes from this folder.

| File            | What it is                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------- |
| `logo-icon.png` | The icon (green rounded square, kiln, chimney, bricks, tree). **No text.**                    |
| `brand.json`    | The name and wordmark text, and the brand colours.                                            |
| `generated/`    | Favicon, app icons and small web versions, all made from `logo-icon.png`. Never edit by hand. |

## Change the name or the "BRICK KILN / ESTD 1999" text

The wordmark is always **live text**, never part of an image. Edit `brand.json`:

```json
{
  "productName": "BRICS", // short name: sidebar, phone header, page titles
  "wordmarkLine1": "BRICK KILN", // big line next to / under the icon
  "wordmarkLine2": { "show": true, "text": "ESTD", "year": "1999", "showBrickIcon": true },
  "leafLetter": "auto", // "auto" = leaf over the last "I" in line 1; "none" = no leaf
  "colors": { "primary": "#2D6A43", "dark": "#0B4A2A", "light": "#9BE59B" },
  "tagline": ""
}
```

Set `wordmarkLine2.show` to `false` to hide the ESTD line everywhere.

Then run `pnpm brand:sync` from the repo root (web dev and build also run it automatically).

## Replace the icon

1. Save the new icon over `logo-icon.png` (square-ish PNG, transparent background, no text).
2. `python3 scripts/brand/generate-icons.py` (needs Pillow: `pip install pillow`).
3. `pnpm brand:sync`
4. Phone app icons and splash: `cd mobile && dart run flutter_launcher_icons && dart run flutter_native_splash:create`

## Where the copies go

`scripts/sync-brand.mjs` copies to `web/public/brand/`, `web/src/app/` (favicon, icon, apple-icon),
`web/src/lib/brand.json` and `mobile/assets/brand/`. Those copies are committed so a deploy without
this folder still builds.
