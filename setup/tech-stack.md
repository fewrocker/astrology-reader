# Tech Stack

## Decision

| Layer | Choice | Reasoning |
|-------|--------|-----------|
| **Framework** | React 18 + TypeScript | Component-based UI ideal for the multi-step form, chart rendering, and expandable reading sections. TypeScript ensures type safety for complex astronomical data structures. |
| **Build Tool** | Vite | Fast dev server, instant HMR, optimized production builds. Zero-config for React+TS. |
| **Styling** | Tailwind CSS | Utility-first approach enables rapid UI development of the mystic theme. Easy responsive design. |
| **Astronomy** | `astronomy-engine` | High-precision astronomical calculations, runs in browser, zero dependencies, MIT license. Provides ecliptic coordinates needed for zodiac positions. |
| **Chart Rendering** | Hand-crafted SVG via React | Full control over the chart wheel appearance, crisp at any size, interactive via DOM events. |
| **City Data** | Bundled JSON (~40K cities) | No external API dependency. Instant autocomplete. Includes lat/lng/timezone. Sourced from GeoNames free data. |
| **Timezone** | Browser `Intl` API | Built-in IANA timezone database handles historical timezone offsets at specific dates. |
| **State Management** | React Context + useReducer | Sufficient for form wizard state and chart data flow. No need for Redux/Zustand given the app's linear flow. |
| **Routing** | None (single-page flow) | The app is a linear wizard → results flow. No need for client-side routing. |
| **AI Integration** | Optional OpenAI API (future) | Not in initial scope (Priority 2). Will be addable via `/enhance`. |

## Architecture

```
src/
├── components/
│   ├── form/           # Multi-step form wizard components
│   ├── chart/          # SVG chart wheel components
│   ├── reading/        # Interpretation display components
│   └── ui/             # Shared UI components (buttons, inputs, etc.)
├── engine/
│   ├── astronomy.ts    # Planetary position calculations
│   ├── houses.ts       # House cusp calculations
│   ├── aspects.ts      # Aspect detection and calculation
│   └── types.ts        # Shared astrological types
├── data/
│   ├── cities.json     # Bundled city database
│   └── interpretations/# Interpretation text database
├── context/
│   └── ChartContext.tsx # App state management
├── styles/
│   └── theme.ts        # Theme constants (colors, fonts)
├── utils/
│   └── zodiac.ts       # Sign/degree conversion utilities
├── App.tsx
├── main.tsx
└── index.css           # Tailwind base + custom styles
```

## Key Technical Decisions

1. **Client-side only**: All calculations run in the browser. No backend needed. This simplifies deployment (static hosting) and eliminates server costs.

2. **Placidus house system**: The most common house system in Western astrology. Requires sidereal time calculation from the astronomy engine.

3. **Bundled city database over API**: Eliminates network latency for autocomplete, works offline, no rate limits. The ~40K city JSON file is approximately 3-4MB, acceptable for a modern web app (can be lazy-loaded).

4. **SVG over Canvas**: SVG integrates naturally with React's component model, supports CSS styling, and allows hover/click interactions on individual elements without hit-testing math.

5. **Static interpretations first**: Build the interpretation database as TypeScript modules for type safety and tree-shaking. AI enhancement is a future feature.
