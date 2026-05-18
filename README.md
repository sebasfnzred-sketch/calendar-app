# Calendar App

A lightweight, single-page calendar built with vanilla HTML, CSS, and JavaScript — no dependencies, no build step.

## Features

- Monthly calendar grid with prev/next navigation and a Today button
- Click any day to add an event (title, date, start/end time, description, color)
- Click an existing event to edit or delete it
- Events persist in `localStorage` — they survive page refreshes
- Up to 3 event pills per day, with a `+N more` overflow indicator

## Usage

Open `index.html` directly in a browser — no server required.

## Project structure

```
index.html   — markup and modal form
style.css    — all styles
app.js       — calendar logic, CRUD, event handling
```
