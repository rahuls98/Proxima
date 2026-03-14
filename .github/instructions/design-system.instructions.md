# Proxima AI - Design System & UI Guidelines

## Context for AI Assistants (Copilot)

When generating UI code, components, or HTML/Tailwind for the Proxima AI project, you must strictly adhere to the rules, color palette, and component structures defined in this document. Do not invent new colors, spacing conventions, or UI patterns. Proxima AI is a premium, dark-mode-only SaaS platform for sales rehearsal.

## 1. Tailwind Configuration

Always use the following custom color palette in your Tailwind configuration. Do not use default Tailwind colors (like `slate-800` or `blue-500`) unless explicitly permitted.

```javascript
// tailwind.config.js
module.exports = {
    darkMode: "class", // Always dark mode
    theme: {
        extend: {
            colors: {
                primary: "#0db9f2", // Cyan/Blue - Main brand color
                "surface-base": "#0c1215", // Deepest background (app background)
                "surface-panel": "#141c21", // Elevated cards, sidebars, modals
                "surface-hover": "#1a252b", // Hover states for panels and buttons
                "border-subtle": "#22313a", // Universal border color
                "text-main": "#f8fafc", // Bright crisp white for main readable text
                "text-muted": "#94a3b8", // Readable gray for secondary text
                "text-placeholder": "#475569", // Dull, recessed gray for input placeholders
                success: "#10b981", // Green for positive metrics/states
                warning: "#f59e0b", // Orange for alerts/medium metrics
                danger: "#ef4444", // Red for errors/destructive actions
            },
            fontFamily: {
                display: ["Manrope", "sans-serif"],
                body: ["Manrope", "sans-serif"],
            },
        },
    },
};
```

## 2. Global Styling Rules

### Typography

- Font: Google Font “Manrope” exclusively.
- Headings (h1, h2, h3): Always use  text-white font-bold .
- Paragraphs/Data: Always use  text-text-main  (crisp white).
- Secondary Text/Timestamps: Always use  text-text-muted .
- Do not use opacity modifiers for text (e.g.,  text-white/50 ). Use the semantic text variables.

### Icons

- Library: Google Material Symbols Outlined.
- CSS Overrides: Always include this specific CSS rule to prevent icons from breaking flexbox layouts and ensure uniform thickness:

```
.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    font-size: 20px !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
```

## 3. Component Patterns

When building components, strictly use these exact class combinations to ensure consistent styling, hover states, and contrast.

### Backgrounds, Containers & Panels

- **Main App Background:** Use `bg-surface-base` for the lowest layer (body, main canvas).
- **Cards & Elevated Panels (Bento Grid):** Use `<div class="bg-surface-panel border border-border-subtle rounded-2xl p-6">`.
- **Interactive Cards:** To make a card clickable, add: `hover:border-primary/50 transition-all duration-300 cursor-pointer group`.
- **Dividers/Separators:** Always use `border-border-subtle`. Never use generic gray borders.

### Forms & Inputs (Critical Text Contrast)

Input fields must have bright text for user input, but dull/recessed text for placeholders to maintain hierarchy.

- **Standard Text Input:**
  `<input class="w-full bg-surface-base border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">`
- **Textarea:**
  `<textarea class="w-full bg-surface-base border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"></textarea>`
- **Labels:** `<label class="text-sm font-medium text-text-muted mb-1 block">`

### Button Hierarchy

- **Primary Button (CTA):**
  `<button class="bg-primary text-surface-base font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">`
- **Secondary/Ghost Button:**
  `<button class="bg-surface-panel border border-border-subtle text-text-main hover:bg-surface-hover px-6 py-3 rounded-xl flex items-center gap-2 transition-colors">`
- **Icon-Only Button (Utility):**
  `<button class="w-10 h-10 rounded-lg bg-surface-hover hover:border-border-subtle border border-transparent flex items-center justify-center text-text-main transition-colors">`
- **Destructive Action:**
  `<button class="bg-danger/10 text-danger hover:bg-danger/20 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors">`

### Badges & Status Pills

- **Neutral/Informational:** `<span class="px-2.5 py-1 bg-surface-hover border border-border-subtle text-text-main text-[10px] font-bold rounded uppercase tracking-wider">`
- **Success/Completed:** `<span class="px-2.5 py-1 bg-success/10 border border-success/20 text-success text-[10px] font-bold rounded uppercase tracking-wider">`
- **Warning/In-Progress:** `<span class="px-2.5 py-1 bg-warning/10 border border-warning/20 text-warning text-[10px] font-bold rounded uppercase tracking-wider">`

### Data Tables

- **Table Wrapper:** `<div class="bg-surface-panel rounded-2xl border border-border-subtle overflow-hidden">`
- **Headers (th):** `bg-surface-hover/50 text-[11px] font-bold uppercase tracking-wider text-text-muted px-6 py-4`
- **Rows (tr):** `border-b border-border-subtle hover:bg-surface-hover transition-colors`
- **Cells (td):** `px-6 py-4 text-sm text-text-main`

