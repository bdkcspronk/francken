# Global Style System (Single Source of Truth)

All styles are centralized in `public/main.css`.

## Rules enforced

- Colors, typography, spacing, borders, radius, shadows, and breakpoints are defined once in `:root` variables.
- Components use reusable class names with a consistent naming convention:
  - `l-*` for layout objects
  - `c-*` for components
  - `u-*` for utility helpers
- No inline styles.
- New pages/components should compose existing classes and variables.

## Example HTML snippets

### Card

```html
<section class="c-card l-stack">
  <h2 class="c-card__title">Card title</h2>
  <p class="u-mb-0">Card body text using global spacing and typography.</p>
  <button class="c-button c-button--primary">Primary Action</button>
</section>
```

### Form

```html
<form class="c-card l-stack">
  <label class="c-field">
    <span class="c-field__label">Email</span>
    <input type="email" class="c-input" />
  </label>

  <label class="c-field">
    <span class="c-field__label">Role</span>
    <select class="c-select">
      <option>Member</option>
      <option>Admin</option>
    </select>
  </label>

  <button class="c-button c-button--primary" type="submit">Submit</button>
</form>
```

### Buttons

```html
<button class="c-button c-button--primary">Primary</button>
<button class="c-button c-button--secondary">Secondary</button>
<button class="c-button c-button--danger">Danger</button>
```
