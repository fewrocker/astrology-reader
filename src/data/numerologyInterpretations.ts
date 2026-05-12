export interface NumberInterpretation {
  archetype: string
  essence: string
  shadow: string
  keywords: string[]
}

export type NumerologyCategory = 'lifePath' | 'birthdayNumber' | 'personalYear' | 'expressionNumber' | 'soulUrge' | 'karmicDebt' | 'personalMonth' | 'personalDay'

export type NumberKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33

export type KarmicDebtKey = 13 | 14 | 16 | 19

const lifePathInterpretations: Record<NumberKey, NumberInterpretation> = {
  1: {
    archetype: 'The Pioneer',
    essence: 'You came into this world with an original fire — a soul that must lead, create, and forge its own path. Life Path 1 carries the vibration of pure will, the cosmic first breath of all that exists. You are here to develop independence, courage, and the confidence to trust your singular vision even when no one else can see it yet. Your journey is one of self-mastery: learning that true authority comes not from forcing your will upon the world, but from becoming so authentically yourself that others are naturally drawn to follow.',
    shadow: 'The shadow of 1 is the tyrant and the egotist — the one who mistakes stubbornness for strength and isolation for independence. Watch for the tendency to dominate rather than lead, or to be so consumed by self-reliance that you refuse the nourishment of genuine connection.',
    keywords: ['Independence', 'Leadership', 'Originality', 'Courage', 'Initiative', 'Self-reliance'],
  },
  2: {
    archetype: 'The Diplomat',
    essence: 'You are the keeper of the sacred space between — the soul who feels both sides of every truth and carries the divine gift of empathy. Life Path 2 is the vibration of partnership, receptivity, and the quiet power of deep listening. Where 1 creates, 2 harmonizes; where others clash, you find the thread that weaves them together. Your greatest work happens in relationship, in collaboration, in the delicate art of building bridges where others see only distance. You sense what is unsaid, feel what is unfelt, and hold space for others with a grace that is genuinely rare.',
    shadow: 'The shadow of 2 is the doormat and the co-dependent — giving so completely that the self dissolves entirely. Learn to distinguish between sacred service and self-erasure; your sensitivity is a superpower, not a wound to be managed.',
    keywords: ['Partnership', 'Diplomacy', 'Sensitivity', 'Balance', 'Cooperation', 'Intuition'],
  },
  3: {
    archetype: 'The Enchanter',
    essence: 'You carry the vibration of pure creative joy — a soul that came to express, to delight, and to remind the world that beauty and play are not luxuries but necessities of the human spirit. Life Path 3 is the artist, the storyteller, the one whose words and laughter can lift a room. Your gift is communication in its most luminous form: the ability to translate the invisible into something felt, heard, seen, and remembered. At your highest, you are a channel for creative intelligence itself, giving form to what the universe is trying to say.',
    shadow: 'The shadow of 3 is scattered brilliance — so many gifts, so many directions, that none reach their full depth. Superficiality, self-doubt beneath the performance, and the avoidance of the emotional depths beneath the charm are the traps that await when 3 runs from its own substance.',
    keywords: ['Creativity', 'Expression', 'Joy', 'Communication', 'Social gifts', 'Inspiration', 'Artistry'],
  },
  4: {
    archetype: 'The Foundation Builder',
    essence: 'You are the sacred architect of the enduring — the soul who understands that great things are built not in a day but through patient, methodical devotion to quality. Life Path 4 carries the vibration of Earth itself: reliable, deep-rooted, and capable of bearing tremendous weight without complaint. You have an instinct for structure, for systems, for seeing the long arc of consequence that others miss. Your work ethic is not mere industriousness — it is a spiritual practice, a way of honoring the material world as the canvas on which all values must eventually be inscribed.',
    shadow: 'The shadow of 4 is rigidity and the prison of routine — the one who mistakes the map for the territory and clings so fiercely to systems that spontaneity, joy, and the unexpected gifts of chaos are shut out entirely. The stubbornness that is a strength in adversity becomes a wall against love and growth.',
    keywords: ['Structure', 'Discipline', 'Foundation', 'Reliability', 'Hard work', 'Practicality', 'Integrity'],
  },
  5: {
    archetype: 'The Liberator',
    essence: 'You are the soul of freedom itself — restless, magnetic, and alive with an insatiable hunger for experience, knowledge, and the next horizon. Life Path 5 carries the vibration of change as a spiritual practice; for you, stagnation is not just discomfort but existential suffocation. You are here to taste the full breadth of human experience, to collect wisdom from everywhere, and to embody the truth that life is meant to be lived vividly. Your versatility is extraordinary — you can adapt, reinvent, and find richness in circumstances that would defeat a lesser spirit.',
    shadow: 'The shadow of 5 is the escape artist — chasing sensation to avoid depth, running from commitment before roots can form, and confusing freedom with irresponsibility. The great paradox of 5 is that the truest freedom is found not by refusing all bonds, but by choosing consciously which bonds are worth your devotion.',
    keywords: ['Freedom', 'Adventure', 'Change', 'Versatility', 'Curiosity', 'Sensuality', 'Resourcefulness'],
  },
  6: {
    archetype: 'The Nurturer',
    essence: 'You carry love as a vocation — a soul who feels the weight of others\' wellbeing as if it were your own, and who finds meaning in the sacred act of care. Life Path 6 is the vibration of responsibility, harmony, and the kind of beauty that is not ornamental but deeply healing. You have a gift for seeing what is broken and knowing instinctively how to restore it — in homes, in relationships, in communities. Your highest expression is the teacher, the counselor, the artist who creates not for acclaim but to offer something of real use and loveliness to the world.',
    shadow: 'The shadow of 6 is martyrdom — giving until there is nothing left, then feeling resentful of the very people you insisted on helping without being asked. The compulsive need to fix and perfect can cross the line into controlling those you love, smothering the very growth you wish to foster.',
    keywords: ['Nurturing', 'Responsibility', 'Harmony', 'Service', 'Family', 'Beauty', 'Healing'],
  },
  7: {
    archetype: 'The Seeker',
    essence: 'You are the soul who came to know — not the surface shimmer of facts, but the deep architecture of reality that hides behind the visible world. Life Path 7 is the vibration of the mystic, the philosopher, the scientist who suspects that the universe has a secret it is willing to share with those patient and solitary enough to listen. You are drawn inward as naturally as others are drawn outward; your inner world is as vast and complex as any landscape, and the quality of your inner life is the true measure of your wealth. Wisdom is your calling, and you earn it not through accumulation but through depth.',
    shadow: 'The shadow of 7 is the hermit who mistakes isolation for wisdom, and the cynic who uses skepticism as armor against the vulnerability of genuine faith. Distrust, emotional unavailability, and an elitist detachment that keeps love at arm\'s length are the wounds of 7 unhealed.',
    keywords: ['Analysis', 'Introspection', 'Wisdom', 'Spirituality', 'Solitude', 'Mystery', 'Inner knowing'],
  },
  8: {
    archetype: 'The Sovereign',
    essence: 'You carry the vibration of worldly mastery — the soul that came to navigate the currents of power, abundance, and material reality with wisdom and integrity. Life Path 8 is not about wealth for its own sake but about understanding the deeper laws that govern success, influence, and the responsible stewardship of resources. You have a natural command, an authority that others sense even before you speak, and an instinct for seeing the large picture of how systems work and how they can be moved. At your highest, you are the enlightened executive, the philanthropist, the one who builds material empires as a vehicle for larger service.',
    shadow: 'The shadow of 8 is the tyrant and the workaholic — the one who confuses net worth with self-worth, who accumulates power without wisdom, or who surrenders all joy in relentless pursuit of external achievement. The great karmic lesson of 8 is that what you gain by force, you lose; what you build with integrity, endures.',
    keywords: ['Power', 'Abundance', 'Authority', 'Ambition', 'Material mastery', 'Integrity', 'Legacy'],
  },
  9: {
    archetype: 'The Sage',
    essence: 'You are the soul of completion — the one who has gathered wisdom across many lifetimes and now carries it as an obligation to serve the larger human family. Life Path 9 is the vibration of universal compassion, of seeing the thread of humanity in every face, and of understanding that personal identity must eventually expand to embrace something far greater than the self. You have a natural philosophical depth, an artistic sensitivity, and a love that is genuinely unconditional when you are living at your highest. The world is moved by 9s who have learned to release attachment and give without keeping score.',
    shadow: 'The shadow of 9 is the martyr and the bitter idealist — the one who gave everything and received nothing, who love so broadly that they couldn\'t let themselves be loved personally. Resentment, emotional detachment dressed as spiritual transcendence, and the refusal to receive are the wounds that block 9\'s full expression.',
    keywords: ['Completion', 'Humanitarianism', 'Compassion', 'Wisdom', 'Release', 'Universal love', 'Artistic depth'],
  },
  11: {
    archetype: 'The Master Intuitive',
    essence: 'You carry one of the rarest and most demanding vibrations in numerology — the Master Number 11, the number of spiritual illumination and psychic sensitivity. You did not come here to live a merely personal life; you came as a bridge between the visible and invisible worlds, carrying insight that arrives not through logic but through direct knowing. Your intuition operates at a frequency most people cannot access, and when you trust it fully, you become a channel for genuinely illuminating guidance. The challenge is that this sensitivity comes without insulation: you feel everything more intensely, absorb the energies of places and people like a sponge, and must learn rigorous practices of energetic discernment to thrive.',
    shadow: 'The shadow of 11 is the shattered vessel — the one whose sensitivity becomes overwhelm, whose gifts become a source of anxiety rather than power. Nervous tension, self-doubt that wars with the grandeur of your potential, and the tendency to numb the very sensitivity that is your gift are the traps of 11 unintegrated.',
    keywords: ['Illumination', 'Psychic sensitivity', 'Inspiration', 'Spiritual bridge', 'Intuition', 'Vision'],
  },
  22: {
    archetype: 'The Master Builder',
    essence: 'You carry the Master Number 22, the most powerful number in numerology — the Practical Visionary who has the capacity to translate spiritual ideals into concrete, lasting realities of massive scale. Where 11 illuminates and 33 teaches, 22 builds. You have both the cosmic vision of the highest spiritual awareness and the organizational genius, discipline, and patience to actually bring it into form. The things you are capable of creating — systems, institutions, movements, works of art, communities — can genuinely change the trajectory of human experience. This is not hubris; it is the honest weight of 22\'s potential.',
    shadow: 'The shadow of 22 is the one who collapses under the weight of their own potential, retreating into the safer confines of ordinary 4 when the scale of 22 feels too vast. Perfectionism that paralyzes, fear of failure commensurate with the size of the vision, and the temptation to dominate rather than collaborate in building are the shadows to reckon with.',
    keywords: ['Practical vision', 'Large-scale achievement', 'Manifestation', 'Architecture', 'Global impact', 'Mastery'],
  },
  33: {
    archetype: 'The Master Teacher',
    essence: 'You carry the rarest vibration in numerology — Master Number 33, the Teacher of Teachers, whose life is a living embodiment of unconditional love and selfless service. 33 synthesizes the creative gift of 3 with the nurturing responsibility of 6 and the spiritual mastery of 11, producing a soul whose purpose is the healing and uplifting of humanity itself. You do not merely teach information; you transmit a frequency of compassion and wisdom through the quality of your presence. When a 33 is living in full alignment, the people around them are changed — not by what they say but by what they are.',
    shadow: 'The shadow of 33 is the one who cannot bear the ordinary weight of self-care and personal need, who sacrifices so completely on the altar of others\' wellbeing that the self is extinguished. The 33 must learn that they cannot pour from an empty vessel, and that loving the self is not a betrayal of the greater mission but its very foundation.',
    keywords: ['Selfless service', 'Compassion', 'Healing', 'Teaching', 'Universal love', 'Spiritual mastery'],
  },
}

