import { getHouseTheme } from './houseThemes'

/**
 * Relational voice: "your planet in their house" — what the incoming planet activates
 * in the partner who receives it. Not natal self-description; not archetype labels.
 * 5 inner planets × 12 houses = 60 entries.
 */
export const SYNASTRY_HOUSE_OVERLAY_BRIEFS: Record<string, string> = {
  // ── SUN ──────────────────────────────────────────────────────────────────
  Sun_H1: 'Your Sun lands in the heart of their self — you illuminate who they are simply by being present. They feel more vivid, more themselves, when you are in the room.',
  Sun_H2: 'Your life force flows into the space where they hold their deepest values and sense of worth. They feel affirmed in what matters most to them; your presence makes their inner world feel legitimate.',
  Sun_H3: 'Your vitality lights up their mind and their way of moving through the world. Conversations with you feel energizing; they find themselves thinking more clearly, speaking more freely.',
  Sun_H4: 'Your Sun lands in the most private and protected part of their chart. They feel a warmth in your presence that touches their foundations — something about you feels like home.',
  Sun_H5: 'Your life force flows directly into the space they reserve for joy, creativity, and romance. They feel playful and alive around you; you make pleasure feel like something they are allowed to have.',
  Sun_H6: 'Your vitality lands in their daily life and routines. They feel more purposeful and capable with you present; something about you makes ordinary tasks feel worth doing.',
  Sun_H7: 'Your Sun steps directly into the house where they seek a committed partner. They experience you as someone who could be their equal — the one they have been unconsciously watching for.',
  Sun_H8: 'Your life force reaches the most intense and private space in their chart. They feel you in their depths — your presence stirs transformation and an intimacy they do not let themselves feel with most people.',
  Sun_H9: 'Your vitality lands in the space where they reach for meaning and expansion. You make them want to explore, believe, and grow; your presence opens the world for them.',
  Sun_H10: 'Your Sun shines into the part of their chart that governs reputation and purpose. They feel more capable and visible when you are in their life; you elevate how they see their own ambitions.',
  Sun_H11: 'Your life force lands in the space where they build friendships and future visions. They feel socially energized by you; you fit naturally into the larger picture of the life they are trying to create.',
  Sun_H12: 'Your Sun enters the most hidden and private chamber of their chart. They feel you in ways they struggle to articulate — a quiet, pervasive warmth that reaches what they keep from the world.',

  // ── MOON ─────────────────────────────────────────────────────────────────
  Moon_H1: 'Your emotional nature lands visibly in their life — they feel your moods and your care at the surface, and it moves them. Your presence makes them feel emotionally met before a word is spoken.',
  Moon_H2: 'Your emotional world flows into the space where they hold their values and security. They feel emotionally settled by your presence; something about the way you love makes their foundations feel sound.',
  Moon_H3: 'Your feelings flow through their mind and the way they communicate. They find themselves opening up with you in ways they don\'t with others; your emotional register makes honest conversation feel safe.',
  Moon_H4: 'Your emotional nature lands in the deepest, most protected space in their chart. They feel nurtured and held in ways that reach their core — your presence in their home space feels irreplaceable.',
  Moon_H5: 'Your emotional warmth flows directly into the space they hold for romance and creative joy. They feel genuinely cared for and playfully loved; romance with you feels tender and real.',
  Moon_H6: 'Your care and emotional attunement land in their daily life. They feel supported in small, concrete ways — your attention to their routines and wellbeing matters more than they let on.',
  Moon_H7: 'Your emotional nature finds its way directly into the house where they seek partnership. They feel cared for as a partner; your emotional presence is precisely what they need in a committed relationship.',
  Moon_H8: 'Your emotional depth reaches the most intimate and transformative space in their chart. They feel your feelings at a profound level — your emotional world dissolves their walls and reaches what they have guarded most carefully.',
  Moon_H9: 'Your emotional world lands in the space where they reach for meaning and experience. They feel broadened by your emotional life; your feelings open their mind to things they hadn\'t considered.',
  Moon_H10: 'Your emotional nature flows into the space they reserve for public life and purpose. They feel sustained in their ambitions by you; your care reaches them in the moments when they are most exposed to the world.',
  Moon_H11: 'Your emotional warmth flows through the space where they hold friendships and collective hopes. They feel emotionally at home in your social world; your care makes their larger community feel warmer.',
  Moon_H12: 'Your emotional nature reaches the most hidden space in their chart. Something dissolves when you are present — they feel emotionally seen at a level that both unsettles and quiets them.',

  // ── VENUS ────────────────────────────────────────────────────────────────
  Venus_H1: 'Your capacity for love and beauty lands directly in how they see themselves. They feel attractive, appreciated, and more fully themselves in your eyes; your presence is a kind of affirmation they didn\'t know they needed.',
  Venus_H2: 'Your warmth flows into the space where they hold their deepest values. They feel that what they value is beautiful and worthy; you make their inner world feel like something worth cherishing.',
  Venus_H3: 'Your love lands in their mind and the way they speak. Conversations with you feel pleasurable and warm; they find themselves wanting to share ideas with you, to think aloud in your presence.',
  Venus_H4: 'Your warmth flows into the most private and rooted part of their life. They feel your love in their home space — something about your presence makes their inner world beautiful and safe.',
  Venus_H5: 'Your capacity for love and beauty flows directly into the space they hold for joy and romance. They experience you as someone who makes pleasure easy — effortless, genuine, and lit from within.',
  Venus_H6: 'Your care and love land in their daily life. They feel appreciated in small, consistent ways; your warmth makes their routines feel less like duty and more like something they are glad to be living.',
  Venus_H7: 'Your capacity for love and beauty lands directly in their house of committed partnership. You are felt, in their deepest relational space, as precisely the kind of person they have been looking for — someone who beautifies the bond itself.',
  Venus_H8: 'Your love reaches the most intimate and guarded space in their chart. They feel your warmth in their depths — something about your affection makes vulnerability feel worth risking, transforms what they thought was too fragile to share.',
  Venus_H9: 'Your love flows into the space where they reach for meaning and expansion. They feel inspired and made more beautiful by your mind and your worldview; love with you feels like a kind of education.',
  Venus_H10: 'Your warmth and beauty land in the space they hold for their public role and purpose. They feel more admired and graceful in the world when you are part of their life; your love gives them something to stand taller for.',
  Venus_H11: 'Your love flows through the space where they build their social world and collective hopes. They feel your warmth within their friendships and communities; you fit naturally into the future they are trying to build.',
  Venus_H12: 'Your capacity for love and beauty enters the most hidden chamber of their chart. They feel your love in ways they can barely articulate — something spiritual and private, a tenderness that reaches what they rarely let anyone touch.',

  // ── MARS ─────────────────────────────────────────────────────────────────
  Mars_H1: 'Your drive and energy land in the core of their self. They feel activated in your presence — more alive, more willing to act; you make them feel capable of things they had been hesitating on.',
  Mars_H2: 'Your energy flows into the space where they build security and hold their values. They feel motivated to earn, to protect, to make something real; your drive makes them take their own resources more seriously.',
  Mars_H3: 'Your assertive energy lands in their mind and the way they communicate. They feel mentally sharper around you, more willing to argue a point; your presence makes their thinking faster and less apologetic.',
  Mars_H4: 'Your drive flows into their home space and emotional foundations. They feel an energized charge in their domestic life when you are present — sometimes friction, sometimes fuel, but never static.',
  Mars_H5: 'Your desire and passion land directly in their space of joy, romance, and creative fire. They feel the heat of your wanting — pleasure with you has an edge, a vitality that makes ordinary romance feel insufficient by comparison.',
  Mars_H6: 'Your energy lands in their daily life and physical routines. They feel pushed to be more productive, more physically engaged; your drive makes them want to do the work they have been putting off.',
  Mars_H7: 'Your desire meets them directly in their house of partnership. They feel the charge of your will against theirs — the relationship has heat and an aliveness that keeps them fully present.',
  Mars_H8: 'Your drive reaches the most private and transformative space in their chart. The intensity between you is something they cannot explain away — sexual and emotional power, a depth of feeling that changes both of you.',
  Mars_H9: 'Your energy lands in the space where they reach for belief and exploration. They feel motivated to act on their convictions; your drive makes their philosophies feel like something worth fighting for.',
  Mars_H10: 'Your ambition flows into their space of career and public purpose. They feel pushed to achieve, to stand for something in the world; your drive amplifies their own professional fire.',
  Mars_H11: 'Your energy lands in the space where they build community and shared vision. They feel rallied in your presence — more willing to act on collective goals, to fight for the future they believe in.',
  Mars_H12: 'Your drive reaches the most private and hidden space in their chart. Something stirs in them that they don\'t usually show — a private intensity that your energy coaxes out from behind their careful presentation.',

  // ── MERCURY ──────────────────────────────────────────────────────────────
  Mercury_H1: 'Your mind lands in the space where they meet the world. They feel quick and articulate in your presence — stimulated at the surface, engaged in a way that makes them want to keep talking.',
  Mercury_H2: 'Your way of thinking flows into the space where they hold their values and material world. They find themselves articulating what they believe in, putting words to things they had left unspoken; your mind makes their inner worth legible.',
  Mercury_H3: 'Your mind lands in the space that is most naturally theirs — their communication, curiosity, and local world. Conversation with you flows effortlessly; ideas multiply, and thinking alongside you becomes one of the pleasures of the relationship.',
  Mercury_H4: 'Your thoughts and communication land in the most private space of their chart. They find themselves telling you things they don\'t ordinarily say — your mind reaches into their home territory and makes it feel worth articulating.',
  Mercury_H5: 'Your playful and curious mind lands in their space of joy and creative expression. They feel witty and inspired around you — lighter, more willing to play with ideas; your thinking makes romance feel intelligent.',
  Mercury_H6: 'Your analytical mind flows into the space where they manage daily life and routines. They feel more organized and capable with you around; your thinking helps them cut through the practical complexity they usually face alone.',
  Mercury_H7: 'Your mind meets them directly in their house of partnership. They feel intellectually matched — someone who thinks in ways that complement their own, a partner who makes the relationship itself smarter.',
  Mercury_H8: 'Your thinking reaches the space where they hold their deepest transformations and private life. They feel unusually seen in conversation with you — your mind goes where others don\'t, and they find that reach both uncommon and necessary.',
  Mercury_H9: 'Your ideas land in the space where they seek meaning and expansion. They feel broadened by your thinking; your perspective opens philosophical doors they hadn\'t found on their own.',
  Mercury_H10: 'Your communication and intellectual presence land in the space of their public life and ambition. They feel more capable and credible when your thinking is part of their world; your words carry weight in the domains that matter most to their purpose.',
  Mercury_H11: 'Your mind flows through the space where they hold their social world and collective visions. They feel intellectually enriched within shared communities; your thinking aligns with the larger picture they are building.',
  Mercury_H12: 'Your words and thoughts land in the most hidden and private space of their chart. They find themselves thinking things in your presence that they have never quite thought before — your communication reaches the underground chamber of their inner life.',
}

/**
 * Returns the relational brief for an inner planet in a partner house,
 * or null for outer planets (signals caller to use the generic template fallback).
 */
export function getSynastryHouseOverlayBrief(planet: string, house: number): string | null {
  const key = `${planet}_H${house}`
  return SYNASTRY_HOUSE_OVERLAY_BRIEFS[key] ?? null
}
