# Francken Association Portal (Firebase)

This repository contains a ready-to-host Firebase web app with a **single global style system** and modular component classes.

## Global style architecture

- One centralized stylesheet: `public/main.css`
- Single source of truth in `:root` variables for:
  - colors
  - typography
  - spacing scale
  - border/radius/shadow
  - breakpoints
- Reusable naming conventions:
  - `l-*` layout classes
  - `c-*` component classes
  - `u-*` utility classes

See `STYLE_GUIDE.md` for component snippets and usage examples.

## Firebase project used

- Project ID: `tfvprofessorfrancken`
- Auth domain: `tfvprofessorfrancken.firebaseapp.com`
- Storage bucket: `tfvprofessorfrancken.firebasestorage.app`

Firebase config is embedded in `public/app.js` as requested.

## Deploy steps

```bash
npm install -g firebase-tools
firebase login
firebase use tfvprofessorfrancken
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage
```

## Collections expected

- `members`, `committees`, `board`, `activities`
- `activity_signups`, `food_drinks`, `food_drink_orders`
- `merchandise`, `merchandise_orders`
- `invoices`, `invoice_items`, `batch_invoices`
- `second_hand_books`, `photos`
- `committee_budgets`, `committee_budget_items`
