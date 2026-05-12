import type { LunarPhaseName } from '../../engine/lunar'

export interface LunarPhaseInterpretation {
  emoji: string
  transitBrief: string
  natalBrief: string
  natalDetail: string
}

export const LUNAR_PHASE_INTERPRETATIONS: Record<LunarPhaseName, LunarPhaseInterpretation> = {
  'New Moon': {
    emoji: '🌑',
    transitBrief: 'New beginnings — plant seeds, set intentions',
    natalBrief: 'Born at the New Moon — instinctive, pioneering, self-directed',
    natalDetail: 'You were born as the Sun and Moon aligned, marking you as someone who operates on instinct and inner authority. You launch naturally, need little external validation, and life unfolds through fresh starts rather than continuations.',
  },
  'Waxing Crescent': {
    emoji: '🌒',
    transitBrief: 'Building momentum — assert your intentions, overcome resistance',
    natalBrief: 'Born under a Waxing Crescent — determined, purpose-driven, tenacious',
    natalDetail: 'Born as the Moon was just beginning to grow, you carry a drive to establish yourself against resistance. You often sense you are working uphill, which fuels your tenacity. Willingness to struggle is one of your core traits.',
  },
  'First Quarter': {
    emoji: '🌓',
    transitBrief: 'Crisis of action — make decisions, push through obstacles',
    natalBrief: 'Born at the First Quarter — decisive, action-oriented, a builder',
    natalDetail: 'The First Quarter birth marks someone who finds clarity through decisive action. You are oriented toward building, and you do not fear conflict or hard decisions — they are where you find your footing. You build structures that serve the future.',
  },
  'Waxing Gibbous': {
    emoji: '🌔',
    transitBrief: 'Refinement — analyze, improve, prepare for culmination',
    natalBrief: 'Born under a Waxing Gibbous — analytical, perfectionist, seeks mastery',
    natalDetail: 'Born as the Moon approaches fullness, you instinctively refine and improve whatever you work on. Rarely satisfied with "good enough," you pursue mastery — which can make you highly skilled but prone to over-analysis before action.',
  },
  'Full Moon': {
    emoji: '🌕',
    transitBrief: 'Culmination — illumination, clarity, and emotional peaks',
    natalBrief: 'Born at the Full Moon — polarizing, emotionally intense, seeks integration',
    natalDetail: 'Full Moon births create a push-pull between opposing forces — logic vs. emotion, self vs. others. You experience life intensely and feel friction between two valid but competing drives. Your path is finding how to honor both simultaneously.',
  },
  'Waning Gibbous': {
    emoji: '🌖',
    transitBrief: 'Dissemination — share what you have learned, give back',
    natalBrief: 'Born under a Waning Gibbous — wise, a teacher, driven to share',
    natalDetail: 'Born as the Moon begins its return, you carry a natural drive to share what you know. You often find yourself teaching, mentoring, or making meaning out of experience and giving it back. Wisdom gained is wisdom shared.',
  },
  'Last Quarter': {
    emoji: '🌗',
    transitBrief: 'Release — let go, reassess, clear what no longer serves',
    natalBrief: 'Born at the Last Quarter — visionary, reorients away from the past',
    natalDetail: 'The Last Quarter birth marks someone oriented toward the future rather than the past. You feel tension between old structures and new visions, and you are here to help usher in what comes next — even when it means departing from what is comfortable.',
  },
  'Waning Crescent': {
    emoji: '🌘',
    transitBrief: 'Rest and surrender — withdraw, integrate, prepare for renewal',
    natalBrief: 'Born under a Waning Crescent — old soul, karmic themes, deeply intuitive',
    natalDetail: 'The Waning Crescent birth marks someone who carries something from before — patterns, gifts, or burdens that feel older than this life. You are highly intuitive and sensitive to subtle dimensions others miss. This cycle is one of completion before renewal.',
  },
}

export const MOON_SIGN_QUALITIES: Record<string, string> = {
  Aries: 'Impulsive and energetic — direct action',
  Taurus: 'Calm and grounded — comfort and stability',
  Gemini: 'Curious and social — communication and ideas',
  Cancer: 'Nurturing and protective — home and family',
  Leo: 'Dramatic and generous — expression and play',
  Virgo: 'Analytical and helpful — details and health',
  Libra: 'Harmonious and sociable — balance and beauty',
  Scorpio: 'Intense and perceptive — depth and transformation',
  Sagittarius: 'Optimistic and restless — freedom and meaning',
  Capricorn: 'Serious and disciplined — ambition and structure',
  Aquarius: 'Detached and innovative — ideals and community',
  Pisces: 'Dreamy and compassionate — empathy and surrender',
}
