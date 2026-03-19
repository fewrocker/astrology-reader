# Proposal: API Key Security Fix

## Problem / Opportunity

**CRITICAL SECURITY ISSUE**: `src/services/gptInterpretation.ts` contains a hardcoded OpenAI API key (`DEFAULT_KEY = 'sk-NEPOjeV...'`). This key is bundled into the production JavaScript and visible to anyone who opens browser dev tools. It can be extracted, abused for unlimited API calls, and will incur charges on the key owner's account.

This is the highest-priority fix in the entire project.

## Proposed Solution

1. Remove the hardcoded `DEFAULT_KEY` entirely
2. Make GPT features gracefully degrade when no key is provided:
   - Show a prompt asking users to enter their own OpenAI API key
   - Store user-provided key in localStorage (already implemented)
   - When no key is available, hide "Discuss ✦" buttons and skip GPT interpretation, falling back to static readings
3. Add a settings modal/section where users can enter/update/remove their API key

## Impact & Effort

- **Impact**: CRITICAL — Prevents API key abuse and potential financial liability
- **Effort**: Low (1 hour)
- **Dependencies**: F12 (GPT Layer), F13 (Discuss Modal)

## Implementation Summary

- Remove `DEFAULT_KEY` constant from `src/services/gptInterpretation.ts`
- Update `getStoredApiKey()` to return `null` when no key is stored
- Add an API key input prompt in the UI (modal or settings panel)
- Conditionally render GPT-dependent buttons based on key availability
- Show "Enter your OpenAI API key to unlock AI features" message where GPT features would appear
