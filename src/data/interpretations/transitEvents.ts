import type { AspectType } from '../../engine/aspects'
import type { PlanetName } from '../../engine/types'

// ─── Aspect perfection brief interpretations ────────────────────────────────

const ASPECT_BRIEFS: Record<AspectType, Record<string, string>> = {
  conjunction: {
    default: 'Merged energy — intensity, new beginnings, powerful focus',
    Sun: 'Identity and purpose amplified',
    Moon: 'Emotions fused with transit energy',
    Mercury: 'Thinking infused with new influence',
    Venus: 'Love and values highlighted',
    Mars: 'Drive and action supercharged',
    Jupiter: 'Expansion and opportunity activated',
    Saturn: 'Structure and discipline demanded',
    Uranus: 'Sudden awakening or disruption',
    Neptune: 'Spiritual sensitivity heightened',
    Pluto: 'Deep transformation triggered',
  },
  sextile: {
    default: 'Opportunity flows — take action to benefit',
    Sun: 'Easy self-expression, supportive connections',
    Moon: 'Emotional ease and natural flow',
    Mercury: 'Smooth communication, helpful ideas',
    Venus: 'Social harmony, creative openings',
    Mars: 'Productive energy, effective action',
    Jupiter: 'Lucky breaks, growth opportunities',
    Saturn: 'Steady progress, practical support',
    Uranus: 'Inspiring insights, welcome changes',
    Neptune: 'Intuitive guidance, creative flow',
    Pluto: 'Empowering connections, subtle transformation',
  },
  square: {
    default: 'Tension demands action — growth through challenge',
    Sun: 'Identity crisis or ego friction',
    Moon: 'Emotional stress, internal conflict',
    Mercury: 'Miscommunication, mental pressure',
    Venus: 'Relationship tension, value conflicts',
    Mars: 'Frustration, conflict, impulsive energy',
    Jupiter: 'Excess, overcommitment, faith tested',
    Saturn: 'Restrictions, delays, responsibility weighs heavy',
    Uranus: 'Disruption, restlessness, need for freedom',
    Neptune: 'Confusion, disillusionment, unclear boundaries',
    Pluto: 'Power struggles, compulsive drives',
  },
  trine: {
    default: 'Harmonious flow — natural ease and talent activated',
    Sun: 'Confidence and vitality boosted',
    Moon: 'Emotional comfort and security',
    Mercury: 'Clear thinking, effortless communication',
    Venus: 'Love flows easily, beauty and pleasure',
    Mars: 'Smooth assertion, physical vitality',
    Jupiter: 'Good fortune, generosity, growth',
    Saturn: 'Solid foundations, earned rewards',
    Uranus: 'Exciting positive changes, innovation',
    Neptune: 'Spiritual insight, creative inspiration',
    Pluto: 'Empowerment, regeneration, deep flow',
  },
  opposition: {
    default: 'Awareness through polarity — relationship mirrors',
    Sun: 'Others challenge your identity',
    Moon: 'Emotional polarization, relationship needs',
    Mercury: 'Opposing viewpoints, negotiation required',
    Venus: 'Relationship dynamics highlighted',
    Mars: 'Direct confrontation, projection',
    Jupiter: 'Over-promising, ideological clashes',
    Saturn: 'Authority confrontation, boundary testing',
    Uranus: 'Independence vs. connection standoff',
    Neptune: 'Projections exposed, boundary dissolution',
    Pluto: 'Power dynamics reach a climax',
  },
  'semi-sextile': {
    default: 'Gentle adjustment — subtle awareness shift',
    Sun: 'Minor course corrections',
    Moon: 'Slight emotional recalibration',
  },
  quincunx: {
    default: 'Awkward tension — adjustment without obvious resolution',
    Sun: 'Identity requires uncomfortable adaptation',
    Moon: 'Emotional unease, something feels off',
    Mercury: 'Mental disconnect that needs bridging',
    Venus: 'Values require realignment',
    Mars: 'Energy misdirected, needs recalibration',
    Jupiter: 'Growth blocked by mismatched expectations',
    Saturn: 'Structural adjustment under stress',
    Uranus: 'Change forced in unexpected direction',
    Neptune: 'Confusion that can\'t be ignored',
    Pluto: 'Transformation through discomfort',
  },
}

// ─── House-aware brief table ─────────────────────────────────────────────────
// Keys: `${aspectType}_${natalPlanet}_H${house}` (e.g. "trine_Venus_H2")
// Coverage: Sun, Moon, Mercury, Venus, Mars × conjunction/sextile/square/trine/opposition × H1–H12

const HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE: Record<string, string> = {
  // ── Sun conjunctions ────────────────────────────────────────────────────────
  'conjunction_Sun_H1': 'Identity and presence are supercharged — how you show up matters deeply right now.',
  'conjunction_Sun_H2': 'Focus lands on money and self-worth — what you earn and what you value feel urgent.',
  'conjunction_Sun_H3': 'Your voice and mind are at full power — an ideal time to write, speak, or learn.',
  'conjunction_Sun_H4': 'Home and family life intensify — roots, lineage, and private matters move center stage.',
  'conjunction_Sun_H5': 'Creative energy and playful confidence ignite — romance and self-expression peak.',
  'conjunction_Sun_H6': 'Work and wellbeing are in sharp focus — daily habits and service feel activated.',
  'conjunction_Sun_H7': 'A key relationship takes all your attention — partnerships are in the spotlight.',
  'conjunction_Sun_H8': 'Deep transformation, shared finances, or intimacy become the central theme today.',
  'conjunction_Sun_H9': 'Big-picture thinking and a desire for meaning or travel are strongly activated.',
  'conjunction_Sun_H10': 'Career, reputation, and public identity are energized — your ambitions feel urgent.',
  'conjunction_Sun_H11': 'Community, friendships, and future goals receive a surge of focused energy.',
  'conjunction_Sun_H12': 'Inner life, solitude, and hidden strengths are activated — a time for reflection.',

  // ── Sun sextiles ─────────────────────────────────────────────────────────────
  'sextile_Sun_H1': 'Confidence flows naturally — a good day to put yourself forward in a new setting.',
  'sextile_Sun_H2': 'Easy opportunities around income or purchases open up — act on a financial opening.',
  'sextile_Sun_H3': 'Conversations and short errands go smoothly — ideas find a receptive audience.',
  'sextile_Sun_H4': 'Family interactions feel supportive — a good day for home-related plans or repairs.',
  'sextile_Sun_H5': 'Creative projects and light romance get a pleasant boost — enjoy what brings you joy.',
  'sextile_Sun_H6': 'Work tasks click into place — efficiency and cooperation come easily at the office.',
  'sextile_Sun_H7': 'A partner or collaborator is helpful and warm — good day to reach out or negotiate.',
  'sextile_Sun_H8': 'Shared resources or intimate conversations flow more easily than usual.',
  'sextile_Sun_H9': 'Learning, travel planning, or philosophical conversations open new doors.',
  'sextile_Sun_H10': 'Career progress gets a gentle nudge — a good day to pitch an idea to someone in authority.',
  'sextile_Sun_H11': 'Social networks and group activities feel rewarding — community connections open up.',
  'sextile_Sun_H12': 'Solitude and inner work feel productive — creative or spiritual insights flow easily.',

  // ── Sun squares ──────────────────────────────────────────────────────────────
  'square_Sun_H1': 'Your sense of self meets friction — resist the urge to over-assert or shrink back.',
  'square_Sun_H2': 'Financial pressure or a conflict over values asks you to clarify what really matters.',
  'square_Sun_H3': 'Communication snags or sibling tension surfaces — choose words carefully.',
  'square_Sun_H4': 'Home stress or a family disagreement demands attention — give it honestly.',
  'square_Sun_H5': 'Creative blocks or romantic tension press you to examine what you truly want.',
  'square_Sun_H6': 'Work overload or health strain is asking you to reassess your daily habits.',
  'square_Sun_H7': 'A close relationship reaches a tension point — honest conversation is the way forward.',
  'square_Sun_H8': 'Financial entanglements or emotional intensity require direct handling today.',
  'square_Sun_H9': 'Rigid beliefs or a travel complication challenges your bigger plan — stay flexible.',
  'square_Sun_H10': 'Career ambition meets a setback or authority clash — patience and persistence pay off.',
  'square_Sun_H11': 'Group dynamics or a friendship conflict tests your sense of belonging.',
  'square_Sun_H12': 'Hidden anxieties or self-defeating patterns surface — face them rather than avoid them.',

  // ── Sun trines ───────────────────────────────────────────────────────────────
  'trine_Sun_H1': 'Vitality and confidence flow freely — your natural charisma is at its best today.',
  'trine_Sun_H2': 'Abundance and self-worth feel aligned — a good day to invest in yourself.',
  'trine_Sun_H3': 'Clear thinking and easy conversation make this ideal for writing, teaching, or negotiating.',
  'trine_Sun_H4': 'Family bonds feel warm and stable — a lovely time for domestic projects or gatherings.',
  'trine_Sun_H5': 'Joy and creative expression come naturally — romance and playfulness are well-starred.',
  'trine_Sun_H6': 'Work and health routines hum along — productivity and wellness feel effortless.',
  'trine_Sun_H7': 'Partnerships flow with ease and goodwill — an excellent day for agreements or dates.',
  'trine_Sun_H8': 'Shared resources or deep emotional connections feel supported and regenerative.',
  'trine_Sun_H9': 'Inspiration and broad perspective arrive easily — travel or study plans take shape.',
  'trine_Sun_H10': 'Career efforts are recognized and rewarded — take a visible step toward your goals.',
  'trine_Sun_H11': 'Friendships and collective goals feel fulfilling — your network is a genuine asset today.',
  'trine_Sun_H12': 'Spiritual clarity and inner peace flow in — meditation, art, or quiet time is deeply restorative.',

  // ── Sun oppositions ──────────────────────────────────────────────────────────
  'opposition_Sun_H1': "Someone else's energy or opinion challenges your sense of self — stay grounded.",
  'opposition_Sun_H2': 'A financial or value clash with another person asks for honest negotiation.',
  'opposition_Sun_H3': 'An opposing view in conversation or from a sibling demands you listen and reflect.',
  'opposition_Sun_H4': 'Home or family expectations conflict with your outer commitments — find balance.',
  'opposition_Sun_H5': "A creative or romantic tension reveals what you've been suppressing — acknowledge it.",
  'opposition_Sun_H6': 'Work duties and personal needs pull in opposite directions — reclaim some balance.',
  'opposition_Sun_H7': 'A partnership places demands on your identity — the other person is holding up a mirror.',
  'opposition_Sun_H8': 'Power dynamics or shared-resource tensions surface — clarity and honesty are needed.',
  'opposition_Sun_H9': 'Someone challenges your beliefs or long-term vision — use it to sharpen your thinking.',
  'opposition_Sun_H10': 'Public demands or authority pressure tests your career direction — hold your ground thoughtfully.',
  'opposition_Sun_H11': 'Group expectations conflict with your individual goals — find the middle path.',
  'opposition_Sun_H12': 'Hidden fears or unresolved patterns are reflected back by the world — sit with them.',

  // ── Moon conjunctions ────────────────────────────────────────────────────────
  'conjunction_Moon_H1': 'Emotions and instincts are right at the surface — your reactions are strong and immediate.',
  'conjunction_Moon_H2': 'Feelings about money and security are intense — notice what triggers financial anxiety.',
  'conjunction_Moon_H3': 'Emotional conversations with siblings or neighbors feel significant and heartfelt.',
  'conjunction_Moon_H4': 'Deep feelings about home and family are stirred — nurture your roots and inner life.',
  'conjunction_Moon_H5': 'Emotional creativity and romantic feelings are heightened — let yourself play.',
  'conjunction_Moon_H6': 'Feelings about your work and daily health are front and center — listen to your body.',
  'conjunction_Moon_H7': 'Emotional needs within a close relationship are activated — speak from the heart.',
  'conjunction_Moon_H8': 'Deep emotional currents and intimacy are stirred — trust the process.',
  'conjunction_Moon_H9': 'A longing for meaning, travel, or spiritual connection feels emotionally compelling.',
  'conjunction_Moon_H10': 'Public life and career stir up emotions — your feelings about success come into view.',
  'conjunction_Moon_H11': 'Belonging and friendship feel emotionally important — reach out to your community.',
  'conjunction_Moon_H12': 'Hidden feelings and unconscious patterns surface — journaling or solitude helps.',

  // ── Moon sextiles ────────────────────────────────────────────────────────────
  'sextile_Moon_H1': 'Emotional ease allows you to present yourself authentically — first impressions land well.',
  'sextile_Moon_H2': 'A comfortable sense of security makes it easy to address financial matters calmly.',
  'sextile_Moon_H3': 'Warm, natural conversations flow — a good time to reach out to people nearby.',
  'sextile_Moon_H4': 'Home and family feel harmonious — an easy day for domestic tasks or family calls.',
  'sextile_Moon_H5': 'Playful emotions and mild romance get a pleasant boost — enjoy a creative outlet.',
  'sextile_Moon_H6': 'Your emotional state and your work habits align — productivity feels natural today.',
  'sextile_Moon_H7': 'Emotional rapport with a partner or close ally comes easily — a good day to connect.',
  'sextile_Moon_H8': 'Emotional depth and shared vulnerability feel approachable rather than overwhelming.',
  'sextile_Moon_H9': 'Curiosity and emotional openness invite learning or a spontaneous adventure.',
  'sextile_Moon_H10': 'Your emotional wellbeing supports your professional image — good for public-facing work.',
  'sextile_Moon_H11': 'Friendships and group belonging feel emotionally rewarding — join or reach out.',
  'sextile_Moon_H12': 'Quiet reflection and inner emotional work flow easily — solitude feels healing.',

  // ── Moon squares ─────────────────────────────────────────────────────────────
  'square_Moon_H1': 'Emotional reactions are quick and may not reflect your best self — pause before acting.',
  'square_Moon_H2': 'Financial insecurity or a conflict over resources stirs anxiety — breathe before spending.',
  'square_Moon_H3': 'An emotionally charged conversation with a sibling or neighbor may get tense — listen first.',
  'square_Moon_H4': 'Family tension or home-related stress surfaces — address it with care, not defensiveness.',
  'square_Moon_H5': 'Romantic disappointment or a creative block triggers frustration — don\'t force it today.',
  'square_Moon_H6': 'Emotional stress affects your body or work — a nap or walk may restore more than pushing through.',
  'square_Moon_H7': 'Emotional needs and a partner\'s expectations clash — a direct, calm conversation is needed.',
  'square_Moon_H8': 'Deep emotional intensity or a financial tension asks you to face rather than avoid the issue.',
  'square_Moon_H9': 'A belief or plan feels emotionally hollow — it\'s worth examining what you truly believe.',
  'square_Moon_H10': 'Career demands and emotional needs pull in opposite directions — give yourself some grace.',
  'square_Moon_H11': 'Social anxiety or a friendship conflict surfaces — remember you don\'t owe everyone everything.',
  'square_Moon_H12': 'Buried feelings or fears press for attention — don\'t dismiss what surfaces in dreams or mood.',

  // ── Moon trines ──────────────────────────────────────────────────────────────
  'trine_Moon_H1': 'Emotional and physical wellbeing align — you present yourself warmly and genuinely today.',
  'trine_Moon_H2': 'Feelings about money and security flow with ease — a good day for financial decisions.',
  'trine_Moon_H3': 'Communication is warm and empathetic — conversations with those nearby feel enriching.',
  'trine_Moon_H4': 'A good day to have a family conversation or articulate feelings about home.',
  'trine_Moon_H5': 'Creative and romantic feelings flow naturally — enjoy what lights you up.',
  'trine_Moon_H6': 'Emotional ease supports healthy habits — your body and routine feel in sync.',
  'trine_Moon_H7': 'A partnership or close friendship receives emotional nourishment — lean in.',
  'trine_Moon_H8': 'Emotional depth and intimacy feel supported — vulnerability is safe today.',
  'trine_Moon_H9': 'Emotional openness invites philosophical conversation or spiritual inspiration.',
  'trine_Moon_H10': 'Instincts and ambition align — trust your gut about a career move or public action.',
  'trine_Moon_H11': 'Group belonging and friendship feel emotionally fulfilling — community is restorative.',
  'trine_Moon_H12': 'Inner peace and spiritual awareness flow easily — meditation or art feels deeply nourishing.',

  // ── Moon oppositions ─────────────────────────────────────────────────────────
  'opposition_Moon_H1': 'Others\' emotional reactions pull against your own — compassion without losing your center.',
  'opposition_Moon_H2': 'Someone else\'s financial needs or values conflict with your own — set a clear boundary.',
  'opposition_Moon_H3': 'A conversation with a sibling or neighbor reveals an emotional gap — listen more than you speak.',
  'opposition_Moon_H4': 'Public demands and private family needs are in tension — protect some time for home life.',
  'opposition_Moon_H5': 'A romantic or creative expectation clashes — genuine self-expression beats performance.',
  'opposition_Moon_H6': 'Work pressures and bodily needs conflict — your health is asking to be heard.',
  'opposition_Moon_H7': 'A partner\'s emotional needs feel at odds with yours — meet them halfway.',
  'opposition_Moon_H8': 'A power dynamic or financial dependency is emotionally charged — name it clearly.',
  'opposition_Moon_H9': 'Someone challenges a belief you hold dear — use the discomfort to refine, not abandon, your views.',
  'opposition_Moon_H10': 'Emotional needs and career demands feel irreconcilable — give yourself permission to step back.',
  'opposition_Moon_H11': 'Group or community expectations clash with your emotional truth — honor both carefully.',
  'opposition_Moon_H12': 'Others project feelings onto you, or hidden emotions surface through interaction — reflect before reacting.',

  // ── Mercury conjunctions ─────────────────────────────────────────────────────
  'conjunction_Mercury_H1': 'Your mind and your presence merge — first impressions and quick thinking are amplified.',
  'conjunction_Mercury_H2': 'Financial conversations and practical thinking are in sharp focus — negotiate or plan.',
  'conjunction_Mercury_H3': 'Communication is electric — this is the best time for writing, pitching, or local networking.',
  'conjunction_Mercury_H4': 'Important conversations about home, family, or ancestry feel timely and necessary.',
  'conjunction_Mercury_H5': 'Creative ideas and playful communication spark — write that thing, pitch that project.',
  'conjunction_Mercury_H6': 'Work tasks and health matters demand your attention — lists, plans, and details help.',
  'conjunction_Mercury_H7': 'A key conversation with a partner or counterpart is activated — speak your mind clearly.',
  'conjunction_Mercury_H8': 'Conversations about shared money, contracts, or deep personal truths come to the surface.',
  'conjunction_Mercury_H9': 'Big ideas, study plans, and intellectual adventures are powerfully energized.',
  'conjunction_Mercury_H10': 'Professional communications and career announcements land with authority.',
  'conjunction_Mercury_H11': 'Group brainstorming and peer conversations produce unusually good ideas.',
  'conjunction_Mercury_H12': 'Inner dialogue and unconscious insights surface — journaling reveals hidden truths.',

  // ── Mercury sextiles ──────────────────────────────────────────────────────────
  'sextile_Mercury_H1': 'Your thinking and communication feel sharp — a good time to make a strong first impression.',
  'sextile_Mercury_H2': 'Practical financial ideas come easily — a good moment to review your budget or income plan.',
  'sextile_Mercury_H3': 'Conversations flow smoothly — reach out to siblings, neighbors, or local contacts.',
  'sextile_Mercury_H4': 'A good day to talk through a home decision or check in meaningfully with family.',
  'sextile_Mercury_H5': 'Creative ideas and lighthearted conversation come easily — share your enthusiasm.',
  'sextile_Mercury_H6': 'Work communication and health-related information exchange go well today.',
  'sextile_Mercury_H7': 'A dialogue with a partner or collaborator opens a useful door — be direct and warm.',
  'sextile_Mercury_H8': 'Financial or intimate conversations become easier — a good day to address what\'s been left unsaid.',
  'sextile_Mercury_H9': 'A book, course, or stimulating discussion opens your perspective — follow the curiosity.',
  'sextile_Mercury_H10': 'Professional correspondence and career conversations go smoothly — send that email.',
  'sextile_Mercury_H11': 'A friend or group contact has useful information or an idea worth pursuing.',
  'sextile_Mercury_H12': 'Inner clarity surfaces through writing or a quiet conversation — trust the subtle signals.',

  // ── Mercury squares ──────────────────────────────────────────────────────────
  'square_Mercury_H1': 'Snap judgments and hasty words could backfire — think before you speak.',
  'square_Mercury_H2': 'Financial thinking feels muddled or a money disagreement creates tension — revisit later.',
  'square_Mercury_H3': 'A miscommunication with a sibling or neighbor is possible — clarify before assuming.',
  'square_Mercury_H4': 'A difficult conversation about home or family needs handling — approach it calmly.',
  'square_Mercury_H5': 'Creative plans hit a logistical snag — adjust the idea rather than forcing the original path.',
  'square_Mercury_H6': 'Work details feel overwhelming or a health-related message causes worry — verify before reacting.',
  'square_Mercury_H7': 'Relationship tension or require patience and honesty — avoid making promises you can\'t keep.',
  'square_Mercury_H8': 'Financial or contractual confusion requires careful re-reading before signing.',
  'square_Mercury_H9': 'A belief or plan is challenged intellectually — keep an open mind.',
  'square_Mercury_H10': 'Professional miscommunication or a reputational concern asks for careful, measured words.',
  'square_Mercury_H11': 'Group miscommunication or a disagreement with a friend needs direct, kind resolution.',
  'square_Mercury_H12': 'Anxious or circular thinking surfaces — a walk or brief rest resets the mental loop.',

  // ── Mercury trines ───────────────────────────────────────────────────────────
  'trine_Mercury_H1': 'Your words carry presence and clarity — a great day to introduce yourself or make a pitch.',
  'trine_Mercury_H2': 'Financial ideas and practical plans crystallize clearly — a good day to budget or negotiate.',
  'trine_Mercury_H3': 'Clear thinking and easy conversation make short trips and local connections especially fruitful.',
  'trine_Mercury_H4': 'A good day to have a family conversation or articulate feelings about home.',
  'trine_Mercury_H5': 'Creative writing and playful communication flow effortlessly — publish, pitch, or perform.',
  'trine_Mercury_H6': 'Work plans and health information land with clarity — routines feel well-organized.',
  'trine_Mercury_H7': 'Clear, warm communication with a partner makes agreements and plans easy to reach.',
  'trine_Mercury_H8': 'A candid conversation about shared finances or deep personal matters resolves with clarity.',
  'trine_Mercury_H9': 'Study, travel plans, and broad intellectual pursuits move forward with ease.',
  'trine_Mercury_H10': 'Professional ideas and career conversations flow well — your voice carries authority.',
  'trine_Mercury_H11': 'Group conversations and community planning feel productive and genuinely collaborative.',
  'trine_Mercury_H12': 'Quiet insight and creative imagination flow freely — an ideal day for journaling or meditation.',

  // ── Mercury oppositions ──────────────────────────────────────────────────────
  'opposition_Mercury_H1': 'Someone else\'s perspective challenges your self-narrative — listen for what\'s useful.',
  'opposition_Mercury_H2': 'A financial disagreement or contrasting value system asks for open negotiation.',
  'opposition_Mercury_H3': 'A sibling or neighbor brings a view that challenges your own — engage with curiosity.',
  'opposition_Mercury_H4': 'Family members have different ideas about home or the past — find common ground.',
  'opposition_Mercury_H5': 'A creative or romantic dialogue reveals a misalignment — be honest about what you want.',
  'opposition_Mercury_H6': 'Conflicting information about work or health requires careful discernment — verify sources.',
  'opposition_Mercury_H7': 'A partner or rival presents a counterargument — consider it seriously before dismissing.',
  'opposition_Mercury_H8': 'A financial or psychological negotiation requires mutual transparency to resolve.',
  'opposition_Mercury_H9': 'Someone challenges your beliefs or travel plans — take their input seriously.',
  'opposition_Mercury_H10': 'Public feedback or a professional counterpoint asks you to reconsider your approach.',
  'opposition_Mercury_H11': 'Group opinions diverge from your own — facilitate rather than dominate the conversation.',
  'opposition_Mercury_H12': 'External noise disrupts your inner clarity — schedule quiet time to find your own answer.',

  // ── Venus conjunctions ───────────────────────────────────────────────────────
  'conjunction_Venus_H1': 'Charm, attractiveness, and social grace are fully activated — put yourself out there.',
  'conjunction_Venus_H2': 'A surge of attention around money and pleasures — spending, earning, and self-worth are highlighted.',
  'conjunction_Venus_H3': 'Social conversations feel warm and easy — connections in your neighborhood or with siblings sparkle.',
  'conjunction_Venus_H4': 'Home beautification and family warmth are energized — create comfort and connection at home.',
  'conjunction_Venus_H5': 'Romance and creative joy intensify — this is one of the best days for love and pleasure.',
  'conjunction_Venus_H6': 'Workplace harmony and self-care routines are activated — appreciate the small pleasures of your day.',
  'conjunction_Venus_H7': 'A partnership or close relationship is powerfully lit up — love and collaboration merge.',
  'conjunction_Venus_H8': 'Deep intimacy, shared resources, and transformative connection are at the forefront.',
  'conjunction_Venus_H9': 'Beauty, culture, travel, and expansive love feel irresistible — follow that spark.',
  'conjunction_Venus_H10': 'Your public image benefits from grace and appeal — a great day to be seen professionally.',
  'conjunction_Venus_H11': 'Social networks and group belonging feel enjoyable and rewarding — friendships deepen.',
  'conjunction_Venus_H12': 'Private pleasures and hidden affections are activated — art, solitude, or secret joy.',

  // ── Venus sextiles ────────────────────────────────────────────────────────────
  'sextile_Venus_H1': 'Your social ease and personal charm open doors — a good day for new introductions.',
  'sextile_Venus_H2': 'Financial opportunities and pleasurable purchases flow gently — a modest treat is well-timed.',
  'sextile_Venus_H3': 'Light, affectionate conversation with people nearby brings unexpected delight.',
  'sextile_Venus_H4': 'Home and family feel cozy and connected — a good day for a shared meal or domestic project.',
  'sextile_Venus_H5': 'Romance and creativity receive a pleasant nudge — say yes to what feels joyful.',
  'sextile_Venus_H6': 'Workplace harmony and pleasant daily routines make work feel lighter than usual.',
  'sextile_Venus_H7': 'Partnership cooperation flows easily — a good time to show appreciation to a close ally.',
  'sextile_Venus_H8': 'Shared resources and intimate conversation feel approachable — a gentle bridge-building moment.',
  'sextile_Venus_H9': 'Art, culture, or travel-related pleasures open naturally — follow the inviting thread.',
  'sextile_Venus_H10': 'Professional likeability and collegial warmth support career progress — be visible.',
  'sextile_Venus_H11': 'A friend group or social cause feels warmly rewarding — community bonds strengthen.',
  'sextile_Venus_H12': 'Creative or spiritual pleasures in solitude feel healing — allow yourself quiet enjoyment.',

  // ── Venus squares ─────────────────────────────────────────────────────────────
  'square_Venus_H1': 'Vanity or people-pleasing may be clouding your true self — stay grounded in who you are.',
  'square_Venus_H2': 'Financial temptation or a conflict over values presses you to set clear priorities.',
  'square_Venus_H3': 'Social friction or a gossip-related tension calls for more honesty in your communications.',
  'square_Venus_H4': 'A family disagreement over comfort or resources needs diplomatic handling.',
  'square_Venus_H5': 'Romantic disappointment or creative frustration asks you to examine your true desires.',
  'square_Venus_H6': 'Workplace social dynamics or health habits feel out of balance — adjust before it escalates.',
  'square_Venus_H7': 'Relationships require patience and honesty — avoid making promises you can\'t keep.',
  'square_Venus_H8': 'Financial entanglements or intimacy imbalances create tension — address the root honestly.',
  'square_Venus_H9': 'Differing values or aesthetic disagreements with a distant connection need diplomacy.',
  'square_Venus_H10': 'Reputation concerns or a professional relationship tension requires careful navigation.',
  'square_Venus_H11': 'Social expectations or a friendship conflict tests your sense of belonging — be honest.',
  'square_Venus_H12': 'Hidden cravings or suppressed affections press for acknowledgment — face them gently.',

  // ── Venus trines ─────────────────────────────────────────────────────────────
  'trine_Venus_H1': 'Charm and ease flow naturally today — your presence is magnetic and well-received.',
  'trine_Venus_H2': 'Financial conversations flow easily this time — a good moment to negotiate, invoice, or revisit what you charge.',
  'trine_Venus_H3': 'Warm, pleasant conversations with people nearby make everyday interactions a genuine pleasure.',
  'trine_Venus_H4': 'Home feels like a sanctuary today — enjoy a family gathering, redecorating, or quiet comfort.',
  'trine_Venus_H5': 'Love flows easily, creativity sparkles, and pleasure is well-starred — savor the day.',
  'trine_Venus_H6': 'Work feels harmonious and daily routines carry simple beauty — notice and appreciate it.',
  'trine_Venus_H7': 'Partnership harmony is easy today — a good day for dates, agreements, or collaborative projects.',
  'trine_Venus_H8': 'Intimacy and shared resources feel warm and mutually beneficial — a healing moment in close bonds.',
  'trine_Venus_H9': 'Art, culture, and philosophical conversations bring genuine pleasure — follow the beauty.',
  'trine_Venus_H10': 'Professional grace and public-facing warmth open doors — your reputation shines.',
  'trine_Venus_H11': 'Friendships and group activities feel genuinely joyful — community bonds are strengthened.',
  'trine_Venus_H12': 'Insights into a hidden affection or private creative project flow naturally — what you sense can now be expressed.',

  // ── Venus oppositions ────────────────────────────────────────────────────────
  'opposition_Venus_H1': 'Someone else\'s beauty, charm, or desires throw your own into sharp relief — stay true to yourself.',
  'opposition_Venus_H2': 'A financial or values disagreement with another person needs careful, honest conversation.',
  'opposition_Venus_H3': 'Social tension in your immediate environment asks for more genuine communication.',
  'opposition_Venus_H4': 'Household financial expectations or family comfort needs clash — negotiate kindly.',
  'opposition_Venus_H5': 'Romantic or creative desires conflict with another\'s — find a way to honor both.',
  'opposition_Venus_H6': 'Workplace or service-related tension around fairness or aesthetics needs to be addressed.',
  'opposition_Venus_H7': 'Relationship dynamics are highlighted — a partner mirrors back an unacknowledged need.',
  'opposition_Venus_H8': 'Financial dependency or intimacy imbalance in a relationship surfaces — speak plainly.',
  'opposition_Venus_H9': 'A differing aesthetic or value system with someone at a distance prompts important reflection.',
  'opposition_Venus_H10': 'Public or professional relationships create friction around fairness or recognition.',
  'opposition_Venus_H11': 'Group values or a friend\'s different priorities challenge your sense of social belonging.',
  'opposition_Venus_H12': 'Hidden relationship dynamics or suppressed desires surface through another — reflect before reacting.',

  // ── Mars conjunctions ────────────────────────────────────────────────────────
  'conjunction_Mars_H1': 'Personal drive and physical energy are fully lit — channel the intensity into purposeful action.',
  'conjunction_Mars_H2': 'Drive to earn and protect resources is supercharged — pursue a financial goal with confidence.',
  'conjunction_Mars_H3': 'Communication energy is assertive and direct — use it to advocate, not to argue.',
  'conjunction_Mars_H4': 'Passion around home and family flares — tackle a long-overdue domestic project.',
  'conjunction_Mars_H5': 'Creative and romantic drive surge — pursue what excites you with boldness.',
  'conjunction_Mars_H6': 'Work drive and physical energy are fully activated — a good day for demanding tasks.',
  'conjunction_Mars_H7': 'Relationship dynamics heat up — assert your needs clearly and invite honest response.',
  'conjunction_Mars_H8': 'Deep desire and transformative drive intensify — face what you\'ve been avoiding.',
  'conjunction_Mars_H9': 'A burning desire for adventure, learning, or a big goal drives action today.',
  'conjunction_Mars_H10': 'Career ambition and competitive energy peak — make a bold professional move.',
  'conjunction_Mars_H11': 'Drive to contribute to a group or cause is activated — lead or initiate something collective.',
  'conjunction_Mars_H12': 'Hidden frustrations or inner battles surface — work through them rather than act them out.',

  // ── Mars sextiles ────────────────────────────────────────────────────────────
  'sextile_Mars_H1': 'Physical energy and confidence flow well — a good day for exercise, initiative, or presence.',
  'sextile_Mars_H2': 'Productive energy around finances or acquiring something practical opens up — take action.',
  'sextile_Mars_H3': 'Assertive, effective communication flows easily — a good day to advocate for yourself.',
  'sextile_Mars_H4': 'Home-related projects and family dynamics benefit from your focused effort today.',
  'sextile_Mars_H5': 'Creative drive and physical vitality produce results — pursue a passion project.',
  'sextile_Mars_H6': 'Work efficiency and physical endurance are supported — tackle the hardest task first.',
  'sextile_Mars_H7': 'Collaborative energy with a partner is productive — tackle a shared project together.',
  'sextile_Mars_H8': 'Driven effort around shared resources or personal transformation moves forward well.',
  'sextile_Mars_H9': 'Physical or intellectual adventure calls — follow it and you\'ll make meaningful progress.',
  'sextile_Mars_H10': 'Career effort and competitive edge deliver results — push toward a professional goal.',
  'sextile_Mars_H11': 'Group action and collective projects benefit from your energized contribution today.',
  'sextile_Mars_H12': 'Inner drive and spiritual energy move productively — solo effort or quiet action pays off.',

  // ── Mars squares ─────────────────────────────────────────────────────────────
  'square_Mars_H1': 'Frustration and short temper are close to the surface — slow down before reacting.',
  'square_Mars_H2': 'Financial frustration or impulsive spending needs a check — don\'t buy out of anger.',
  'square_Mars_H3': 'An argument with a sibling or communication partner is likely — choose your words carefully.',
  'square_Mars_H4': 'Home tension or family conflict flares — address the root issue rather than the symptom.',
  'square_Mars_H5': 'Creative blocks or romantic friction presses you to be honest about what you truly want.',
  'square_Mars_H6': 'Work frustration or physical strain asks you to pace yourself rather than push through.',
  'square_Mars_H7': 'Direct confrontation with a partner or opponent — be firm but fair, not combative.',
  'square_Mars_H8': 'Power struggles over shared resources or deep desires surface — name the real issue.',
  'square_Mars_H9': 'Impatience with a belief system, travel plan, or learning curve creates friction — slow down.',
  'square_Mars_H10': 'Career ambition meets an obstacle — redirect rather than force; patience is an asset.',
  'square_Mars_H11': 'Tension within a group or with a friend requires assertiveness without aggression.',
  'square_Mars_H12': 'Suppressed anger or inner restlessness pushes for release — physical exercise helps.',

  // ── Mars trines ──────────────────────────────────────────────────────────────
  'trine_Mars_H1': 'Physical vitality and assertiveness flow without friction — take decisive action.',
  'trine_Mars_H2': 'Productive effort around finances and material goals flows naturally — press forward.',
  'trine_Mars_H3': 'Communication is direct and effective — a good day to pitch, negotiate, or advocate.',
  'trine_Mars_H4': 'Confident action at home produces results — tackle that project or family matter today.',
  'trine_Mars_H5': 'Creative energy and physical vitality combine beautifully — pursue what excites you.',
  'trine_Mars_H6': 'Work effort produces clear results — your body and your drive are in alignment today.',
  'trine_Mars_H7': 'Partnership action feels collaborative and effective — tackle something together.',
  'trine_Mars_H8': 'Transformation and driven effort around deep goals move forward with surprising ease.',
  'trine_Mars_H9': 'Ambitious goals, athletic pursuits, or travel plans proceed smoothly — act boldly.',
  'trine_Mars_H10': 'Career ambition meets smooth execution — a good day to make a visible professional move.',
  'trine_Mars_H11': 'Group initiatives and community projects benefit from your energized and effective action.',
  'trine_Mars_H12': 'Solo effort and inner resolve produce quiet but meaningful results — keep going.',

  // ── Mars oppositions ──────────────────────────────────────────────────────────
  'opposition_Mars_H1': 'Another person\'s aggression or drive challenges yours — stand your ground with calm confidence.',
  'opposition_Mars_H2': 'A financial confrontation or resource dispute with another requires clear limits.',
  'opposition_Mars_H3': 'A heated exchange with a sibling or local contact — keep it factual rather than personal.',
  'opposition_Mars_H4': 'A family member\'s anger or action presses against your domestic space — hold your ground kindly.',
  'opposition_Mars_H5': 'Competitive tension in romance or creative collaboration asks for honest negotiation.',
  'opposition_Mars_H6': 'Workplace conflict or physical overextension asks you to reclaim your energy.',
  'opposition_Mars_H7': 'Direct confrontation with a partner or open opponent — assertiveness over aggression wins.',
  'opposition_Mars_H8': 'A power struggle over shared money or intimate boundaries reaches a peak — address it directly.',
  'opposition_Mars_H9': 'Someone challenges your beliefs or ambitions combatively — defend with reason, not heat.',
  'opposition_Mars_H10': 'A career rival or authority challenge confronts your professional position — respond strategically.',
  'opposition_Mars_H11': 'Group conflict or a friend\'s aggressive stance requires you to assert your position calmly.',
  'opposition_Mars_H12': 'Hidden anger or a passive-aggressive dynamic surfaces in relationships — name it plainly.',
}