const birthdayNumberInterpretations: Record<NumberKey, NumberInterpretation> = {
  1: {
    archetype: 'The Self-Starter',
    essence: 'Born on the 1st, 10th, 19th, or 28th, you carry a secondary gift of pure initiative. You have a natural instinct for beginning things, for taking the first step where others hesitate. This birthday gift expresses as a quiet but persistent drive — a need to be first, to be original, and to trust your own instincts above the consensus of the crowd. In your best moments, this manifests as bold, creative leadership that opens doors others didn\'t know existed.',
    shadow: 'The challenge is impatience with others\' pace and a tendency to restart before finishing — the restless energy of 1 must be disciplined into completion, not just commencement.',
    keywords: ['Initiative', 'Originality', 'Drive', 'Leadership', 'Self-trust'],
  },
  2: {
    archetype: 'The Peacemaker',
    essence: 'Born on the 2nd, 11th, 20th, or 29th, you carry a secondary gift of extraordinary relational intelligence. You notice the emotional temperature of any room before you\'ve crossed the threshold; you feel the unsaid needs of those around you and respond with an instinctive gentleness. This birthday gift makes you a natural mediator, a trusted confidant, and a collaborative partner of rare quality — someone whose presence itself creates conditions of safety and ease.',
    shadow: 'The challenge is the difficulty of claiming your own needs and preferences when your nature so readily adapts to the preferences of others. Boundary-setting is a lifelong practice for the birthday 2.',
    keywords: ['Harmony', 'Diplomacy', 'Empathy', 'Partnership', 'Intuition'],
  },
  3: {
    archetype: 'The Expressive Soul',
    essence: 'Born on the 3rd, 12th, 21st, or 30th, your birthday bestows a secondary gift of vivid, magnetic expressiveness. There is a natural effervescence to you — a way of communicating that illuminates and entertains simultaneously. You have artistic instincts, an ease with words and humor, and a social gift that draws people in without effort. At its highest, this expresses as genuine creative talent and the ability to translate complex feelings into beauty.',
    shadow: 'The challenge is the tendency to scatter your creative energy across too many projects, and to perform joy rather than feel it — using expressiveness as a mask for the deeper emotional waters underneath.',
    keywords: ['Expressiveness', 'Artistry', 'Charm', 'Humor', 'Communication'],
  },
  4: {
    archetype: 'The Steady Hand',
    essence: 'Born on the 4th, 13th, 22nd, or 31st, your birthday bestows a secondary gift of extraordinary reliability and practical genius. You are the one people call when something actually needs to get done — not just planned or imagined, but built, organized, and sustained. You have a remarkable capacity for sustained effort, a gift for seeing structural flaws before they become crises, and a work ethic that others find both impressive and, occasionally, a little intimidating.',
    shadow: 'The challenge is the tendency toward inflexibility — the well-organized person who cannot adapt when the plan needs to change. Perfectionism and the fear of disorder can trap the 4 birthday in unproductive loops.',
    keywords: ['Reliability', 'Organization', 'Work ethic', 'Practicality', 'Integrity'],
  },
  5: {
    archetype: 'The Adventurous Spirit',
    essence: 'Born on the 5th, 14th, or 23rd, your birthday grants a secondary gift of remarkable versatility and a magnetic aliveness that others find infectious. You are energized by change, by novelty, by the next discovery — and this makes you an extraordinary adapter who can find opportunity in virtually any situation. Your mind is quick, curious, and multi-directional; you naturally find connections between apparently unrelated domains, and this makes you innovative in ways that more specialized thinkers cannot be.',
    shadow: 'The challenge is the difficulty of sustained commitment when the initial excitement fades. Restlessness can become the enemy of the very depth that would ultimately satisfy the hunger 5 is always trying to fill with the next new thing.',
    keywords: ['Versatility', 'Adventure', 'Curiosity', 'Adaptability', 'Magnetism'],
  },
  6: {
    archetype: 'The Devoted Heart',
    essence: 'Born on the 6th, 15th, or 24th, your birthday bestows a secondary gift of deep, instinctive care for the wellbeing of others. You have a natural aesthetic sensibility and an eye for what is beautiful and what is broken; you feel a genuine calling to restore harmony wherever it is absent. This gift expresses through extraordinary generosity, a talent for creating environments of warmth and beauty, and a counseling quality that makes you the person others seek out in their most vulnerable moments.',
    shadow: 'The challenge is the compulsion to over-give and over-manage — to make others\' healing your project rather than their journey. The 6 birthday must learn when to offer love and when to allow others to find their own way.',
    keywords: ['Devotion', 'Care', 'Beauty', 'Harmony', 'Healing'],
  },
  7: {
    archetype: 'The Inner Scholar',
    essence: 'Born on the 7th, 16th, or 25th, your birthday grants a secondary gift of penetrating analytical intelligence and an instinctive hunger for what is true beneath the surface of appearances. You are a natural researcher, a quiet observer who collects data that others dismiss as irrelevant, and whose insights often arrive complete — fully formed from some subterranean process of unconscious synthesis. Your inner life is rich and complex; solitude is not something you tolerate but something you actively need to function at your best.',
    shadow: 'The challenge is the tendency to retreat so far into the inner world that relationships suffer and opportunities for connection are missed through excessive caution or the assumption that others cannot meet you at your depth.',
    keywords: ['Analysis', 'Depth', 'Introspection', 'Wisdom', 'Inner knowing'],
  },
  8: {
    archetype: 'The Natural Authority',
    essence: 'Born on the 8th, 17th, or 26th, your birthday grants a secondary gift of executive intelligence and a natural authority that others respond to even when you\'re making no special effort to project it. You understand how systems work — financial, organizational, social — and you have an instinct for positioning yourself and others effectively within them. This gift expresses as genuine competence in the material world, a talent for large-scale thinking, and the ability to make consequential decisions without flinching.',
    shadow: 'The challenge is the tendency to equate value with productivity and achievement, or to become so focused on external success that the interior life withers. The wisdom 8 needs most is that true power is an inner quality, not a measurement of what has been accumulated.',
    keywords: ['Authority', 'Ambition', 'Executive ability', 'Materialism', 'Power'],
  },
  9: {
    archetype: 'The Compassionate Visionary',
    essence: 'Born on the 9th, 18th, or 27th, your birthday bestows a secondary gift of broad humanitarian vision and an artistic sensitivity that sees beauty and meaning in the full spectrum of human experience — including its darkest passages. You have a philosophical depth and a natural generosity that extends beyond your immediate circle; you feel a genuine kinship with the suffering of strangers and a passionate desire to contribute to something that outlasts the personal. Your emotional range is vast, your creative potential considerable.',
    shadow: 'The challenge is the tendency toward emotional over-extension and the bitter disappointment that follows when the world\'s complexity defeats idealistic expectations. The 9 birthday must learn to love humanity as it actually is, not as the ideal version they carry in their heart.',
    keywords: ['Compassion', 'Artistic depth', 'Humanitarianism', 'Generosity', 'Vision'],
  },
  11: {
    archetype: 'The Illumined Talent',
    essence: 'Born on the 11th or 29th, your birthday carries the full charge of the Master Number 11 as a concentrated gift — extraordinary intuitive sensitivity, creative inspiration, and the capacity to channel insight from sources beyond ordinary rational knowing. Your inner life operates on a high-frequency channel; you pick up on subtleties, energies, and emotional currents that most people are completely unaware of. When you are in alignment, your creative and spiritual gifts can genuinely move and illuminate others.',
    shadow: 'The challenge is the nervous system — 11\'s sensitivity without adequate grounding leads to anxiety, overwhelm, and the exhausting need to manage an inner world that is never quiet. Regular practices of embodiment and stillness are essential medicine.',
    keywords: ['Psychic sensitivity', 'Inspiration', 'Illumination', 'Creativity', 'Spiritual gifts'],
  },
  22: {
    archetype: 'The Master Craftsman',
    essence: 'Born on the 22nd, your birthday carries the concentrated energy of the Master Builder as a secondary gift — a rare combination of visionary capacity and concrete organizational genius. You have the ability to see large-scale possibilities and simultaneously hold the detailed steps required to actualize them. This birthday gift expresses as an unusual effectiveness in the world — a capacity to create things that actually last and actually serve the needs you identified.',
    shadow: 'The challenge is the weight of the 22\'s potential — the gap between what you know you could build and what you\'ve actually managed to begin. Perfectionism and the fear of not doing justice to the vision can lead to a kind of paralysis that wastes the very gift you carry.',
    keywords: ['Practical vision', 'Organization', 'Building', 'Effectiveness', 'Legacy'],
  },
  33: {
    archetype: 'The Gifted Servant',
    essence: 'Born on the 33rd (not a standard date but representing the master energy as a birthday influence for some traditions), you carry a secondary gift of extraordinary compassion and healing presence. In practice, this manifests as a life marked by unusually selfless acts of service, a teaching quality that transforms those you encounter, and a love that is genuinely inclusive rather than transactional.',
    shadow: 'The challenge is protecting your own reserves of energy and love — the 33 gift can lead to such complete self-giving that burnout becomes the primary obstacle to the very mission you are here to fulfill.',
    keywords: ['Compassion', 'Service', 'Healing', 'Teaching', 'Love'],
  },
}

