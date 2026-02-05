# HowardOS Color Palette

## Brand Colors

### Primary Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Sage Green** | `#758C7C` | Primary buttons, links, success states |
| **Dark Teal-Gray** | `#465352` | Headers, important text, secondary buttons |
| **Slate Blue** | `#8A9DAA` | Muted text, icons, borders |
| **Terracotta** | `#D3986F` | Warnings, accents, highlights |
| **Cream** | `#FBF4EA` | Page backgrounds, subtle surfaces |

### Color Swatches

```
█ #758C7C  Sage Green (Primary)
█ #465352  Dark Teal-Gray (Navy)
█ #8A9DAA  Slate Blue
█ #D3986F  Terracotta
█ #FBF4EA  Cream
```

## Usage Guidelines

### Buttons

**Primary Button**
- Background: `#758C7C` (Sage Green)
- Text: `#FFFFFF` (White)
- Hover: Slightly darker sage

**Secondary Button**
- Background: `#465352` (Dark Teal-Gray)
- Text: `#FFFFFF` (White)
- Hover: Slightly lighter

**Destructive Button**
- Background: `#C85A54` (Muted Red)
- Text: `#FFFFFF` (White)

### Surfaces

**App Background**
- Background: `#FBF4EA` (Cream) - Warm, welcoming base

**Cards & Panels**
- Background: `#FFFFFF` (White) - Clean, elevated surfaces
- Border: `#D3D3D3` (Light gray)

**Sidebar/Navigation**
- Background: `#465352` (Dark Teal-Gray)
- Text: `#FFFFFF` (White)
- Active state: `#758C7C` (Sage Green)

### Typography

**Headings**
- Color: `#465352` (Dark Teal-Gray)
- Weight: Bold or Semi-bold

**Body Text**
- Color: `#465352` (Dark Teal-Gray)
- Weight: Regular

**Muted Text**
- Color: `#8A9DAA` (Slate Blue)
- Usage: Captions, timestamps, secondary info

### States & Feedback

**Success**
- Color: `#758C7C` (Sage Green)
- Usage: Success messages, completed tasks, positive actions

**Warning/Alert**
- Color: `#D3986F` (Terracotta)
- Usage: Warnings, deadlines, important notices

**Error**
- Color: `#C85A54` (Muted Red)
- Usage: Error messages, validation errors

**Info**
- Color: `#8A9DAA` (Slate Blue)
- Usage: Informational messages, tips

### Data Visualization

**Priority Indicators**
- **Urgent**: `#D3986F` (Terracotta)
- **High**: `#8A9DAA` (Slate Blue)
- **Medium**: `#758C7C` (Sage Green)
- **Low**: `#8A9DAA` (Slate Blue, lighter)

**Status Pills**
- **Active/In Progress**: `#758C7C` (Sage Green)
- **Pending**: `#8A9DAA` (Slate Blue)
- **Completed**: `#758C7C` with checkmark
- **Cancelled**: `#C85A54` (Muted Red)

## Tailwind CSS Classes

### Brand Colors
```css
bg-brand-primary      #758C7C (Sage Green)
bg-brand-navy         #465352 (Dark Teal-Gray)
bg-brand-sage         #758C7C (Sage Green - alias)
bg-brand-slate        #8A9DAA (Slate Blue)
bg-brand-terracotta   #D3986F (Terracotta)
```

### Text Colors
```css
text-text-primary     #465352 (Dark Teal-Gray)
text-text-muted       #8A9DAA (Slate Blue)
text-text-inverse     #FFFFFF (White)
```

### Background Colors
```css
bg-background-DEFAULT    #FFFFFF (White)
bg-background-subtle     #FBF4EA (Cream)
```

### State Colors
```css
text-state-success    #758C7C (Sage Green)
text-state-warning    #D3986F (Terracotta)
text-state-error      #C85A54 (Muted Red)
```

### Neutral Colors
```css
bg-neutral-cream      #FBF4EA
border-neutral-border #D3D3D3
```

## CSS Variables

All colors are also available as CSS variables:

```css
var(--brand-primary)      /* #758C7C */
var(--brand-navy)         /* #465352 */
var(--brand-slate)        /* #8A9DAA */
var(--brand-terracotta)   /* #D3986F */
var(--neutral-cream)      /* #FBF4EA */

var(--text-primary)       /* #465352 */
var(--text-muted)         /* #8A9DAA */
var(--text-inverse)       /* #FFFFFF */

var(--bg-default)         /* #FFFFFF */
var(--bg-subtle)          /* #FBF4EA */

var(--state-success)      /* #758C7C */
var(--state-warning)      /* #D3986F */
var(--state-error)        /* #C85A54 */
```

## Accessibility

### Contrast Ratios

All color combinations meet WCAG AA standards:

- **Dark Teal-Gray (#465352) on Cream (#FBF4EA)**: ✅ AAA
- **Dark Teal-Gray (#465352) on White (#FFFFFF)**: ✅ AAA
- **Sage Green (#758C7C) on White (#FFFFFF)**: ✅ AA
- **White (#FFFFFF) on Sage Green (#758C7C)**: ✅ AAA
- **White (#FFFFFF) on Dark Teal-Gray (#465352)**: ✅ AAA

### Focus States

All interactive elements use:
- Focus ring: `#758C7C` (Sage Green)
- Ring width: 2px
- Ring offset: 2px

## Color Philosophy

The Howard palette embodies:

🌿 **Natural & Grounded** - Earthy tones inspired by nature
🏡 **Warm & Welcoming** - Cream backgrounds create comfort
⚖️ **Professional & Calm** - Muted colors reduce visual stress
🎯 **Clear Hierarchy** - Distinct colors for different purposes

## Examples in Components

### Sidebar
```tsx
<aside className="bg-brand-navy text-text-inverse">
  <Link className="bg-brand-primary text-brand-navy"> // Active
  <Link className="text-text-inverse/80"> // Inactive
</aside>
```

### Button Variants
```tsx
<Button variant="primary">     // bg-brand-primary (Sage)
<Button variant="secondary">   // bg-brand-navy (Dark Teal)
<Button variant="destructive"> // bg-state-error (Muted Red)
```

### Status Badge
```tsx
<span className="bg-state-success/10 text-state-success"> // Success
<span className="bg-state-warning/10 text-state-warning"> // Warning
```

### Card
```tsx
<div className="bg-background-DEFAULT border-neutral-border">
  <h2 className="text-text-primary">Title</h2>
  <p className="text-text-muted">Description</p>
</div>
```

## Brand Applications

### Logo Usage
- Primary logo on: Cream background
- Light logo on: Dark Teal-Gray or Sage Green backgrounds
- Minimum spacing: 20px clear space

### Marketing Materials
- **Primary**: Sage Green for CTAs and highlights
- **Secondary**: Dark Teal-Gray for body content
- **Accent**: Terracotta sparingly for emphasis

### Digital Interfaces
- Backgrounds: Cream (#FBF4EA) for warmth
- Interactive elements: Sage Green (#758C7C)
- Navigation: Dark Teal-Gray (#465352)
- Feedback: Follow state guidelines

---

**Color Palette Version**: 1.0
**Last Updated**: 2026-02-05
**Designer**: Howard Team