/**
 * Get a personalized event brief that incorporates the natal planet's house.
 *
 * Three-level fallback:
 * 1. House-specific: HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE[`${aspectType}_${natalPlanet}_H${natalHouse}`]
 * 2. Planet-aspect-type generic: ASPECT_BRIEFS[aspectType][natalPlanet]
 * 3. Aspect-type default: ASPECT_BRIEFS[aspectType].default
 *
 * Never returns an empty string.
 */
export function getPersonalizedEventBrief(
  aspectType: AspectType,
  natalPlanet: PlanetName | 'NorthNode',
  natalHouse: number | null,
): string {
  // For NorthNode or unknown/invalid house, skip the personalized table
  const houseIsValid = natalHouse !== null && natalHouse >= 1 && natalHouse <= 12
  if (natalPlanet !== 'NorthNode' && houseIsValid) {
    const key = `${aspectType}_${natalPlanet}_H${natalHouse}`
    const houseBrief = HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE[key]
    if (houseBrief) return houseBrief
  }

  // Fall back to existing generic brief
  return getAspectPerfectionBrief(aspectType, natalPlanet)
}

export function getAspectPerfectionBrief(
  aspectType: AspectType,
  natalPlanet: PlanetName | 'NorthNode',
): string {
  const briefs = ASPECT_BRIEFS[aspectType]
  if (!briefs) return ''
  return briefs[natalPlanet] ?? briefs.default ?? ''
}