const personalYearInterpretations: Record<NumberKey, NumberInterpretation> = {
  1: {
    archetype: 'The Year of New Beginnings',
    essence: 'This is the opening of an entirely new nine-year cycle — a year when the universe is explicitly inviting you to plant seeds that will mature over the coming decade. The energy of a Personal Year 1 is electric with possibility: new chapters, new identities, and new directions are not just available but cosmically supported in a way they rarely are. This is the year to be bold, to begin the projects and relationships that truly align with your deepest values, and to release the stories of who you were in the cycle just completed. What you initiate this year will set the trajectory of the years to come.',
    shadow: 'The shadow of a 1 year is impulsiveness — beginning many things without the discernment to identify which seeds deserve the full depth of your investment. Choose wisely what you initiate; not every opportunity that presents itself deserves your energy.',
    keywords: ['New beginnings', 'Initiative', 'Planting seeds', 'Leadership', 'Fresh starts', 'Independence'],
  },
  2: {
    archetype: 'The Year of Patience and Partnership',
    essence: 'After the bold initiative of the 1 year, the universe slows to a more subtle rhythm — and the 2 year is when everything you planted begins its hidden root-development beneath the soil. This is a year that rewards patience, attention, and the quiet virtues: cooperation, sensitivity, and the willingness to let things develop in their own time. Relationships come into sharp focus in a 2 year; the quality of your partnerships — personal and professional — is both the primary field of growth and the primary source of guidance. What comes to you this year may come through another person.',
    shadow: 'The shadow of a 2 year is impatience and the feeling that nothing is happening. Things are happening — just not visibly. Forcing outcomes in a 2 year tends to shatter the very relationships and processes that are quietly doing essential work.',
    keywords: ['Partnership', 'Patience', 'Cooperation', 'Receptivity', 'Relationship', 'Subtlety'],
  },
  3: {
    archetype: 'The Year of Creative Expansion',
    essence: 'The 3 personal year brings a lightening — a year when creative expression, social connection, and the joy of living can flow more freely than at most other times in the nine-year cycle. This is the universe giving you permission to play, to create, to explore your gifts without the pressure of immediate practical application. Artistic projects flourish in a 3 year; social life expands; humor and delight become legitimate spiritual practices. The seeds planted in year 1 are beginning to sprout, and this is the season to tend them with joy rather than anxiety.',
    shadow: 'The shadow of a 3 year is dispersion — so many delightful possibilities that focus becomes difficult, and the year slips by in pleasurable but inconsequential activity. Keep one hand on the creative fire that truly matters to you.',
    keywords: ['Creativity', 'Expression', 'Joy', 'Social expansion', 'Optimism', 'Play'],
  },
  4: {
    archetype: 'The Year of Building and Work',
    essence: 'The 4 personal year is the year of serious construction — the time when all the inspiration and momentum of the previous three years must be built into something solid, reliable, and real. This is a disciplined year, one that rewards methodical effort, attention to detail, and the willingness to do the unglamorous work that transforms visions into viable structures. Health, finances, career foundations, and domestic stability come into focus; this is a year to get organized, get serious, and get the important work done rather than dreamed about.',
    shadow: 'The shadow of a 4 year is resistance — the feeling of being constrained by circumstances and obligations. The work is real, but so is the reward; those who resist the discipline of 4 year find themselves no further ahead when the cycle turns.',
    keywords: ['Work', 'Discipline', 'Building', 'Foundation', 'Health', 'Structure', 'Effort'],
  },
  5: {
    archetype: 'The Year of Freedom and Change',
    essence: 'The 5 personal year arrives like a gust of wind after a heavy 4 — sudden, invigorating, and full of the unexpected. This is a year when circumstances shift with unusual speed, when opportunities arise from surprising directions, and when the universe actively encourages you to step outside your established patterns and comfort zones. Travel, new experiences, and encounters with radically different perspectives are hallmarks of a 5 year. Flexibility and adaptability are your greatest assets; those who cling too tightly to fixed plans find them dismantled by a year that seems designed for motion.',
    shadow: 'The shadow of a 5 year is instability — the excitement of constant change bleeding into a kind of groundlessness that makes genuine progress impossible. Maintain one or two anchors of stability while allowing the rest of life to flow freely.',
    keywords: ['Freedom', 'Change', 'Adventure', 'Unexpected turns', 'Travel', 'Expansion', 'Flexibility'],
  },
  6: {
    archetype: 'The Year of Responsibility and Love',
    essence: 'The 6 personal year brings the energy of home, heart, and responsibility directly to the foreground. Family relationships, close friendships, and romantic partnerships become the primary arenas of growth and meaning this year; what you have been building is now asked to serve and sustain the people you love. This can be a deeply beautiful year — one of genuine intimacy, domestic flourishing, and the satisfaction of being truly useful to those who matter to you. It can also be demanding, as responsibilities multiply and others turn to you as their central source of support.',
    shadow: 'The shadow of a 6 year is resentment arising from over-giving — taking on more than anyone could sustainably carry, then feeling unappreciated by the very people you chose to serve without being asked.',
    keywords: ['Responsibility', 'Family', 'Love', 'Service', 'Home', 'Commitment', 'Nurturing'],
  },
  7: {
    archetype: 'The Year of Inner Work and Spiritual Deepening',
    essence: 'The 7 personal year is unlike any other — a year that turns you firmly inward and asks for patience with a process that is largely invisible. This is a year of spiritual deepening, inner study, and the kind of reflective work that cannot be rushed or hurried into visible results. Old certainties may fall away; new wisdom arrives through contemplation, solitude, and the willingness to sit with questions longer than feels comfortable. Those who honor the 7 year\'s call to go within emerge with a quality of understanding that transforms everything they do in the years that follow.',
    shadow: 'The shadow of a 7 year is isolation and the misreading of withdrawal as failure. This is not a year for aggressive external pursuit; those who force productivity at the expense of inner work tend to find the year both exhausting and strangely empty.',
    keywords: ['Introspection', 'Spiritual growth', 'Inner study', 'Solitude', 'Wisdom', 'Contemplation'],
  },
  8: {
    archetype: 'The Year of Manifestation and Power',
    essence: 'The 8 personal year brings the energy of material reality directly into focus — this is the year when all the inner work of the preceding years begins to produce tangible results in the world. Career advancement, financial shifts, and significant increases in responsibility and authority are hallmarks of an 8 year. The universe is asking you to step into your power — to claim what you have earned, to handle consequential decisions with integrity, and to take on the larger professional and material challenges that you are now genuinely ready for. Effort is rewarded with unusual directness in an 8 year.',
    shadow: 'The shadow of an 8 year is the obsession with external achievement at the expense of inner balance. Do not sacrifice health, relationships, or integrity for worldly gain; the karma of 8 means that what is built without integrity will not last.',
    keywords: ['Manifestation', 'Career', 'Material power', 'Authority', 'Financial shifts', 'Harvest'],
  },
  9: {
    archetype: 'The Year of Completion and Release',
    essence: 'The 9 personal year is the great clearing — the final chapter of a nine-year cycle, a year explicitly dedicated to completion, release, and the wise surrendering of what no longer serves. Relationships, careers, living situations, beliefs, and identity structures that have outlived their true purpose come forward to be consciously released or transformed. This is not a comfortable year, but it is a profoundly liberating one for those who understand that making space is not loss but preparation. Those who resist the releasing energy of 9 carry their old baggage into the new cycle that follows.',
    shadow: 'The shadow of a 9 year is clinging — holding onto what is clearly dying rather than trusting the regenerative promise of the new cycle. Grief is natural and welcome in a 9 year; resistance to completion is what creates suffering.',
    keywords: ['Completion', 'Release', 'Letting go', 'Endings', 'Transformation', 'Compassion', 'Closure'],
  },
  11: {
    archetype: 'The Year of Spiritual Illumination',
    essence: 'A Personal Year 11 is rare and charged — a Master Year that amplifies intuitive sensitivity and spiritual awareness to extraordinary levels. This year carries an electric quality; insights arrive suddenly and with unusual clarity, synchronicities multiply, and the invisible structures that govern your life become unusually visible. This is a year to trust your inner knowing above external authority, to follow the quiet voice of genuine inspiration, and to understand that the experiences this year offers are not random but part of a larger design your deeper self already understands.',
    shadow: 'The shadow of an 11 year is overwhelm — the amplified sensitivity without adequate grounding leads to anxiety, nervous exhaustion, and the sense of being flooded by more than can be integrated. Regular practices of stillness and embodiment are essential.',
    keywords: ['Illumination', 'Intuition', 'Spiritual awareness', 'Inspiration', 'Sensitivity', 'Awakening'],
  },
  22: {
    archetype: 'The Year of Visionary Building',
    essence: 'A Personal Year 22 is one of the most powerful years in numerology — a Master Year that aligns the grand vision of 11 with the concrete organizational genius of 4, creating conditions for achievements of genuinely significant scale and lasting impact. What you build this year can outlive you; what you organize this year can transform not just your life but the lives of those in your sphere. The universe is asking for your best and most disciplined effort in service of something larger than personal gain.',
    shadow: 'The shadow of a 22 year is the paralysis that comes from understanding the weight of the opportunity and feeling unable to do it justice. Begin, even imperfectly; the energy of 22 amplifies whatever you commit to building.',
    keywords: ['Visionary building', 'Large-scale work', 'Manifestation', 'Legacy', 'Discipline', 'Impact'],
  },
  33: {
    archetype: 'The Year of Service and Compassion',
    essence: 'A Personal Year 33 (rare) brings the concentrated energy of the Master Teacher to your annual cycle — a year when selfless service, compassion, and healing contributions to your community are not just possible but actively called for by the universe. This year may ask more of you than others, but what flows through you in a 33 year can genuinely transform those you serve. Lead with love, teach through example, and allow the extraordinary compassion available to you this year to move freely.',
    shadow: 'The shadow of a 33 year is the depletion of the one who gives without replenishing — ensure that practices of self-care and spiritual renewal are non-negotiable, or the year\'s gifts cannot be fully expressed.',
    keywords: ['Service', 'Compassion', 'Healing', 'Teaching', 'Community', 'Selfless love'],
  },
}

