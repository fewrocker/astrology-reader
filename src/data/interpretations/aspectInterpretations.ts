import type { InterpretationEntry } from './types'

/** Aspect interpretations keyed by "Planet1_AspectType_Planet2" (alphabetical planet order) */
export const ASPECT_INTERPRETATIONS: Record<string, InterpretationEntry> = {
  // SUN aspects
  Sun_Conjunction_Moon: { brief: 'Unified will and emotions', detail: 'Your conscious will and emotional nature operate as one. You are a person of singular focus with strong emotional convictions. What you want and what you feel are deeply aligned.' },
  Sun_Opposition_Moon: { brief: 'Tension between will and emotions', detail: 'Your conscious goals and emotional needs can pull in opposite directions. Balancing your outer ambitions with inner emotional needs is a core life challenge that drives personal growth.' },
  Sun_Trine_Moon: { brief: 'Harmonious self-expression and emotions', detail: 'Your will and emotions flow together naturally. You have an easy confidence that comes from inner harmony. You instinctively know what you want and pursue it with emotional conviction.' },
  Sun_Square_Moon: { brief: 'Inner tension creates drive', detail: 'Friction between your desires and emotions creates dynamic tension that propels you forward. You may feel pulled between what you want and what you need, but this produces remarkable motivation.' },
  Sun_Sextile_Moon: { brief: 'Opportunities through emotional awareness', detail: 'Your conscious awareness and emotional intelligence work together productively. You create opportunities by combining practical goals with emotional awareness.' },

  Sun_Conjunction_Mercury: { brief: 'Strong mental identification', detail: 'Your ego and mind are fused, making communication central to your identity. You express yourself naturally through ideas and words.' },
  Sun_Conjunction_Venus: { brief: 'Charming, magnetic personality', detail: 'Your identity radiates warmth, beauty, and social grace. You attract love and admiration naturally and have creative gifts that express your core self.' },
  Sun_Conjunction_Mars: { brief: 'Powerful will and energy', detail: 'Your willpower and physical energy are tremendously strong. You\'re a natural leader who takes decisive action. Competition and challenge invigorate you.' },
  Sun_Opposition_Mars: { brief: 'Will clashes with aggression', detail: 'Your ego and assertive drive can clash with others, creating power struggles. Learning to channel your immense energy constructively is key to your success.' },
  Sun_Trine_Mars: { brief: 'Confident, energetic action', detail: 'Your will and energy flow together beautifully. You act with confidence and natural authority. Physical vitality and leadership come easily.' },
  Sun_Square_Mars: { brief: 'Frustrated energy creates power', detail: 'Tension between your ego and aggressive drive creates friction, but also tremendous power when channeled well. You must learn to direct anger constructively.' },

  Sun_Conjunction_Jupiter: { brief: 'Optimistic, expansive personality', detail: 'Your identity is infused with confidence and generosity. You see life as an adventure full of possibilities and naturally attract good fortune through your positive outlook.' },
  Sun_Opposition_Jupiter: { brief: 'Tendency toward excess', detail: 'Your natural confidence can tip into overconfidence. You dream big—sometimes too big. Learning to balance optimism with realism makes your expansive nature truly powerful.' },
  Sun_Trine_Jupiter: { brief: 'Natural luck and optimism', detail: 'Fortune smiles on you. Your confidence and generous spirit attract opportunities and supportive people. You have a natural faith in life that sustains you through challenges.' },
  Sun_Square_Jupiter: { brief: 'Restless ambition and overreach', detail: 'You aim high, sometimes too high. Restless energy drives you to take on more than you can handle, but your ambition pushes you to remarkable achievements.' },
  Sun_Conjunction_Saturn: { brief: 'Disciplined, serious identity', detail: 'Responsibility and discipline are central to who you are. You may seem older than your years but your patient, structured approach to life builds lasting achievements.' },
  Sun_Opposition_Saturn: { brief: 'Authority challenges shape character', detail: 'Struggles with authority figures and self-doubt push you toward hard-won maturity. You build character through adversity and earn everything you achieve.' },
  Sun_Trine_Saturn: { brief: 'Grounded ambition and steadiness', detail: 'Your identity is supported by discipline and patience. You combine vision with structure, creating lasting achievements through steady, persistent effort.' },
  Sun_Square_Saturn: { brief: 'Self-doubt drives determination', detail: 'You face recurring obstacles and self-doubt that ultimately build extraordinary resilience. Your greatest achievements come through overcoming significant challenges.' },

  Sun_Conjunction_Uranus: { brief: 'Brilliantly unique identity', detail: 'You are strikingly original and resist all forms of conformity. Your personality electrifies others and you may have sudden insights or breakthroughs throughout life.' },
  Sun_Trine_Uranus: { brief: 'Natural originality and innovation', detail: 'Your unique qualities flow naturally into your life without disruption. You\'re innovative and progressive while remaining grounded and socially connected.' },
  Sun_Square_Uranus: { brief: 'Rebellious energy creates innovation', detail: 'A restless need for freedom and change can create instability but also drives remarkable innovation. You rebel against limitations and forge new paths.' },

  Sun_Conjunction_Neptune: { brief: 'Imaginative, spiritual identity', detail: 'Your identity is infused with imagination, spirituality, and artistic sensitivity. You may struggle with boundaries but your compassion and creative vision are extraordinary.' },
  Sun_Trine_Neptune: { brief: 'Natural creative and spiritual gifts', detail: 'Imagination and intuition flow easily into your life. You have natural artistic talent and spiritual sensitivity that enhance rather than overwhelm your sense of self.' },
  Sun_Square_Neptune: { brief: 'Confusion transforms into vision', detail: 'You may struggle with unclear identity or escapist tendencies, but working through these issues develops extraordinary compassion and creative vision.' },

  Sun_Conjunction_Pluto: { brief: 'Intensely powerful will', detail: 'Your willpower is extraordinary and transformative. You have a magnetic intensity that others feel immediately. Personal transformation is a central life theme.' },
  Sun_Trine_Pluto: { brief: 'Natural depth and personal power', detail: 'You access your inner power naturally and transform gracefully. Your willpower is strong but not domineering, and you have a natural ability to regenerate after setbacks.' },
  Sun_Square_Pluto: { brief: 'Power struggles drive transformation', detail: 'Intense power dynamics and control issues push you toward deep transformation. Crisis becomes your catalyst for becoming who you\'re meant to be.' },

  // MOON aspects
  Moon_Conjunction_Venus: { brief: 'Emotionally warm and affectionate', detail: 'Your emotional nature is gentle, loving, and attuned to beauty. You express feelings through affection and create harmonious emotional environments.' },
  Moon_Trine_Venus: { brief: 'Naturally loving and graceful', detail: 'Your emotions and love nature flow together beautifully. You have a natural warmth that attracts affection and your emotional life is generally pleasant.' },
  Moon_Square_Venus: { brief: 'Emotional needs vs. desire for harmony', detail: 'Your emotional needs and desire for love can conflict, creating indulgence or people-pleasing tendencies. Growth comes through balancing self-care with care for others.' },
  Moon_Conjunction_Mars: { brief: 'Emotionally intense and reactive', detail: 'Your emotions are passionate and quickly expressed. You act on feelings immediately and have a courageous emotional nature, though you may need to manage impulsiveness.' },
  Moon_Opposition_Mars: { brief: 'Emotional volatility and passion', detail: 'Strong emotions and aggressive impulses can clash, creating inner turbulence. Channeling this passionate energy gives you remarkable emotional courage.' },
  Moon_Trine_Mars: { brief: 'Emotions fuel constructive action', detail: 'Your feelings naturally translate into productive action. You have emotional courage and the ability to act decisively on your convictions.' },
  Moon_Square_Mars: { brief: 'Emotional friction creates energy', detail: 'Tension between your feelings and impulses creates emotional intensity that can be channeled into passionate pursuits and great emotional honesty.' },

  Moon_Conjunction_Jupiter: { brief: 'Emotionally generous and optimistic', detail: 'Your emotional nature is warm, generous, and optimistic. You have a big heart and a natural ability to nurture others. Emotional abundance attracts good fortune.' },
  Moon_Trine_Jupiter: { brief: 'Emotional contentment and warmth', detail: 'Your emotions are naturally buoyant and generous. You have good emotional health and your positive feelings attract beneficial circumstances.' },
  Moon_Conjunction_Saturn: { brief: 'Emotionally disciplined, cautious', detail: 'Your emotions are controlled and measured. You may suppress feelings but develop remarkable emotional maturity and reliability over time.' },
  Moon_Opposition_Saturn: { brief: 'Emotional restriction leads to maturity', detail: 'Emotional reserve or early experiences of limitation build deep emotional resilience. You learn to provide your own emotional security.' },
  Moon_Square_Saturn: { brief: 'Emotional blocks build strength', detail: 'Difficulty expressing emotions or receiving nurturing builds tremendous inner strength and emotional self-reliance over time.' },

  Moon_Conjunction_Pluto: { brief: 'Emotionally intense and transformative', detail: 'Your emotional nature is profoundly deep and intense. You feel everything powerfully and undergo emotional transformations that give you extraordinary psychological insight.' },
  Moon_Trine_Pluto: { brief: 'Deep emotional power and intuition', detail: 'You access emotional depth naturally and have powerful intuitive abilities. Your feelings have transformative power that heals both yourself and others.' },
  Moon_Square_Pluto: { brief: 'Emotional intensity drives transformation', detail: 'Powerful emotions—sometimes overwhelming—drive deep psychological transformation. Your emotional journey gives you profound understanding of human nature.' },

  // VENUS-MARS
  Venus_Conjunction_Mars: { brief: 'Passionate love nature', detail: 'Love and desire are unified in you, creating magnetic attraction and passionate relationships. You pursue what and whom you love with directness and fire.' },
  Venus_Opposition_Mars: { brief: 'Magnetic tension between love and desire', detail: 'The push-pull between tender love and raw desire creates magnetic attraction to others. You experience relationships intensely and your love life is rarely dull.' },
  Venus_Trine_Mars: { brief: 'Love and desire in harmony', detail: 'Your romantic and sexual natures flow together beautifully. You attract love easily and express affection with warmth and appropriate passion.' },
  Venus_Square_Mars: { brief: 'Dynamic tension in love', detail: 'Friction between your desire for harmony and your passionate impulses creates exciting but sometimes turbulent relationships. This tension drives creative expression.' },

  // VENUS-SATURN
  Venus_Conjunction_Saturn: { brief: 'Serious, enduring love', detail: 'You take love seriously and prefer committed, lasting relationships. Your affections may be reserved but they are deeply loyal and your love grows stronger over time.' },
  Venus_Trine_Saturn: { brief: 'Stable, mature relationships', detail: 'You naturally create lasting, respectful relationships. Your love nature is grounded, loyal, and increasingly warm as you mature.' },
  Venus_Square_Saturn: { brief: 'Love tested by difficulty', detail: 'Relationships face obstacles that ultimately strengthen your capacity for love. Early romantic challenges teach you the value of genuine, lasting commitment.' },

  // JUPITER-SATURN
  Jupiter_Conjunction_Saturn: { brief: 'Balanced expansion and discipline', detail: 'Optimism and realism blend in your personality. You expand cautiously and build ambitiously—the combination creates practical wisdom and sustainable growth.' },
  Jupiter_Opposition_Saturn: { brief: 'Growth vs. restriction', detail: 'The tension between your desire to expand and your fear of failure creates a productive cycle of dreaming and building. You achieve through persistent effort.' },
  Jupiter_Square_Saturn: { brief: 'Ambition vs. limitation', detail: 'The friction between aspiration and limitation teaches you to build achievable plans. Success comes when you balance vision with practical discipline.' },

  // MARS-SATURN
  Mars_Conjunction_Saturn: { brief: 'Controlled, strategic energy', detail: 'Your energy is disciplined and strategic. You may feel frustrated at times but develop remarkable self-control and the ability to work tirelessly toward goals.' },
  Mars_Opposition_Saturn: { brief: 'Drive vs. restriction', detail: 'Your desire to act boldly clashes with caution or external obstacles. This tension builds extraordinary perseverance and strategic thinking.' },
  Mars_Square_Saturn: { brief: 'Frustration builds resilience', detail: 'Blocked energy and frustration ultimately forge incredible determination and discipline. You achieve through sheer persistence.' },
  Mars_Trine_Saturn: { brief: 'Disciplined energy and endurance', detail: 'Your energy and discipline work together naturally. You have remarkable endurance and the ability to work hard toward long-term goals without burning out.' },

  // OUTER PLANET aspects (generational but personally significant when aspecting inner planets)
  Jupiter_Conjunction_Uranus: { brief: 'Sudden luck and progressive expansion', detail: 'You attract unexpected opportunities and breakthroughs. Your optimism and originality combine to create sudden growth and innovative solutions.' },
  Jupiter_Conjunction_Neptune: { brief: 'Spiritual vision and inspired idealism', detail: 'Your imagination and faith are vast. You envision grand possibilities and your idealism, when channeled practically, can be truly visionary.' },
  Jupiter_Conjunction_Pluto: { brief: 'Powerful ambition and transformative growth', detail: 'You have enormous drive for power and growth. Your ambitions are large and your capacity to transform circumstances is remarkable.' },
  Saturn_Conjunction_Uranus: { brief: 'Structured innovation', detail: 'You blend tradition with innovation, creating practical reforms. You build new structures by reworking old ones rather than tearing everything down.' },
  Saturn_Conjunction_Neptune: { brief: 'Dreams meet discipline', detail: 'Your ideals and practical abilities merge, allowing you to give structure to dreams. You may struggle with disillusionment before finding grounded spirituality.' },
  Saturn_Conjunction_Pluto: { brief: 'Intense determination and endurance', detail: 'You have extraordinary willpower and the ability to endure extreme pressure. You build power structures and transform established systems through sheer determination.' },
  Uranus_Conjunction_Neptune: { brief: 'Generational visionary energy', detail: 'You belong to a generation that merges innovation with spirituality. On a personal level, you may express this through creative technology or spiritual experimentation.' },
  Uranus_Conjunction_Pluto: { brief: 'Revolutionary transformation', detail: 'You belong to a generation that drives radical change. Personally, you may experience sudden transformations that revolutionize your life completely.' },
  Neptune_Conjunction_Pluto: { brief: 'Deep spiritual transformation', detail: 'An extremely rare aspect indicating a generation that transforms humanity\'s spiritual understanding. Personally, your spiritual life undergoes profound, irreversible changes.' },
}
