---
name: KFUPM Facility Booking
description: An official KFUPM service for booking rooms, labs and sports facilities, set in the university's own identity program.
colors:
  kfupm-green: "#008540"
  forest: "#00573f"
  petrol: "#003e51"
  petrol-soft: "#dde9ed"
  pending-ink: "#7a6300"
  pending-soft: "#f6f0cc"
  confirmed-soft: "#dcefe4"
  green-wash: "#e5f2ea"
  white: "#ffffff"
  dark-gray: "#373938"
  muted-ink: "#63666e"
  light-gray: "#d9dae4"
  input-stroke: "#c9cbd6"
  mist: "#f2f3f6"
  sidebar-ground: "#f7f8fa"
  cancelled-soft: "#eceef2"
  destructive: "#b42318"
  dark-ground: "#0f1b1f"
  dark-card: "#132328"
  dark-popover: "#16292f"
  dark-mist: "#182d33"
  dark-sidebar: "#0b1518"
  dark-border: "#27404a"
  dark-input: "#335059"
  dark-ink: "#e6e8ec"
  dark-muted-ink: "#a3acb3"
  dark-brand-ink: "#74c595"
  dark-green-wash: "#15362b"
  dark-green-wash-ink: "#9ad6b1"
  dark-press: "#00703a"
  dark-ring: "#3fae6c"
  gold: "#dac961"
  dark-pending-soft: "#2d2a12"
  dark-confirmed: "#8fd3aa"
  dark-confirmed-soft: "#143428"
  dark-cancelled-soft: "#1d3138"
  dark-petrol: "#8cc3d4"
  dark-petrol-soft: "#123642"
  dark-destructive: "#f07167"
typography:
  display:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  body-lead:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "Poppins, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
rounded:
  sm: "2px"
  md: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.kfupm-green}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.forest}"
  button-inverse:
    backgroundColor: "{colors.white}"
    textColor: "{colors.forest}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.white}"
    textColor: "{colors.dark-gray}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-outline-hover:
    backgroundColor: "{colors.mist}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dark-gray}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-ghost-hover:
    backgroundColor: "{colors.mist}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.dark-gray}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  segmented-control:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "2px"
  segmented-option:
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  segmented-option-active:
    backgroundColor: "{colors.kfupm-green}"
    textColor: "{colors.white}"
  badge-pending:
    backgroundColor: "{colors.pending-soft}"
    textColor: "{colors.pending-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
  badge-confirmed:
    backgroundColor: "{colors.confirmed-soft}"
    textColor: "{colors.forest}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
  badge-cancelled:
    backgroundColor: "{colors.cancelled-soft}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
  badge-role-admin:
    backgroundColor: "{colors.petrol}"
    textColor: "{colors.white}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
  badge-role-staff:
    backgroundColor: "{colors.petrol-soft}"
    textColor: "{colors.petrol}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
  badge-role-faculty:
    backgroundColor: "{colors.white}"
    textColor: "{colors.dark-gray}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "24px"
  table-header:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.dark-gray}"
    typography: "{typography.label}"
    padding: "0 12px"
    height: "40px"
  nav-item:
    textColor: "{colors.dark-gray}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.green-wash}"
    textColor: "{colors.forest}"
  overview-panel:
    backgroundColor: "{colors.kfupm-green}"
    textColor: "{colors.white}"
    padding: "40px"
  dialog:
    backgroundColor: "{colors.white}"
    textColor: "{colors.dark-gray}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: KFUPM Facility Booking

## Overview

**Creative North Star: "The University's Own Letterhead"**

The tool reads as an official KFUPM service, not a product with its own brand. Every colour, the single typeface and the two graphic devices come from the KFUPM Identity Guideline v3 (November 2022). The world is a white ground with Dark Gray ink, Light Gray rules, and KFUPM Green as the one fill colour for action. Forest Green carries page titles and links; Petrol is the secondary colour and is reserved for user roles. The palette is light and calm so tables of bookings stay legible.