const expressionNumberInterpretations: Record<NumberKey, NumberInterpretation> = {
  1: {
    archetype: 'The Natural Leader',
    essence: 'Your name carries the vibration of self-determination and original creative force — the outward expression of your soul moves through the world as a pioneering intelligence that naturally assumes the front position. You project confidence, originality, and a quiet certainty that is difficult to ignore. People sense your self-directedness and often turn to you for leadership even when you haven\'t solicited it. Your talents express most fully when you are building something new, navigating uncharted territory, and trusting your own voice above the crowd\'s consensus.',
    shadow: 'The shadow of Expression 1 is the domineering personality that emerges when the pioneer\'s drive for self-determination crosses into the refusal to consider others\' perspectives. The strength of your expressiveness can silence those around you if you\'re not careful.',
    keywords: ['Leadership', 'Originality', 'Independence', 'Confidence', 'Initiative', 'Drive'],
  },
  2: {
    archetype: 'The Harmonizing Intelligence',
    essence: 'Your name carries the vibration of relational attunement — your outward expression moves through the world as an extraordinary sensitivity to others, a gift for cooperation, and a natural talent for bringing opposing forces into productive relationship. You express yourself most fully in partnership; your intelligence is relational rather than solitary, and your talents — whether in music, counseling, negotiation, or any collaborative art — shine brightest when they are woven into the fabric of a meaningful working relationship.',
    shadow: 'The shadow of Expression 2 is the self that gets lost in excessive accommodation — so skilled at reading and responding to others\' needs that the authentic voice beneath the diplomacy becomes inaudible, even to yourself.',
    keywords: ['Diplomacy', 'Cooperation', 'Partnership', 'Sensitivity', 'Artistry', 'Harmony'],
  },
  3: {
    archetype: 'The Creative Communicator',
    essence: 'Your name carries the vibration of inspired expression — your outward presence in the world is characterized by a natural verbal and artistic gift, a charm that draws people in effortlessly, and an ability to make complex things feel simple, serious things feel hopeful, and dull things feel alive. Words are your natural medium, but so are color, music, performance, and the full range of creative arts. At your best, you are a genuine artist of communication — someone whose expressiveness doesn\'t just entertain but genuinely illuminates.',
    shadow: 'The shadow of Expression 3 is the performance that substitutes for genuine depth — the entertainer who doesn\'t believe anyone wants to see them without the mask of wit and charm. Authentic expression requires the courage to be seen, not just admired.',
    keywords: ['Communication', 'Creativity', 'Charm', 'Artistic gifts', 'Expression', 'Joy', 'Inspiration'],
  },
  4: {
    archetype: 'The Reliable Builder',
    essence: 'Your name carries the vibration of practical mastery and unimpeachable reliability — your outward expression in the world is one of a person who gets things done, who understands systems and structures with intuitive precision, and whose presence projects a trustworthiness that others find genuinely grounding. You express your gifts best through sustained, disciplined effort — through work that requires patience, precision, and the courage to maintain quality standards even when speed would be easier. Others recognize in you a competence that is rare.',
    shadow: 'The shadow of Expression 4 is the rigid perfectionist who cannot allow the imperfect motion that good-enough-to-begin requires. The expression of 4 must find the balance between its natural standard of excellence and the generative value of completing imperfect work.',
    keywords: ['Reliability', 'Practicality', 'Discipline', 'Systems thinking', 'Precision', 'Trustworthiness'],
  },
  5: {
    archetype: 'The Dynamic Catalyst',
    essence: 'Your name carries the vibration of freedom and kinetic energy — your outward expression in the world is quicksilver and magnetic, generating excitement, curiosity, and motion wherever you go. You project versatility, vitality, and an infectious enthusiasm for experience that makes others want to join whatever adventure you\'re heading toward. Your talents shine in environments that reward adaptability and innovation — you are the one who can work across domains, translate between different worlds, and find the unexpected angle that transforms a problem into an opportunity.',
    shadow: 'The shadow of Expression 5 is the one who cannot commit long enough to develop real mastery — chasing the next stimulation before the current project reaches its full potential. The dynamism of 5 expression needs to be paired with a chosen field of genuine depth.',
    keywords: ['Versatility', 'Magnetism', 'Freedom', 'Innovation', 'Adaptability', 'Catalyst', 'Vitality'],
  },
  6: {
    archetype: 'The Loving Counselor',
    essence: 'Your name carries the vibration of responsibility, beauty, and the impulse to serve — your outward expression moves through the world as warmth, care, and an extraordinary gift for creating environments where people feel genuinely welcomed and valued. You project a quality of deep aesthetic appreciation and genuine concern for wellbeing that makes you naturally suited to any work that involves counseling, healing, teaching, design, or the cultivation of community. Your presence itself has a therapeutic quality; people feel better simply by being in your company.',
    shadow: 'The shadow of Expression 6 is the one who has turned their service into control — whose gift of care becomes a way of managing others rather than empowering them. The loving counselor must learn to give without attachment to how the gift is received or used.',
    keywords: ['Nurturing', 'Beauty', 'Service', 'Counseling', 'Responsibility', 'Community', 'Warmth'],
  },
  7: {
    archetype: 'The Deep Analyst',
    essence: 'Your name carries the vibration of penetrating intelligence and the hunger for truth — your outward expression in the world projects a quality of intellectual depth, quiet authority, and perceptive acuity that others find both compelling and occasionally unsettling. You see beneath surfaces, ask the questions others avoid, and bring a quality of genuine rigor to whatever you study. Your talents are most powerfully expressed in research, writing, philosophy, science, or any field that rewards the patient accumulation of genuine understanding over the quick acquisition of surface knowledge.',
    shadow: 'The shadow of Expression 7 is the one whose depth becomes detachment — so focused on the invisible that the visible world of relationship and embodied pleasure withers for lack of attention. The analyst must allow themselves to be known, not just to know.',
    keywords: ['Intelligence', 'Depth', 'Analysis', 'Wisdom', 'Perception', 'Research', 'Truth-seeking'],
  },
  8: {
    archetype: 'The Executive Power',
    essence: 'Your name carries the vibration of worldly authority and material intelligence — your outward expression in the world projects confidence, capability, and the unmistakable sense that you understand how things work and how to make them work better. You are naturally suited to executive roles, entrepreneurial endeavors, and any context that requires the combination of strategic vision and the practical capacity to mobilize resources, people, and effort in service of significant goals. Your authority is not assumed but earned — and it is real.',
    shadow: 'The shadow of Expression 8 is the one who has let the pursuit of achievement colonize all other dimensions of life — whose competence in the external world masks an interior that has grown impoverished for lack of cultivation.',
    keywords: ['Authority', 'Executive ability', 'Material intelligence', 'Ambition', 'Strategic vision', 'Power'],
  },
  9: {
    archetype: 'The Universal Soul',
    essence: 'Your name carries the vibration of the universal — your outward expression moves through the world as a quality of broad compassion, artistic depth, and philosophical generosity that people sense even before they know your history. You project wisdom and inclusion; people from wildly different backgrounds feel instinctively welcome in your presence. Your talents express most fully when they are placed in service of something beyond personal ambition — art that heals, leadership that uplifts, and work that contributes to the long arc of human dignity and understanding.',
    shadow: 'The shadow of Expression 9 is the one whose universal love has not yet learned to include the self — who can embrace all of humanity but cannot extend the same compassion to their own wounds and limitations.',
    keywords: ['Compassion', 'Universality', 'Artistic depth', 'Wisdom', 'Humanitarianism', 'Generosity', 'Inclusion'],
  },
  11: {
    archetype: 'The Illumined Channel',
    essence: 'Your name carries the Master vibration 11 — your outward expression in the world carries a quality of spiritual luminosity and inspirational power that can genuinely move and awaken others. People in your presence often feel seen in an unusually direct way; you project an intuitive perception that makes superficial interaction feel insufficient. Your gifts express most powerfully through any work that involves channeling insight, inspiration, or healing — through art that transcends ordinary beauty, or through teaching and leading that opens people to dimensions of themselves they had not previously accessed.',
    shadow: 'The shadow of Expression 11 is the sensitivity that overwhelms — the channel flooded with more than can be cleanly transmitted. Grounding practices and clear discernment about what to take on are the foundations that allow the 11\'s gifts to flow without burning out the vessel.',
    keywords: ['Illumination', 'Inspiration', 'Psychic gifts', 'Spiritual leadership', 'Vision', 'Channeling'],
  },
  22: {
    archetype: 'The Visionary Architect',
    essence: 'Your name carries the Master vibration 22 — your outward expression in the world projects a quality of practical wisdom and ambitious vision that is genuinely rare. You have the ability to see what could exist and to understand exactly what it would take to make it real; this combination of visionary capacity and organizational genius is the hallmark of the 22 expression. You are built for work of significant scale and lasting impact — the kind of contributions that don\'t just serve the present but create structures that serve the future.',
    shadow: 'The shadow of Expression 22 is the gap between the size of the vision and the willingness to begin imperfectly. The Master Builder must resist the paralysis of perfectionism and trust that every great structure starts with a single stone laid carefully.',
    keywords: ['Visionary architecture', 'Large-scale building', 'Practical wisdom', 'Impact', 'Organization', 'Legacy'],
  },
  33: {
    archetype: 'The Sacred Teacher',
    essence: 'Your name carries the Master vibration 33 — the rarest and most demanding expression number. Your outward presence in the world carries a quality of unconditional love and healing compassion that others sense even without understanding why they feel so safe and seen in your company. The 33 expression is called to embody its teachings rather than merely deliver them — to live with such integrity, generosity, and genuine care that the life itself becomes the lesson. You are here to serve, to heal, and to remind a world that has often forgotten what love actually looks like in action.',
    shadow: 'The shadow of Expression 33 is the depletion of one who pours out the sacred without replenishing the source. Even the most devoted servant cannot sustain a flame that has not been tended from within.',
    keywords: ['Sacred service', 'Compassion', 'Healing', 'Teaching by example', 'Unconditional love', 'Master expression'],
  },
}

