# Miro board widget

> **Unofficial.** A widget I wanted for my own Figma files, built and maintained
> independently. Not affiliated with, authorised by, or endorsed by Miro or Figma.
> "Miro" and the Miro logo are trademarks of their owner and appear here only to
> identify the service a card links to; the mark's path comes from the
> [Simple Icons](https://simpleicons.org) set (CC0).


<img width="915" height="516" alt="Screenshot 2026-09-15 at 09 13 58" src="https://github.com/user-attachments/assets/b4abfde2-d4ba-4d50-97ee-0e7bb43fc3b8" />


A Figma / FigJam widget that pins a Miro board to the canvas: the link, the board
title, an optional note, and a status pill. Shaped like the Jira widget card.

## Run it locally

```bash
npm install
npm run build      # or: npm run watch
```

Then in the Figma desktop app: **Menu → Plugins → Development → Import plugin from
manifest…** and pick `manifest.json`. The widget shows up under
**Resources (Shift+I) → Widgets → Development**.

`npm run watch` only rebuilds `widget-src/code.tsx`. If you edit
`widget-src/ui.html`, run `npm run build` again.

## How it works

| File | Role |
| --- | --- |
| `widget-src/code.tsx` | The card itself, rendered by the widget API |
| `widget-src/ui.html` | Modal iframe: paste link, fetch details, edit title/note |
| `widget-src/miro.ts` | URL parsing and formatting helpers |

The widget sandbox has no `fetch`, so every network call happens in the iframe.
Adding or editing a board opens it as a dialog; **Reload details** opens it
invisibly, fetches, and closes itself.

Board details come from Miro's public oEmbed endpoint:

```
GET https://miro.com/api/v1/oembed?format=json&url=<board url>
```

No OAuth, no API key. It sends `access-control-allow-origin: *`, so the iframe
can call it directly. `miro.com` and `*.miro.com` are declared in the manifest's
`networkAccess`.

## Limits worth knowing

- **Only link-shared boards resolve.** A board set to "anyone with the link" returns
  its title. A private board returns `404 boardNotFound` — the dialog says so and
  you can still save it with a title you type yourself.
- **Details are a snapshot.** Nothing polls; the card shows when it last synced and
  you refresh from the property menu.
- **Thumbnails are best-effort.** oEmbed may or may not return `thumbnail_url`. The
  card only renders it when the host is under `miro.com` (anything else is blocked
  by `networkAccess` and would draw an empty box); otherwise it draws a generic
  board graphic.
- **The Miro mark** (`MIRO_GLYPH` in `code.tsx`) is the real path, taken from the
  Simple Icons set (CC0). The mark is Miro's trademark and is used here only to
  identify the service the card links to — check Miro's brand terms before
  publishing this to the Community.

## Property menu

Edit link · Reload details · Open in Miro · Status (To do / In progress / In review /
Done) · Compact toggle · Remove board.

The note under the title is edited inline on the card; everything else lives in the
dialog.

## Going further

Titles, owners and thumbnails are all oEmbed gives you. Board members, last-modified
date, item counts or a live thumbnail need the Miro REST API v2 with an OAuth token,
which means a Miro developer app and a token exchange — the iframe would hold the
OAuth popup and `figma.clientStorage` the token.