Density is that of an administrative tool: a fixed 240px sidebar, a content column capped at 1152px, tables in thin-ruled bordered containers, and 48px between page sections. Corners are square-ish (4px). Two guideline elements appear, each exactly once on a screen: the octagon cut corner on the Overview panel, and the gold-green gradient as a 4px bar at the foot of the sidebar. Icons are Phosphor in the filled weight. The dark theme moves the grounds to Petrol-tinted near-black and keeps KFUPM Green as the fill.

The system rejects the generic dark-SaaS dashboard (emerald on near-black, mono labels, pill badges, status dots, marketing banners) and the drab institutional ledger (heavy serif headers, cramped tables).

**Key Characteristics:**
- White ground, Dark Gray ink, Light Gray rules; KFUPM Green is the only action fill.
- Poppins only. Titles bold, text regular, controls medium or semibold.
- 4px corners on controls and containers, 2px on badges and segment options. No pills.
- One octagon cut corner (Overview panel); one gradient bar (sidebar foot).
- Flat surfaces; soft shadows only on floating layers (dialogs, select menus).
- Filled Phosphor object icons; bold Phosphor utility glyphs.

## Colors

The guideline palette, lightened into soft tints for state fills and deepened where text contrast demands it.

### Primary
- **KFUPM Green** (kfupm-green): the fill of every primary button, the active segment, the Overview panel, focus rings, the text caret, and the active nav icon. The one colour that means "act here".
- **Forest** (forest): primary button hover/press, page titles (h1), section links, the app name, confirmed status text, and the active nav label.
- **Green Wash** (green-wash): background of the active nav item.

### Secondary
- **KFUPM Petrol** (petrol): user roles only. Admin is a solid Petrol badge; Staff is Petrol text on **Petrol Soft** (petrol-soft). The dark theme is built from Petrol-tinted near-blacks.

### Tertiary
- **Pending Ink** (pending-ink): pending status text on **Pending Soft** (pending-soft). A deliberate adaptation: the guideline's Stone #AA8A00 does not reach 4.5:1 on its tint, so the text is darkened to #7a6300 while staying in Stone's hue. In the dark theme pending text is **KFUPM Gold** (gold) on dark-pending-soft.

### Neutral
- **White** (white): page, card, popover and input grounds.
- **Dark Gray** (dark-gray): all body text and table header text.
- **Muted Ink** (muted-ink): descriptions, secondary lines, placeholders, cancelled status text, inactive nav icons.
- **Light Gray** (light-gray): every border and table rule.
- **Input Stroke** (input-stroke): the slightly darker stroke on inputs, selects, outline buttons and the segmented control.
- **Mist** (mist): table header band, hover fills on ghost and outline buttons, dialog footer band.
- **Sidebar Ground** (sidebar-ground): the sidebar panel.
- **Destructive** (destructive): delete confirmation, error rows, load-error banner (10% tint ground, 30% tint border). Not a guideline colour; used only for errors and deletes.

### Dark theme
Grounds step from dark-sidebar to dark-ground to dark-card to dark-popover, with dark-mist for header bands and hovers, dark-border for rules and dark-input for strokes. Ink is dark-ink with dark-muted-ink for secondary text. KFUPM Green stays the fill; press is dark-press; focus ring is dark-ring; Forest-role text (titles, links) becomes dark-brand-ink; the Overview panel becomes Forest. Status and role colours swap to their dark- counterparts.

### Named Rules
**The One Fill Rule.** KFUPM Green is the only saturated fill for action. Secondary actions are outline or ghost; nothing else on a screen competes with the primary button.

**The Separate Meanings Rule.** Status colours (pending, confirmed, cancelled) and role colours (Petrol family, outline neutral, mist) never overlap. Admin is solid Petrol, Staff is Petrol Soft, Faculty is an outline neutral, Club President and Student are mist; no role reuses a status colour.

