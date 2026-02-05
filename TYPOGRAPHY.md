# HowardOS Typography

## Font Stack

### Primary & Headers - Crimson Text (Serif)
- **Usage**: All headings (h1-h6), page titles, section headers
- **Weights**: Regular (400), Semi-bold (600), Bold (700)
- **Alternative to**: Sitka Text (not web-safe)
- **Tailwind class**: `font-serif`

### Body & Sub-Headers - Roboto Light
- **Usage**: Body text, sub-headers, UI elements, navigation
- **Weights**: Light (300), Regular (400), Medium (500), Bold (700)
- **Default weight**: Light (300)
- **Tailwind class**: `font-sans` (default)

## Typography Scale

```css
h1 - 2.25rem (36px) - Crimson Text Semi-bold
h2 - 1.875rem (30px) - Crimson Text Semi-bold
h3 - 1.5rem (24px) - Crimson Text Semi-bold
h4 - 1.25rem (20px) - Crimson Text Semi-bold
body - 1rem (16px) - Roboto Light
small - 0.875rem (14px) - Roboto Light
```

## Usage Examples

### Headings (Automatic)
```tsx
<h1>Welcome to HowardOS</h1>  // Uses Crimson Text automatically
<h2>Recent Files</h2>         // Uses Crimson Text automatically
```

### Body Text (Default)
```tsx
<p>This is body text</p>  // Uses Roboto Light automatically
```

### Explicit Font Classes
```tsx
<div className="font-serif">Heading style text</div>
<div className="font-sans">Body style text</div>
```

### Font Weights
```tsx
<p className="font-light">Light (300) - Default</p>
<p className="font-normal">Regular (400)</p>
<p className="font-medium">Medium (500)</p>
<p className="font-semibold">Semi-bold (600)</p>
<p className="font-bold">Bold (700)</p>
```

## Component Patterns

### Page Header
```tsx
<h1 className="text-4xl font-serif font-semibold text-brand-navy mb-4">
  Dashboard
</h1>
```

### Card Title
```tsx
<h3 className="text-2xl font-serif font-semibold text-brand-navy">
  Recent Activity
</h3>
```

### Section Label
```tsx
<h4 className="text-xl font-serif text-text-primary">
  Files
</h4>
```

### Body Text
```tsx
<p className="text-base font-light text-text-primary">
  Standard body text using Roboto Light
</p>
```

### Muted Text
```tsx
<p className="text-sm font-light text-text-muted">
  Secondary information
</p>
```

## Notes

- Sitka Text is a Windows system font (not web-safe)
- Crimson Text is a close Google Fonts alternative
- If you need true Sitka Text, you'll need to:
  1. Purchase/license the font
  2. Add font files to `public/fonts/`
  3. Update `@font-face` declarations

## Accessibility

- Minimum font size: 14px (0.875rem)
- Line height: 1.5 for body text
- Contrast ratios meet WCAG AA standards
- All fonts tested for readability

---

**Typography Version**: Howard v1.0
**Last Updated**: 2026-02-05