const soulUrgeInterpretations: Record<NumberKey, NumberInterpretation> = {
  1: {
    archetype: '1 — The Sovereign Heart',
    essence: 'At the deepest level of your soul, you hunger to be wholly, unmistakably yourself — uncompromised and undiluted. Your innermost desire is not fame or recognition but authentic self-determination: the freedom to lead your own life from the inside out, trusting your own instincts as the final authority. You are secretly driven by a fierce need to be original, to forge something that could only have come from you, and to stand apart from the crowd not from arrogance but from a deeply felt allegiance to your own truth. This soul desire, when honored, produces remarkable courage and creative force.',
    shadow: 'The shadow of Soul Urge 1 is the hunger for dominance when the desire for self-determination goes unmet — needing to win in order to feel worthy. The soul learns that authentic sovereignty requires no conquest of others, only honest sovereignty of the self.',
    keywords: ['Autonomy', 'Originality', 'Self-determination', 'Courage', 'Inner authority'],
  },
  2: {
    archetype: '2 — The Gentle Heart',
    essence: 'What your soul most deeply desires is connection — not the surface variety, but the kind of profound, mutual understanding that makes two people feel genuinely known to each other. Behind everything you do runs a quiet longing for harmony, for the feeling that you and the people you love are woven together in something real and sustaining. Your inner world is exquisitely sensitive to emotional tone; dissonance disturbs you at a cellular level, and you are most alive when there is peace, tenderness, and genuine cooperation in your closest relationships. You have a secret gift for making others feel seen, and you receive this same seeing as the deepest possible gift.',
    shadow: "The shadow of Soul Urge 2 is the self that disappears in its desire for union — merging so completely with others' needs that one's own heart becomes inaudible. The soul's work is learning that true connection requires two distinct presences, not one dissolving into the other.",
    keywords: ['Union', 'Harmony', 'Sensitivity', 'Being known', 'Peace'],
  },
  3: {
    archetype: '3 — The Radiant Heart',
    essence: "Your soul's deepest desire is to express — to pour the full abundance of your inner life into the world through beauty, language, humor, and creative joy. You are inwardly driven by a need for delight, for the experience of being genuinely alive to the richness of existence, and for sharing that aliveness with others through some form of art or communication. There is a child-like creative hunger at the core of your soul that never tires of wondering, imagining, and making. At your most fulfilled, you are a fountain of inspired expression, giving the world something it would not have had without you.",
    shadow: 'The shadow of Soul Urge 3 is the creative soul that goes silent from fear of judgment — the one who hides the very gift the world most needs from them. The wound of 3 is believing that authentic expression is too much, too vulnerable, too exposed to be risked.',
    keywords: ['Creative joy', 'Expression', 'Delight', 'Beauty', 'Aliveness'],
  },
  4: {
    archetype: '4 — The Steadfast Heart',
    essence: 'What your soul most deeply desires is stability — not the stagnant kind, but the living, rooted stability of a life built on solid ground: clear values, genuine security, and meaningful, lasting work. You carry an inner hunger to build something real, to contribute something that will outlast the moment and give the people you love a foundation they can stand on. Your soul takes deep satisfaction in competence, in excellence, and in the quiet dignity of work done well. You are secretly sustained by the feeling that you are dependable — that your word is solid and your presence can be counted on.',
    shadow: 'The shadow of Soul Urge 4 is the one who mistakes rigidity for security — clinging so tightly to what has been built that growth and adaptation become impossible. The soul learns that the most enduring foundations are not inflexible but alive, responsive, and capable of revision.',
    keywords: ['Security', 'Lasting work', 'Dependability', 'Solid ground', 'Dignity'],
  },
  5: {
    archetype: '5 — The Wandering Heart',
    essence: 'At the root of your soul is an unquenchable hunger for freedom and experience — the desire to taste everything, to remain forever in motion, and to never let the walls close in. Your inner life is electric with curiosity; you are driven by a deep need to discover, to experiment, and to remain unconstrained by any single identity, role, or circumstance. The soul of 5 craves variety not from restlessness but from a genuine metaphysical conviction that life is meant to be lived in the full breadth of its possibility, and that too-early commitment is a form of spiritual death. At your highest, this hunger becomes genuine wisdom gathered from the full spectrum of human experience.',
    shadow: "The shadow of Soul Urge 5 is the one who confuses perpetual motion with freedom, who flees commitment before roots can form and depth can develop. The soul's deepest freedom is ultimately chosen, not escaped into.",
    keywords: ['Freedom', 'Experience', 'Exploration', 'Curiosity', 'Motion'],
  },
  6: {
    archetype: '6 — The Devoted Heart',
    essence: "Your soul's deepest desire is to love and be loved in the fullness of that word — to create a life of genuine beauty, warmth, and care, and to give yourself to the people and places and ideals that you have chosen to call your own. You are driven inwardly by a need to be of real use: to see that your presence in someone's life has made a tangible difference, that your care has healed something or made someone feel genuinely held. There is an artist's soul beneath your nurturing impulse — a sensitivity to beauty, to harmony, to the quality of the spaces you inhabit and the relationships you tend. Your highest fulfillment arrives when love and craft and service merge into one.",
    shadow: 'The shadow of Soul Urge 6 is the one who gives compulsively and then resents the very people they insisted on helping without being asked. The soul learns that love given from need is not the same as love given from abundance.',
    keywords: ['Love', 'Beauty', 'Service', 'Care', 'Belonging'],
  },
  7: {
    archetype: '7 — The Seeking Heart',
    essence: 'What your soul most deeply desires is truth — not the agreed-upon kind, but the hidden, deep-structure truth that hides beneath the surface of appearances and can only be reached through sustained solitude, contemplation, and the willingness to ask questions that have no comfortable answers. You are inwardly driven by a hunger to understand — the universe, the nature of consciousness, the deeper meaning of your own life and the lives of those around you. Your inner world is your primary domain; the quality of your inner life is the measure of your wealth. At the deepest level, you are a seeker, and the seeking itself — conducted with rigor and genuine humility — is your truest form of devotion.',
    shadow: 'The shadow of Soul Urge 7 is the seeker who substitutes knowing for feeling — who retreats so completely into the mind that the warmth of genuine intimacy becomes inaccessible. The soul eventually discovers that the deepest truth is found not only in solitude but in the mystery of genuine connection.',
    keywords: ['Truth', 'Understanding', 'Solitude', 'Mystery', 'Inner life'],
  },
  8: {
    archetype: '8 — The Masterful Heart',
    essence: "Your soul's deepest desire is mastery — the genuine, hard-won kind that comes from sustained effort, integrity, and the willingness to take on consequential challenges. You are driven inwardly by a need to matter in the real world: to create, achieve, and steward things of actual significance. At your core, you hunger not merely for success but for the kind of authority that is earned rather than assumed — the authority that comes from genuine competence, wisdom, and the courage to make consequential decisions with integrity. Your soul is most alive when it is engaged with something large, real, and genuinely demanding.",
    shadow: 'The shadow of Soul Urge 8 is the one who has equated worth with power and lost touch with the deeper satisfaction that mastery was always meant to serve. The soul learns that the true harvest of all its striving is wisdom, not merely accumulation.',
    keywords: ['Mastery', 'Achievement', 'Authority', 'Significance', 'Integrity'],
  },
  9: {
    archetype: '9 — The Universal Heart',
    essence: 'At the deepest level of your soul, you carry a love that wants to include everyone — a hunger not for personal satisfaction alone but for the healing and uplift of something larger than yourself. You are inwardly driven by a need for meaning that transcends the merely personal: a life that contributes to the long arc of human dignity, that adds beauty or wisdom or compassion to a world that is always in need of more of all three. Your soul carries the accumulated depth of many cycles of experience, and what you most deeply desire is to give that depth away — to pour it into art, into service, into relationships of genuine, unconditional love.',
    shadow: 'The shadow of Soul Urge 9 is the one whose universal love has become a way of avoiding the vulnerability of personal love — who loves humanity in the abstract but cannot bear to be loved as a specific, imperfect person. The soul learns that universal love must begin, not end, with the self.',
    keywords: ['Universal love', 'Meaning', 'Giving', 'Compassion', 'Transcendence'],
  },
  11: {
    archetype: '11 — The Illuminated Heart',
    essence: "Your soul's deepest desire is illumination — a profound, lived experience of the connection between all things, and the ability to transmit that knowing in ways that genuinely awaken others. You are inwardly driven by a hunger for the sacred: for experiences of beauty, insight, and spiritual contact that confirm that this life is more than what it appears on the surface. Your soul carries a visionary sensitivity that picks up on frequencies most people cannot access, and at its deepest level, it longs not merely to perceive these frequencies but to become a clear, trustworthy channel through which they can flow into the world for the benefit of others.",
    shadow: 'The shadow of Soul Urge 11 is the sensitivity that becomes a burden — the one whose inner world is so vast and so charged that ordinary life feels unbearable by comparison, and who uses their spiritual gifts as a reason for remaining unavailable to the earthly work of love and relationship.',
    keywords: ['Illumination', 'Spiritual contact', 'Vision', 'Transmission', 'Sacred beauty'],
  },
  22: {
    archetype: '22 — The Architect Heart',
    essence: 'What your soul most deeply desires is to build — not merely to dream or to envision, but to translate vision into form of genuinely significant scale and lasting impact. You are inwardly driven by a hunger to create things that are real, enduring, and genuinely useful to the world: systems, structures, communities, works of art or enterprise whose impact extends far beyond the personal. The soul of 22 carries both the visionary capacity of the master and the practical genius of the builder, and its deepest satisfaction arrives when those two capacities are working in full collaboration — when something that seemed impossible has been made unquestionably real.',
    shadow: 'The shadow of Soul Urge 22 is the architect who never breaks ground — paralyzed by the gap between the magnitude of the vision and the humility required to begin with a single imperfect stone. The soul learns that the greatest structures in history were all begun by someone who was not yet ready.',
    keywords: ['Building', 'Legacy', 'Vision made real', 'Scale', 'Impact'],
  },
  33: {
    archetype: '33 — The Compassionate Heart',
    essence: "Your soul's deepest desire is to be a living expression of unconditional love — not as an idea or an aspiration, but as the actual quality of your presence in the world. You are inwardly driven by a longing to heal, to uplift, and to serve as a vessel through which something genuinely sacred can flow into the lives of others. At the core of your soul is a conviction — sometimes felt before it is understood — that love is the fundamental substance of all things, and that your work in this lifetime is to embody that truth as completely as humanly possible. When you are living in alignment, your very presence has a therapeutic quality that others feel without being able to name.",
    shadow: 'The shadow of Soul Urge 33 is the saint who has forgotten they are also human — who gives with such completeness that the self is extinguished rather than transformed. The soul learns that the fire of compassion must be continually renewed from within, or it will burn the one who tends it.',
    keywords: ['Unconditional love', 'Healing', 'Sacred service', 'Compassion', 'Living truth'],
  },
}

