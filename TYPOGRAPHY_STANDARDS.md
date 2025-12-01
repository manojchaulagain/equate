# Typography Standards

This document outlines the consistent typography standards used throughout the application to ensure elegant, readable, and cohesive text styling.

## Typography Hierarchy

### Headings

#### H1 (Main Title)
- **Usage**: Club name, hero titles
- **Classes**: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight`
- **Color**: Gradient text (amber theme)

#### H2 (Section Headings)
- **Usage**: Main section titles (Availability Poll, Leaderboard, Admin Dashboard, etc.)
- **Classes**: `text-xl sm:text-2xl md:text-3xl font-bold tracking-tight`
- **Color**: Gradient text matching section theme
- **Pattern**: 
  ```jsx
  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-[color]-600 via-[color]-600 to-[color]-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
    <Icon className="text-[color]-600" size={24} />
    Title
  </h2>
  ```

#### H3 (Subsection Headings)
- **Usage**: Subsections within panels
- **Classes**: `text-lg sm:text-xl md:text-2xl font-bold`

#### H4 (Minor Headings)
- **Usage**: Small section titles
- **Classes**: `text-base sm:text-lg font-semibold`

### Body Text

#### Standard Body
- **Usage**: Paragraphs, descriptions
- **Classes**: `text-sm sm:text-base font-normal`
- **Color**: `text-slate-800` (primary) or `text-slate-600` (secondary)

#### Large Body
- **Usage**: Emphasis, highlighted text
- **Classes**: `text-base sm:text-lg font-normal`

#### Small Body
- **Usage**: Secondary information
- **Classes**: `text-xs sm:text-sm font-normal`

### Labels

#### Standard Labels
- **Usage**: Form labels, field names
- **Classes**: `text-xs sm:text-sm font-semibold`
- **Color**: `text-slate-700`

#### Small Labels
- **Usage**: Inline labels, badges
- **Classes**: `text-xs font-semibold`

### Helper Text

#### Standard Helper
- **Usage**: Descriptions, hints, metadata
- **Classes**: `text-xs sm:text-sm font-medium text-slate-600`
- **Pattern**:
  ```jsx
  <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
    Description text here
  </p>
  ```

#### Small Helper
- **Usage**: Fine print, timestamps
- **Classes**: `text-xs font-medium text-slate-500`

### Button Text

#### Standard Buttons
- **Classes**: `text-sm sm:text-base font-semibold`

#### Small Buttons
- **Classes**: `text-xs sm:text-sm font-semibold`

### Form Elements

#### Input Placeholder
- **Classes**: `placeholder:text-slate-400`

#### Input Text
- **Classes**: `text-sm font-medium` or `text-base font-medium`

#### Error Messages
- **Classes**: `text-sm font-semibold text-red-700`

#### Success Messages
- **Classes**: `text-sm font-semibold text-green-700`

## Color System

### Text Colors

- **Primary**: `text-slate-800` - Main content
- **Secondary**: `text-slate-600` - Descriptions, helper text
- **Muted**: `text-slate-500` - Timestamps, less important info
- **Inverse**: `text-white` - On colored backgrounds

### Gradient Text

Gradient text is used for headings to match section themes:

- **Amber/Orange** (Leaderboard, Statistics): `bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent`
- **Indigo/Purple** (Availability Poll): `bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent`
- **Blue/Cyan** (Questions): `bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent`
- **Purple/Pink** (Admin): `bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent`

## Consistent Patterns

### Section Header Pattern

```jsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
  <div>
    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-[color]-600 via-[color]-600 to-[color]-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
      <Icon className="text-[color]-600" size={24} />
      Section Title
    </h2>
    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
      Description text here
    </p>
  </div>
  {/* Optional action button */}
</div>
```

### Helper Text Pattern

Always place helper text directly after the element it describes:

```jsx
<label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
  Label Text
</label>
<input ... />
<p className="mt-2 text-xs font-medium text-slate-500 italic">
  Helper text here
</p>
```

## Key Principles

1. **Consistency**: Use the same typography classes for similar content types
2. **Hierarchy**: Maintain clear visual hierarchy with appropriate font sizes
3. **Readability**: Ensure sufficient contrast and appropriate font sizes
4. **Responsiveness**: Always include responsive font sizes (sm:, md: breakpoints)
5. **Spacing**: Use consistent spacing after headings (`mb-6`, `mt-2`, etc.)
6. **Tracking**: Add `tracking-tight` to headings for elegant appearance

## Usage Examples

### Modal Headings

```jsx
<h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
  Modal Title
</h2>
```

### Card Titles

```jsx
<p className="font-bold text-base sm:text-lg text-slate-800 truncate">
  Player Name
</p>
```

### Error Messages

```jsx
<div className="p-3 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold">
  Error message here
</div>
```

---

**Note**: All typography constants are defined in `src/constants/typography.ts` for easy reference and maintenance.

