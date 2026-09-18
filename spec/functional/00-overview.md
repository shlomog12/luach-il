# Overview

## Purpose

A web app (PWA) that displays a Hebrew/Gregorian calendar, daily halachic
times, holidays, and the weekly Torah portion, synced with the user's Google
Calendar (read-only) — so an event added in Google Calendar also shows up in
the site's calendar.

Intended for personal use, not mass distribution (though there's no technical
obstacle to that).

## Deliberate constraints

| Constraint | Reason |
|---|---|
| **No server/backend** | Simplicity, zero cost, no sensitive data to secure server-side |
| **Static files only, served as-is** | Easy to host on any static hosting service, no build step |
| **Read-only from Google Calendar** (`calendar.readonly`) | Minimal scope; extending to write access is a conscious future decision (see [04](04-google-calendar-integration.md)) |
| **Astronomical/halachic calculations run client-side** | Works offline (aside from Google events), no network dependency for basic availability |
| **Holidays/parsha follow the Israel calendar only** | `il:true` — single-day Yom Tov, not two days like in the Diaspora |

## Runtime environment

- Browser: Chrome (primary), Safari/iOS also supported.
- Installable as a PWA ("Add to Home Screen") — manifest + service worker.
- RTL, Hebrew as the primary UI language.

## Deployment

- Source code: private GitHub repo (`shlomog12/luach-il`).
- Hosting: Netlify (`https://luach-il.netlify.app`), continuous deployment
  connected to GitHub — every push to `master` deploys automatically (a
  manual deploy via the Netlify API/CLI is also available as a fallback).
- Google OAuth Client ID configured with that origin under Authorized
  JavaScript origins; the consent screen starts in Testing mode with the app
  owner as the test user (see [04](04-google-calendar-integration.md) for
  what's needed to publish it more broadly).

## Feature index

1. Hebrew date, holidays, weekly parsha — [01](01-hebrew-calendar.md)
2. Hebrew/Gregorian view + navigation + jump-to-date — [02](02-calendar-views-and-navigation.md)
3. Location and daily zmanim — [03](03-zmanim.md)
4. Google Calendar sync — [04](04-google-calendar-integration.md)
5. Design, RTL, disclosures, PWA — [05](05-ui-and-accessibility.md)
6. Local storage (persistence) — [06](06-persistence-and-storage.md)
7. External services/libraries — [07](07-external-dependencies.md)