// ─── Sign ingress interpretations ───────────────────────────────────────────

const INGRESS_BRIEFS: Record<string, string> = {
  Sun: 'The Sun illuminates new themes and shifts your focus',
  Moon: 'The Moon\'s emotional tone changes',
  Mercury: 'Communication, thinking, and commerce shift style',
  Venus: 'Love language, aesthetic preferences, and social energy shift',
  Mars: 'Your drive, assertiveness, and passion redirect',
  Jupiter: 'Expansion, optimism, and growth opportunities shift territory',
  Saturn: 'Structure, discipline, and life lessons move to new ground',
  Uranus: 'Innovation and disruption target new life areas',
  Neptune: 'Dreams, illusions, and spiritual themes evolve',
  Pluto: 'Transformation and power dynamics enter new territory',
}

export function getIngressBrief(planet: PlanetName, toSign: string): string {
  const base = INGRESS_BRIEFS[planet] ?? `${planet} shifts energy`
  return `${base} — ${planet} enters ${toSign}`
}

// ─── Retrograde station interpretations ─────────────────────────────────────

const STATION_BRIEFS: Record<string, { retrograde: string; direct: string }> = {
  Mercury: {
    retrograde: 'Review communications, back up data, expect delays',
    direct: 'Communication clears, stalled plans can move forward',
  },
  Venus: {
    retrograde: 'Reassess relationships and finances, old flames may reappear',
    direct: 'Romantic clarity returns, purchases and partnerships resume',
  },
  Mars: {
    retrograde: 'Energy turns inward, avoid starting new battles',
    direct: 'Drive and ambition reignite, projects gain momentum',
  },
  Jupiter: {
    retrograde: 'Reflect on beliefs and long-term vision',
    direct: 'Growth and optimism resume, opportunities unlock',
  },
  Saturn: {
    retrograde: 'Review responsibilities and life structures',
    direct: 'Commitments solidify, delayed progress resumes',
  },
  Uranus: {
    retrograde: 'Internal revolution, processing needed changes',
    direct: 'Breakthroughs externalize, freedom expressed',
  },
  Neptune: {
    retrograde: 'Illusions lift, inner clarity emerges',
    direct: 'Dreams and ideals reconnect with reality',
  },
  Pluto: {
    retrograde: 'Deep internal transformation, shadow work',
    direct: 'Transformation externalizes, empowerment rises',
  },
}

