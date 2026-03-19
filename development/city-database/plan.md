# City Database — Plan

## Description
Bundle a curated JSON dataset of ~40,000 major world cities and build a fast client-side autocomplete component.

## Tasks
- [ ] Source and prepare city dataset (GeoNames data → JSON with name, region, country, lat, lng, timezone, population)
- [ ] Create city data TypeScript types
- [ ] Build city search utility (fuzzy matching, population-weighted ranking, debounced)
- [ ] Build CityAutocomplete React component (input + dropdown results)
- [ ] Test search performance (<50ms for all queries)