const karmicDebtInterpretations: Record<KarmicDebtKey, NumberInterpretation> = {
  13: {
    archetype: '13 — The Debt of Transformation',
    essence: 'Karmic Debt 13 carries the weight of lifetimes in which effort was avoided, shortcuts were taken, and the discipline required to build something of lasting value was consistently refused. The soul arrives in this life with a deep karmic obligation: to learn, through direct and sometimes uncompromising experience, that meaningful achievement cannot be borrowed, inherited, or circumvented — it must be earned through sustained, patient, and often unglamorous work. Life with Karmic Debt 13 tends to repeat a pattern: when shortcuts are attempted, they collapse; when the work is done faithfully and completely, the ground becomes solid beneath the feet. The number 13 does not punish — it teaches, with the kind of precision that only comes from long experience with what the soul has refused to learn.',
    shadow: 'If the lessons of Karmic Debt 13 are ignored — if the pattern of avoidance continues in this lifetime — the soul will encounter the same collapses in more concentrated form, until the only path forward is the disciplined one. The debt is not discharged by suffering; it is discharged by choosing, again and again, the harder and more honest path.',
    keywords: ['Discipline', 'Earned effort', 'Transformation through work', 'Karmic pattern', 'Integrity'],
  },
  14: {
    archetype: '14 — The Debt of Freedom',
    essence: "Karmic Debt 14 originates in past-life patterns of misused freedom — excessive indulgence, the abuse of others' freedom, or a reckless surrender to sensation and appetite that accumulated consequences the soul was not willing to face. In this lifetime, the soul is called to discover what freedom truly means: not the freedom from constraint, but the freedom that comes from genuine self-mastery and the conscious, courageous choice to act with integrity even when no one is watching. Life with Karmic Debt 14 tends to involve recurring encounters with excess, addiction, instability, or the consequences of others' unexamined choices — not as punishment, but as the precise mirror of the soul's own unfinished work.",
    shadow: 'The path that does not honor Karmic Debt 14 leads to escalating cycles of excess and consequence, each loop tighter than the last, until the soul recognizes that the freedom it has been seeking outwardly can only be found inwardly. The debt is discharged through the practice of moderation, accountability, and the patient building of a life grounded in chosen values.',
    keywords: ['Moderation', 'Self-mastery', 'True freedom', 'Accountability', 'Conscious choice'],
  },
  16: {
    archetype: '16 — The Debt of Ego',
    essence: 'Karmic Debt 16 carries one of the heaviest of soul-level patterns: the residue of lives lived in pride, in the misuse of love and power, in the construction of identities and achievements that served the ego rather than the spirit. The soul that carries this debt arrives in this life with something that will eventually fall — not because it is being punished, but because the ego-structures that were built in prior lifetimes must be cleared to make room for the authentic self that lives beneath them. When the fall comes — and it tends to come — it is an invitation, not an ending: the invitation to rebuild from a foundation of genuine humility, authentic love, and service that does not require recognition.',
    shadow: 'The soul that resists the humbling that Karmic Debt 16 requires — that clings to pride, to the false self, to constructed superiority — will find that life dismantles what it has built with increasing frequency and force. The debt is discharged not through loss, but through what is chosen after the loss: the decision to build, this time, from the inside out.',
    keywords: ['Humility', 'Authentic self', 'Surrender of ego', 'Rebuilding', 'Soul-level reckoning'],
  },
  19: {
    archetype: '19 — The Debt of Self-Sufficiency',
    essence: 'Karmic Debt 19 arises from past-life patterns of radical self-centeredness — the misuse of power and intelligence in service of the self alone, without genuine regard for the needs, freedom, or dignity of others. In this lifetime, the soul is called to learn the deep interdependence of all living things: that genuine strength is not independence from others, but the wisdom to know when to ask, when to receive, and how to hold power with care for the collective good. Life with Karmic Debt 19 frequently presents situations that force the soul to depend on others, to be vulnerable, and to discover that receiving with grace is its own form of courage and its own expression of strength.',
    shadow: 'The soul that refuses the lessons of Karmic Debt 19 — that continues to use power and intelligence in the service of the self alone — will find itself increasingly isolated, its strength becoming a cage rather than a gift. The debt is discharged through the genuine, practiced recognition that the self is not an island but a thread in an irreducibly shared fabric.',
    keywords: ['Interdependence', 'Receiving', 'Shared power', 'Humility in strength', 'Collective wisdom'],
  },
}

