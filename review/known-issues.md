# Known Issues

## Minor Issues

1. **Cities JSON is large (7.3MB / 1.8MB gzipped)**: The bundled cities database creates a large chunk. Could be code-split further or served as a separate file with streaming search. Currently lazy-loaded via dynamic import which mitigates initial load.

2. **Houses Overview section not separate**: The product spec mentioned a "Houses Overview" section with rulers. House information is embedded within planet cards instead. A dedicated section could be added as an enhancement.

3. **Chiron not calculated**: The astronomy-engine library doesn't expose Chiron. This was noted as optional in the spec ("if library supports, otherwise omit").

4. **No AI-enhanced synthesis**: The OpenAI API integration for narrative synthesis was a Priority 2 / Nice-to-Have feature. Not implemented.

5. **Aspect interpretations coverage**: ~70 aspect combinations are covered. Uncommon planet pairs (e.g., Uranus-Neptune minor aspects) fall back to a generic "minor aspect" note rather than specific interpretation.

6. **No end-to-end testing**: No automated tests were written. The app relies on TypeScript type checking and manual verification.

## Edge Cases

- **Unknown birth time**: When checked, houses and ascendant are hidden from results. Solar noon (12:00) is used for planet positions. This is noted in the UI.
- **Extreme latitudes**: Placidus house system can produce unusual results above ~66° latitude. No warning is shown for polar locations.

## Future Enhancements (Priority 2)

- PDF export
- Share via link
- Synastry (chart comparison)
- Transit overlay
- AI narrative synthesis
