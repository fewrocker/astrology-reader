export interface NumberInterpretation {
  archetype: string
  essence: string
  shadow: string
  keywords: string[]
}

export type NumerologyCategory = 'lifePath' | 'birthdayNumber' | 'personalYear' | 'expressionNumber'

export type NumberKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33

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

export function getInterpretation(category: NumerologyCategory, number: number): NumberInterpretation | null {
  const validKeys: NumberKey[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]
  if (!validKeys.includes(number as NumberKey)) return null

  const key = number as NumberKey

  switch (category) {
    case 'lifePath': return lifePathInterpretations[key]
    case 'birthdayNumber': return birthdayNumberInterpretations[key]
    case 'personalYear': return personalYearInterpretations[key]
    case 'expressionNumber': return expressionNumberInterpretations[key]
  }
}