**The Contrast Over Swatch Rule.** A guideline colour that fails 4.5:1 as text is darkened in its own hue (Stone to #7a6300) rather than used as is.

## Typography

**Display Font:** Poppins (with Helvetica Neue, Arial, sans-serif)
**Body Font:** Poppins (same stack)

**Character:** One geometric sans for everything, as the guideline requires. Hierarchy comes from weight and size only: bold for titles, regular for text, medium and semibold for controls and labels. Headings use -0.01em tracking and balanced wrapping; tables use tabular numerals.

### Hierarchy
- **Display** (700, 2rem / 1.75rem below sm, 1.25): the Overview panel title only, white on green.
- **Headline** (700, 1.75rem / 1.5rem below sm): page titles via the page header, in Forest.
- **Title** (600, 1.125rem): section headings on the Overview page and dialog titles.
- **Body** (400, 0.875rem): table cells, descriptions, form text. Inputs render at 1rem on mobile to avoid zoom, 0.875rem from md.
- **Body Lead** (400, 0.9375rem): the Overview panel description and counts line.
- **Label** (600, 0.8125rem): table headers; at weight 500 the same size sets segment options, small buttons and secondary list lines.
- **Caption** (600, 0.75rem): status and role badges.

### Named Rules
**The Single Family Rule.** Poppins only, loaded at 400/500/600/700. No mono, no serif, no second display face.

**The Sentence Case Rule.** Labels, headers and badges are sentence case at normal tracking. No uppercase tracked labels.

## Layout

A two-column shell: a 240px sticky sidebar (logo text, five nav items, theme toggle, gradient bar) and a content column centred at max 1152px. Content padding is 16px/24px on mobile, 32px from sm, 40px from lg. Below lg the sidebar becomes an off-canvas drawer (slides in over 300ms ease-out over a 50% sidebar-tinted scrim) and a 56px sticky top bar shows the menu button and the app name.

Pages open with a page header (title plus description left, actions right, 32px below). A toolbar row follows (search or segmented control left, selects right, 24px below), then a bordered table. Overview stacks the green panel and two sections 48px apart. Below sm, Overview tables become bordered, divided lists. Spacing follows a 4px base: 4, 8, 12, 16, 24, 32, 40, 48.

## Elevation & Depth

Flat by default. Depth on the page comes from borders (Light Gray) and tonal bands (Mist header, Sidebar Ground), not shadows. Only layers that float above the page cast a soft, diffuse shadow, paired with a 1px border ring.

### Shadow Vocabulary
- **Menu** (`box-shadow: 0 8px 24px rgb(0 0 0 / 0.12)`): select dropdowns.
- **Dialog** (`box-shadow: 0 16px 48px rgb(0 0 0 / 0.18)`): dialogs and alert dialogs, over a 50% dark-sidebar scrim.

### Named Rules
**The Flat Page Rule.** Nothing attached to the page has a shadow. If it does not float, it uses a border.

## Shapes

Small, near-square corners: 4px (md) on buttons, inputs, selects, nav items, table containers, list containers, dialogs and banners; 2px (sm) on badges, segment options and scrollbar thumbs. No pill shapes anywhere. The one silhouette from the guideline is the octagon cut: a 40px diagonal crop of the top-right corner, applied only to the Overview panel. The gradient (#c6a41a to #3f8f48 to #9bc43d to #d2b83d, left to right) is only ever a 4px bar, and only at the sidebar foot.

### Named Rules
**The One Cut Rule.** The octagon cut corner appears once in the product, on the Overview panel. Do not add it to cards, buttons or dialogs.

**The Bar-Only Gradient Rule.** The brand gradient is a 4px horizontal bar at the sidebar foot. Never a fill, a text treatment or a background.

## Components

### Buttons
Quiet and square, with one green voice.
- **Shape:** 4px corners. Heights 32px (sm), 36px (default), 40px (lg). Weight 500.
- **Primary:** KFUPM Green fill, white text; hover Forest. Used for the page's main action ("New reservation", "Add user").
- **Inverse:** white fill, Forest text, 40px. Only on the green Overview panel.
- **Outline:** white ground, Input Stroke border; hover Mist. Pagination, dialog cancel.
- **Ghost:** no ground; hover Mist. Row actions (Cancel, Edit), theme toggle, icon buttons.
- **Destructive:** 10% destructive tint with destructive text; the confirm button in the delete dialog is a solid destructive fill.
- **Focus:** 3px ring at 50% ring colour, plus the global 2px outline offset 2px. Active press moves 1px down.

### Badges
- **Style:** 24px tall, 2px corners, 0.75rem semibold, soft tint ground with deep text. Never a pill, never a dot.
- **Status:** Pending (pending-soft / pending-ink), Confirmed (confirmed-soft / forest), Cancelled (cancelled-soft / muted-ink).
- **Role:** Admin (solid Petrol, white text), Staff (Petrol Soft / Petrol), Faculty (white with Input Stroke border), Club President (Mist / Dark Gray), Student (Mist / Muted Ink).

### Segmented Control
The status and type filter. A 4px-cornered group with an Input Stroke border and 2px inset; options are 32px tall, 0.8125rem medium, 2px corners. The selected option fills KFUPM Green with white text; others are Muted Ink, hover Mist.

### Cards / Containers
- **Corner Style:** 4px.
- **Background:** White (dark-card in dark).
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px Light Gray. Lists inside use Light Gray dividers.
- **Internal Padding:** 12px by 16px per list row.

### Inputs / Fields
- **Style:** 36px tall, 4px corners, Input Stroke border, white ground (30% dark-input tint in dark). Selects match, with a bold caret at 14px.
- **Search:** a bold magnifier glyph inset 12px, text padded 36px.
- **Focus:** border turns ring colour plus a 3px ring at 50%.
- **Error / Disabled:** destructive border and 20% ring; field errors are 0.75rem destructive text. Disabled at 50% opacity.

### Tables
A bordered 4px container. Header band is Mist, 40px tall, 0.8125rem semibold Dark Gray. Cells are 12px padded, rows divided by Light Gray, hover at 50% Mist. Loading, empty and error states are a single 96px centred row in Muted Ink (error in destructive). A load failure above a table is a destructive-tinted banner. Pagination sits below, hidden when everything fits on one page.

### Navigation
Sidebar items are 0.875rem medium, 10px by 12px padding, 4px corners, 20px filled icons, 4px apart. Inactive: Dark Gray text, Muted Ink icon, hover Mist. Active: Green Wash ground, Forest semibold text, KFUPM Green icon.

### Dialogs
White, 4px corners, 24px padding, 1px border ring and the dialog shadow. Title is the Title role. The footer is a Mist band (60%) with a top rule, actions right-aligned. Close is a ghost icon button with a bold x.

### Overview Panel (signature)
A KFUPM Green block (Forest in dark) with the octagon cut corner, 40px padding (24px/32px on mobile). Holds the Display title, a Body Lead line, the inverse "Book a facility" button, and a counts line under a 30% white rule: bold numbers, regular nouns, each a link.

### Icons
Phosphor throughout. Object and navigation icons (facilities, nav, theme, toast status, delete) use the fill weight. Utility glyphs (plus, caret, x, arrow, search, menu, spinner) use the bold weight, because the filled versions of these shapes read as blobs at 14-16px. Facility types map to fixed icons: Classroom chalkboard, Laboratory flask, Swimming pool, Sports court basketball, Gym barbell, Other building.

## Do's and Don'ts

### Do:
- **Do** use KFUPM Green (#008540) as the only action fill, with Forest (#00573f) on hover.
- **Do** set page titles in Poppins 700 in Forest, and body text in Poppins 400 Dark Gray (#373938).
- **Do** use 4px corners on controls and containers and 2px on badges and segment options.
- **Do** show status and role as tinted square badges with text; keep the role palette (Petrol family, outline, Mist) apart from the status palette.
- **Do** darken a guideline colour in its own hue when it fails 4.5:1 as text, as pending-ink (#7a6300) does for Stone.
- **Do** use Phosphor fill for object and nav icons and Phosphor bold for utility glyphs.
- **Do** separate surfaces with 1px Light Gray (#d9dae4) borders and Mist bands instead of shadows.

### Don't:
- **Don't** use pill badges, status dots, mono labels, or uppercase tracked labels.
- **Don't** add marketing banners, tech-marketing badges, or claims about the stack.
- **Don't** use the brand gradient as anything other than the 4px bar at the sidebar foot.
- **Don't** repeat the octagon cut corner beyond the Overview panel.
- **Don't** add a second typeface, a serif header, or a system display face.
- **Don't** put shadows on page-attached surfaces; only dialogs and menus float.
- **Don't** introduce colours outside the guideline palette and its tints, except destructive red for errors and deletes.