const personalMonthInterpretations: Record<NumberKey, NumberInterpretation> = {
  1: {
    archetype: 'Personal Month 1',
    essence: 'This month carries the energy of fresh starts and new initiatives — it is the ideal time to begin something you have been delaying, to take the first step toward a direction that matters to you, or to assert yourself with renewed clarity. Act from your own authority this month; the universe is particularly receptive to bold, intentional beginnings.',
    shadow: '',
    keywords: [],
  },
  2: {
    archetype: 'Personal Month 2',
    essence: 'This month asks for patience and attunement — it is less about pushing forward than about listening carefully, attending to the quality of your relationships, and allowing things to unfold at their own pace. Cooperation and sensitivity are your assets this month; partnership and quiet receptivity will yield more than force.',
    shadow: '',
    keywords: [],
  },
  3: {
    archetype: 'Personal Month 3',
    essence: 'This is a month for creative expression, social connection, and allowing yourself to enjoy life with less urgency. Communication flows more easily now — say the things you have been holding back, create for the pleasure of creating, and give yourself permission to play. The energy of 3 rewards lightness and authentic self-expression.',
    shadow: '',
    keywords: [],
  },
  4: {
    archetype: 'Personal Month 4',
    essence: 'This month calls for focus, discipline, and the patient completion of work that matters. It is not a glamorous month, but it is a productive one — the things you build carefully now will hold. Attend to health, organization, and the foundations beneath the areas of life you care most about.',
    shadow: '',
    keywords: [],
  },
  5: {
    archetype: 'Personal Month 5',
    essence: 'This month brings movement, change, and the unexpected — hold your plans loosely and be ready to adapt. New experiences, encounters, and opportunities may arrive from surprising directions; the energy of 5 rewards flexibility and the willingness to step outside familiar patterns. Resist the urge to over-control.',
    shadow: '',
    keywords: [],
  },
  6: {
    archetype: 'Personal Month 6',
    essence: 'This month brings the energy of responsibility, love, and care to the foreground — it is a time to tend to your closest relationships, to attend to home and family, and to show up for the people who depend on you. Service given freely this month is especially meaningful; beauty and harmony in your environment will also lift your energy considerably.',
    shadow: '',
    keywords: [],
  },
  7: {
    archetype: 'Personal Month 7',
    essence: 'This is a month for inner work, study, and the kind of reflective solitude that allows deeper understanding to surface. Avoid forcing outcomes; the insight you need is more likely to arrive through contemplation than through action. Trust the quiet knowing that emerges when you give yourself space to think.',
    shadow: '',
    keywords: [],
  },
  8: {
    archetype: 'Personal Month 8',
    essence: 'This month activates the energy of manifestation, material focus, and consequential decisions — it is a good time to attend to career, finances, and any area where you have been building toward a tangible result. Act with integrity and confidence; the energy of 8 responds to effort made with clear intention and honest dealing.',
    shadow: '',
    keywords: [],
  },
  9: {
    archetype: 'Personal Month 9',
    essence: 'This month calls for completion, release, and the conscious clearing of what no longer belongs in your life. Let go of what has run its course — relationships, projects, attitudes, and stories that have served their purpose. What you release with grace now creates genuine space for what is coming.',
    shadow: '',
    keywords: [],
  },
  11: {
    archetype: 'Personal Month 11',
    essence: 'This is a month of heightened intuition and spiritual sensitivity — pay close attention to your inner knowing, to dreams, and to the synchronicities that arise. Inspired insights are available to you now with unusual clarity; trust what arrives through quiet awareness rather than striving. Ground yourself regularly to remain a clear channel.',
    shadow: '',
    keywords: [],
  },
  22: {
    archetype: 'Personal Month 22',
    essence: 'This month carries an unusually powerful building energy — what you organize, commit to, or launch now has the potential for significant and lasting impact. Think bigger than comfort allows, then begin anyway. The Master Builder energy rewards ambition paired with patient, methodical follow-through.',
    shadow: '',
    keywords: [],
  },
  33: {
    archetype: 'Personal Month 33',
    essence: 'This is a month when acts of selfless service and compassion carry unusual resonance — your care for others is amplified, and the love you give will move in circles beyond what you can see. Lead from the heart this month; genuine kindness is the most powerful thing you can offer.',
    shadow: '',
    keywords: [],
  },
}

