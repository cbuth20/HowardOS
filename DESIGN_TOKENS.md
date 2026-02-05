# HowardOS Design Tokens

Complete design system with colors, typography, spacing, and component styles.

## 🎨 Color Palette

### Brand Colors
```css
--brand-primary: #758C7C     /* Sage Green - Primary actions */
--brand-navy: #465352        /* Dark Teal-Gray - Headers, nav */
--brand-slate: #8A9DAA       /* Slate Blue - Muted text */
--brand-terracotta: #D3986F  /* Terracotta - Warnings, accents */
```

### Neutral Colors
```css
--neutral-white: #FFFFFF
--neutral-cream: #FBF4EA     /* Page backgrounds */
--neutral-border: #E0E0E0    /* Default borders */
--neutral-border-dark: #C4C4C4  /* Emphasis borders */
--neutral-black: #101010
```

### Gray Scale (for shadows, overlays)
```css
neutral-gray-50: #F9FAFB
neutral-gray-100: #F3F4F6
neutral-gray-200: #E5E7EB
...through...
neutral-gray-900: #111827
```

### Text Colors
```css
--text-primary: #465352      /* Headings, body */
--text-secondary: #5A6868    /* Less emphasis */
--text-muted: #8A9DAA        /* Captions, labels */
--text-inverse: #FFFFFF      /* On dark backgrounds */
```

### State Colors
```css
/* Success (Sage Green) */
--state-success: #758C7C
--state-success-light: #E8F0ED  /* Backgrounds */

/* Warning (Terracotta) */
--state-warning: #D3986F
--state-warning-light: #F9F1E8

/* Error (Muted Red) */
--state-error: #C85A54
--state-error-light: #F9E8E7

/* Info (Slate Blue) */
--state-info: #8A9DAA
--state-info-light: #EEF1F4
```

### Background Colors
```css
--bg-default: #FFFFFF        /* Cards, panels */
--bg-subtle: #FBF4EA         /* Page backgrounds */
--bg-overlay: rgba(16,16,16,0.6)  /* Modal backdrops */
```

## 📐 Spacing Scale

```css
0: 0px
1: 0.25rem (4px)
2: 0.5rem (8px)
3: 0.75rem (12px)
4: 1rem (16px)
5: 1.25rem (20px)
6: 1.5rem (24px)
8: 2rem (32px)
10: 2.5rem (40px)
12: 3rem (48px)
16: 4rem (64px)
20: 5rem (80px)
```

## 🔤 Typography

### Font Families
```css
font-serif: Crimson Text (Headers)
font-sans: Roboto Light (Body, 300 weight default)
```

### Font Sizes
```css
text-xs: 0.75rem (12px)
text-sm: 0.875rem (14px)
text-base: 1rem (16px)
text-lg: 1.125rem (18px)
text-xl: 1.25rem (20px)
text-2xl: 1.5rem (24px)
text-3xl: 1.875rem (30px)
text-4xl: 2.25rem (36px)
```

### Font Weights
```css
font-light: 300 (Body default)
font-normal: 400
font-medium: 500
font-semibold: 600 (Headers)
font-bold: 700
```

## 🎯 Border Radius

```css
rounded-sm: 0.25rem (4px)
rounded: 0.375rem (6px)
rounded-md: 0.5rem (8px)
rounded-lg: 0.75rem (12px)
rounded-xl: 1rem (16px)
rounded-2xl: 1.5rem (24px)
rounded-full: 9999px
```

## 🌑 Shadows

```css
shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
shadow: 0 1px 3px rgba(0,0,0,0.1)
shadow-md: 0 4px 6px rgba(0,0,0,0.1)
shadow-lg: 0 10px 15px rgba(0,0,0,0.1)
shadow-xl: 0 20px 25px rgba(0,0,0,0.1)
shadow-2xl: 0 25px 50px rgba(0,0,0,0.25)
```

## 🧩 Component Patterns

### Button Styles

**Primary Button**
```tsx
<button className="bg-brand-primary hover:bg-primary-hover text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors">
  Primary Action
</button>
```

**Secondary Button**
```tsx
<button className="bg-brand-navy hover:bg-secondary-hover text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors">
  Secondary Action
</button>
```

**Ghost Button**
```tsx
<button className="text-brand-navy hover:bg-neutral-cream font-medium px-4 py-2 rounded-md transition-colors">
  Ghost Action
</button>
```

### Card Styles

**Default Card**
```tsx
<div className="bg-background-DEFAULT border border-neutral-border rounded-lg shadow-sm p-6">
  Content
</div>
```

**Elevated Card**
```tsx
<div className="bg-background-DEFAULT border border-neutral-border rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  Interactive Content
</div>
```

### Input Styles

**Text Input**
```tsx
<input className="w-full px-3 py-2 border border-input rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
```

### Modal Styles

**Modal Container**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="absolute inset-0 bg-background-overlay backdrop-blur-sm" />
  <div className="relative bg-background-DEFAULT rounded-lg shadow-2xl border border-neutral-border max-w-lg w-full">
    Content
  </div>
</div>
```

### Badge/Pill Styles

**Success Badge**
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-state-success-light text-state-success">
  Completed
</span>
```

**Warning Badge**
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-state-warning-light text-state-warning">
  Pending
</span>
```

**Error Badge**
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-state-error-light text-state-error">
  Failed
</span>
```

## 📱 Responsive Breakpoints

```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## ✨ Transitions

```css
transition-colors: color, background-color 150ms
transition-all: all 150ms
transition-shadow: box-shadow 150ms
```

## 🎭 Hover States

### Primary Elements
- Buttons: Darken by 10%
- Cards: Increase shadow
- Links: Underline + darken

### Secondary Elements
- Ghost buttons: Light background
- Icons: Scale 1.05
- Inputs: Ring focus state

## 🌓 Dark Mode (Future)

Tokens are structured to support dark mode:
- Replace `--bg-default` with dark value
- Invert text colors
- Adjust borders for dark backgrounds

## 📊 Usage Guidelines

### Color Usage Hierarchy

1. **Primary (Sage Green)**: Main CTAs, active states, success
2. **Navy (Dark Teal)**: Headers, navigation, secondary actions
3. **Slate Blue**: Muted text, info states
4. **Terracotta**: Warnings, urgent actions (use sparingly)
5. **Cream**: Page backgrounds, subtle surfaces

### Typography Hierarchy

```
h1 (4xl, serif, semibold) - Page titles
h2 (3xl, serif, semibold) - Section headers
h3 (2xl, serif, semibold) - Card titles
h4 (xl, serif, semibold) - Sub-sections
body (base, sans, light) - Default text
small (sm, sans, light) - Captions, meta
```

### Spacing Guidelines

- **Compact UI**: 2-3 spacing
- **Standard UI**: 4-6 spacing
- **Spacious UI**: 8-12 spacing
- **Page sections**: 16-20 spacing

---

**Design System Version**: 2.0
**Last Updated**: 2026-02-05
**Status**: Enhanced with comprehensive tokens