export function getStationBrief(planet: PlanetName, stationType: 'retrograde' | 'direct'): string {
  const data = STATION_BRIEFS[planet]
  if (!data) return `${planet} stations ${stationType}`
  return data[stationType]
}

// ─── Lunar phase interpretations ────────────────────────────────────────────

const LUNAR_PHASE_BRIEFS: Record<string, string> = {
  'New Moon': 'Plant seeds, set intentions, begin new chapters',
  'First Quarter': 'Take decisive action, push through resistance',
  'Full Moon': 'Harvest results, gain clarity, release what\'s complete',
  'Last Quarter': 'Reflect, forgive, clear space for the new cycle',
}

export function getLunarPhaseBrief(phase: string): string {
  return LUNAR_PHASE_BRIEFS[phase] ?? phase
}

// ─── Event type display info ────────────────────────────────────────────────

export const EVENT_TYPE_INFO: Record<string, { icon: string; color: string; label: string }> = {
  'aspect-perfection': { icon: '✦', color: 'text-mystic-gold', label: 'Exact Aspect' },
  'sign-ingress': { icon: '→', color: 'text-mystic-purple', label: 'Sign Change' },
  'retrograde-station': { icon: '℞', color: 'text-red-400', label: 'Station' },
  'lunar-phase': { icon: '◐', color: 'text-blue-400', label: 'Lunar Phase' },
  'moon-sign-change': { icon: '☽', color: 'text-mystic-muted', label: 'Moon Sign' },
}