const personalDayInterpretations: Record<NumberKey, NumberInterpretation> = {
  1: {
    archetype: 'The Pioneer',
    essence: 'Today\'s energy supports bold action and fresh starts. This is an excellent day to take the first step on something you have been considering, to assert your independence, or to make a decision that has been waiting. Trust your instincts and move with clarity of purpose.',
    shadow: 'Watch for impulsiveness — the energy of 1 can push toward action before adequate reflection. Boldness is different from recklessness; choose the direction consciously before moving.',
    keywords: ['Initiative', 'New starts', 'Independence', 'Action'],
  },
  2: {
    archetype: 'The Peacemaker',
    essence: 'Today calls for patience, listening, and attunement to others. This is not the day to force outcomes but to notice the subtle cues in your relationships and surroundings. Collaboration and quiet receptivity will yield more than solo effort today.',
    shadow: 'Beware of over-accommodation — in trying to keep peace, don\'t silence your own genuine needs. Sensitivity is a gift today; losing yourself in it is not.',
    keywords: ['Receptivity', 'Cooperation', 'Listening', 'Partnership'],
  },
  3: {
    archetype: 'The Communicator',
    essence: 'Today\'s energy is bright with creative and communicative potential. Share your ideas, connect with people who energize you, and allow yourself the pleasure of authentic expression without forcing it toward a specific outcome. Spontaneity is favored over rigid plans.',
    shadow: 'The energy of 3 can scatter across too many conversations and creative impulses. Choose one channel for your expressiveness and give it something real.',
    keywords: ['Expression', 'Creativity', 'Connection', 'Joy'],
  },
  4: {
    archetype: 'The Builder',
    essence: 'Today supports focused, practical effort and the disciplined completion of important work. Choose one priority and give it your full attention rather than scattering across many fronts. The care you bring to your work today will produce tangible and lasting results.',
    shadow: 'The 4 energy can make today feel heavy if you resist the necessary discipline. Lean in rather than away; the satisfaction of solid work is available today.',
    keywords: ['Focus', 'Discipline', 'Work', 'Foundation'],
  },
  5: {
    archetype: 'The Explorer',
    essence: 'Today brings unexpected energy and the invitation to step outside your usual patterns. Stay flexible — what you planned may shift, and what arrives instead may be more valuable. Embrace the unplanned with curiosity rather than resistance.',
    shadow: 'The restlessness of 5 can lead to abandoning something that deserves completion in favor of whatever is new. Notice when you\'re genuinely exploring versus simply escaping.',
    keywords: ['Change', 'Flexibility', 'Adventure', 'Spontaneity'],
  },
  6: {
    archetype: 'The Nurturer',
    essence: 'Today\'s energy centers on connection, responsibility, and the people you love. Acts of genuine care expressed simply and without expectation carry special resonance today. Attend to home, family, or anything that asks for your nurturing presence.',
    shadow: 'Over-giving is the shadow of 6 energy — ensure your care today comes from abundance rather than obligation, or resentment will quietly follow.',
    keywords: ['Care', 'Family', 'Responsibility', 'Harmony'],
  },
  7: {
    archetype: 'The Seeker',
    essence: 'Today favors quiet contemplation, inner attunement, and the patient pursuit of genuine understanding. Step back from noise and activity when you can; the insight you\'ve been seeking is more likely to arrive in stillness than in motion today.',
    shadow: 'The 7 energy can create a tendency to over-analyze or withdraw so completely that connection and presence suffer. Seek depth without disappearing.',
    keywords: ['Reflection', 'Solitude', 'Insight', 'Contemplation'],
  },
  8: {
    archetype: 'The Powerhouse',
    essence: 'Today supports ambition, decisive action, and engagement with the material dimensions of life — career, finances, and consequential decisions. Act with confidence and integrity; the energy of 8 rewards clear intention aligned with honest dealing.',
    shadow: 'The drive of 8 can blur into tunnel vision — watch that ambition today doesn\'t sacrifice the relationships or self-care that give achievement its meaning.',
    keywords: ['Power', 'Achievement', 'Decisiveness', 'Manifestation'],
  },
  9: {
    archetype: 'The Sage',
    essence: 'Today\'s energy calls for finishing what has been started and releasing what is no longer needed. Clear an old obligation, conclude an unfinished conversation, or consciously let go of a thought pattern that has run its course. Create space.',
    shadow: 'The resistance to completion can make a 9 day feel depleting rather than freeing. Trust that releasing genuinely creates room for what\'s next.',
    keywords: ['Completion', 'Release', 'Letting go', 'Endings'],
  },
  11: {
    archetype: 'The Illuminator',
    essence: 'Today carries heightened intuitive charge — your inner knowing is unusually clear and your sensitivity amplified. Pay close attention to the thoughts, dreams, and synchronicities that arise; they are more than coincidental. Ground yourself before engaging with high-intensity situations.',
    shadow: 'The sensitivity of 11 can become overwhelm without grounding practices. Protect your nervous system today while staying open to the insights that are genuinely available.',
    keywords: ['Intuition', 'Inspiration', 'Sensitivity', 'Illumination'],
  },
  22: {
    archetype: 'The Master Builder',
    essence: 'Today\'s energy carries an unusual combination of visionary capacity and practical power — what you focus on building today can have lasting and significant impact. Think in terms of legacy rather than immediate gain. Begin or substantially advance something that truly matters.',
    shadow: 'The weight of the 22 day can trigger paralysis in the face of its own potential. Begin imperfectly; what you start with integrity today can be refined in the days that follow.',
    keywords: ['Vision', 'Building', 'Impact', 'Mastery'],
  },
  33: {
    archetype: 'The Master Healer',
    essence: 'Today the energy of compassion and healing is especially strong — your care for others carries amplified quality today, and genuine acts of kindness will ripple further than you can see. Lead with love; the simplest offering from the heart carries unusual power.',
    shadow: 'Even on a day of exceptional compassion, you cannot pour from an empty vessel. Tend to your own center first, so what you offer to others comes from fullness rather than sacrifice.',
    keywords: ['Compassion', 'Service', 'Healing', 'Love'],
  },
}

export function getInterpretation(category: NumerologyCategory, number: number): NumberInterpretation | null {
  if (category === 'karmicDebt') {
    const validKarmicKeys: KarmicDebtKey[] = [13, 14, 16, 19]
    if (!validKarmicKeys.includes(number as KarmicDebtKey)) return null
    return karmicDebtInterpretations[number as KarmicDebtKey]
  }

  const validKeys: NumberKey[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]
  if (!validKeys.includes(number as NumberKey)) return null

  const key = number as NumberKey

  switch (category) {
    case 'lifePath': return lifePathInterpretations[key]
    case 'birthdayNumber': return birthdayNumberInterpretations[key]
    case 'personalYear': return personalYearInterpretations[key]
    case 'expressionNumber': return expressionNumberInterpretations[key]
    case 'soulUrge': return soulUrgeInterpretations[key]
    case 'personalMonth': return personalMonthInterpretations[key]
    case 'personalDay': return personalDayInterpretations[key]
  }
}
