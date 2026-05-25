export interface AstroConnectionData {
  rulingPlanetNote?: string
  elementNote?: string
  baselineNote: string
}

export const ASTRO_CONNECTIONS: Record<string, AstroConnectionData> = {
  'the-fool':           { baselineNote: 'The Fool\'s Uranian spirit invites the leap beyond the known.' },
  'the-magician':       { baselineNote: 'Mercury sharpens the Magician\'s tools — thought, word, and intention aligned.' },
  'the-high-priestess': { baselineNote: 'The Moon\'s tidal pull deepens the High Priestess\'s inner knowing.' },
  'the-empress':        { baselineNote: 'Venus pours abundance into the Empress\'s domain — love made fertile.' },
  'the-emperor':        { baselineNote: 'Mars grounds the Emperor\'s authority in disciplined, directed will.' },
  'the-hierophant':     { baselineNote: 'Venus in Taurus gives the Hierophant his patience with sacred form.' },
  'the-lovers':         { baselineNote: 'Gemini\'s dual nature lives in the Lovers — the self meeting itself in another.' },
  'the-chariot':        { baselineNote: 'Cancer\'s protective drive moves through the Chariot with fierce intention.' },
  'strength':           { baselineNote: 'The Sun in Leo illuminates Strength\'s quiet, solar courage.' },
  'the-hermit':         { baselineNote: 'Mercury in Virgo makes the Hermit\'s lantern analytical and precise.' },
  'wheel-of-fortune':   { baselineNote: 'Jupiter\'s expansive cycles turn the Wheel with generous force.' },
  'justice':            { baselineNote: 'Libra\'s scales live in Justice — the mind seeking beauty in balance.' },
  'the-hanged-man':     { baselineNote: 'Neptune dissolves the Hanged Man\'s resistance, opening the depth.' },
  'death':              { baselineNote: 'Pluto transforms through Death\'s threshold — complete and necessary change.' },
  'temperance':         { baselineNote: 'Jupiter in Sagittarius gives Temperance its optimism about the slow path.' },
  'the-devil':          { baselineNote: 'Saturn\'s weight names the Devil\'s chains — and hints at their removal.' },
  'the-tower':          { baselineNote: 'Mars ignites the Tower\'s sudden collapse of the unsustainable.' },
  'the-star':           { baselineNote: 'Uranus illuminates the Star\'s vision with the electricity of awakening.' },
  'the-moon':           { baselineNote: 'Neptune and the Moon together dissolve the boundary between worlds.' },
  'the-sun':            { baselineNote: 'The Sun\'s nature is the Sun card\'s promise — clear, warm, and completely present.' },
  'judgment':           { baselineNote: 'Pluto\'s summons sounds through Judgment — the call to transform and rise.' },
  'the-world':          { baselineNote: 'Saturn completes the World\'s architecture — mastery made whole.' },
}