### Component Architecture (Required)

All reusable UI should be built under `client/components` and follow the current layer boundaries.

- **Atoms (`client/components/atoms`)**: Single-purpose UI primitives with minimal composition logic.
- Current atoms include: `Button`, `FieldInput`, `Heading`, `IconButton`, `Input`, `StatusLine`, `TextArea`, `TrendBadge`.
- Use atoms for base controls, labels, badges, and low-level display elements.

- **Molecules (`client/components/molecules`)**: Small composed building blocks made from atoms.
- Current molecules include: `AdditionalFileContext`, `AdditionalTextContext`, `AppPageHeader`, `ChatComposer`, `ChatTranscript`, `CoachingHint`, `ContextSection`, `ControlRow`, `FileContextItem`, `MiniTrendChart`, `ParticipantTile`, `PersonaConfiguringOverlay`, `PersonaLibraryCard`, `PersonaSimulationCard`, `SessionMetricCard`, `SessionReport`, `SessionReportView`, `SummaryMetricCard`, `TextContextItem`.
- Use molecules for repeatable feature fragments (e.g., chart blocks, context rows, transcript panels).

- **Organisms (`client/components/organisms`)**: Feature-complete sections composed from molecules/atoms.
- Current organism: `MeetingRoom`.

- **Templates (`client/components/templates`)**: Page-level structural shells/layout scaffolds.
- Current templates: `FullScreenTemplate`, `SideNavTemplate`.

#### Composition Rules

- Prefer reuse over new components. If an atom/molecule already exists (e.g., `TrendBadge`, `MiniTrendChart`), use it rather than re-implementing.
- Keep styling responsibility in the lowest practical layer; avoid duplicating Tailwind class sets across pages.
- Page files under `app/` should mostly orchestrate data and compose components, not define reusable UI primitives.
- If a piece of UI appears in 2+ places, extract it into `atoms` or `molecules`.
- Do not skip layers: pages should not directly recreate template/organism concerns unless intentionally one-off.
- If two routes render the same feature UI (for example dynamic segment vs query-param variants), keep one canonical composed component in `components/` and make route pages thin wrappers.
- Keep reusable visualization math and presentation-independent helpers in `client/lib` (for example trend/line chart path builders), then consume from pages/components instead of redefining per route.

#### Naming & File Conventions

- Use PascalCase component names and matching file names.
- Keep one exported component per file for atoms/molecules unless a tight coupling requires otherwise.
- Keep props focused and explicit; avoid "kitchen sink" prop signatures.
- Keep components framework-agnostic where possible (data in, UI out), especially in `atoms` and `molecules`.

---

## 4. Layout Architecture

Follow these structural rules to maintain the responsive, app-like feel of Proxima AI.

### Global App Shell

Do not let the window scroll. The body should be fixed, and internal containers should handle scrolling.

```html
<body
    class="h-screen w-full flex overflow-hidden bg-surface-base text-text-main font-display antialiased"
>
    <!-- Fixed Sidebar -->
    <aside
        class="w-64 flex-shrink-0 bg-surface-base border-r border-border-subtle flex flex-col z-40"
    >
        ...
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 min-w-0 flex flex-col h-full bg-surface-base">
        <!-- Sticky Header -->
        <header
            class="h-20 flex-shrink-0 border-b border-border-subtle flex items-center px-8 z-30 bg-surface-base/80 backdrop-blur-md"
        >
            ...
        </header>

        <!-- Scrollable Canvas -->
        <div class="flex-1 overflow-y-auto p-8 lg:p-10 space-y-8 no-scrollbar">
            ...
        </div>
    </main>
</body>
```

### Grid Systems & Spacing

- Bento Grids: Use CSS Grid for metric cards and dashboard layouts. Prefer  grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 .
- Form Layouts: Group form inputs using  grid grid-cols-2 gap-6 . Use  col-span-2  for full-width fields like textareas.
- Flexbox Alignment: Always use  flex items-center gap-3  (or  gap-2 ,  gap-4 ) to align icons with text vertically. Do not use margins to push icons away from text.

### Depth, Shadows & Z-Index

- Flat UI First: Rely on  border-border-subtle  and background color differences ( surface-base  vs  surface-panel ) to separate content.
- Shadows: Do NOT use default Tailwind shadows ( shadow-md ,  shadow-xl ) on standard cards.
- Modals & Floating Elements: Only use shadows for floating UI like dropdowns, tooltips, or the AI Insight banner. Use  shadow-2xl  combined with a subtle colored border (e.g.,  border border-primary/20 ) for these popovers.
- Z-Index Standards:
- Base content:  z-0 
- Sticky Headers:  z-30 
- Fixed Sidebars:  z-40 
- Modals/Loading Screens/Floating Toolbars:  z-50 

## 5. UI Elements Customization (CSS)

Hide default scrollbars to maintain the sleek app look:

```
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```
