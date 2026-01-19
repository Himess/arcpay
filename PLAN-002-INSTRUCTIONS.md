# Instructions for Claude Code

## YOUR MISSION
Read `CONTACT-SYSTEM-PLAN.md` and implement EVERYTHING. This is for a hackathon - we need to WIN.

## THE KILLER FEATURES YOU'RE BUILDING

1. **Contact System** - "Send 50 to Ahmed" instead of "Send 50 to 0x742d35Cc..."
2. **Subscription Management** - Track Netflix, Spotify, etc with due dates
3. **Voice Commands** - "Pay my Netflix bill", "What bills are due?"
4. **Playground UI** - Beautiful subscription dashboard with Pay Now buttons

## STRICT RULES

1. **NO SHORTCUTS** - Implement every single feature in the plan
2. **NO SKIPPING** - Complete each phase before moving to next
3. **NO TODO/FIXME** - Finish everything, no placeholders
4. **NO `any` TYPE** - Full TypeScript strict mode
5. **RUN TESTS** - After each phase, run tests and fix failures
6. **VERIFY PERSISTENCE** - Contacts must survive page refresh

## EXECUTION ORDER (FOLLOW EXACTLY)

### Phase 1: ContactManager Core
1. Read existing `src/modules/contacts/types.ts` - verify it has all required types
2. Read existing `src/modules/contacts/storage.ts` - verify storage adapters work
3. Create `src/modules/contacts/index.ts` with FULL ContactManager class:
   - CRUD: add, get, getByAddress, list, update, delete
   - Resolution: resolve, resolveAll (with fuzzy matching)
   - Subscriptions: getSubscriptions, getDueSubscriptions, getUpcomingSubscriptions, getOverdue, markPaid, snooze
   - Bulk: import, export
   - Use Levenshtein distance for fuzzy search

### Phase 2: Exports & Tests
4. Export ContactManager from `src/index.ts`
5. Create comprehensive `test/contacts.test.ts` with ALL test cases from plan
6. Run: `npm test -- contacts`
7. Fix any failing tests

### Phase 3: Voice Integration
8. Update `src/voice/voice-agent.ts`:
   - Add ContactManager integration
   - Add new voice command handlers for contacts and subscriptions
9. Update `src/modules/intent/parser.ts`:
   - Add all new regex patterns from plan

### Phase 4: SDK Integration
10. Update `src/core/client.ts`:
    - Add `contacts: ContactManager` property
    - Auto-resolve contact names in transfer()
    - Auto-mark subscription as paid after transfer
11. Update `src/simple/index.ts`:
    - Add contact functions: addContact, getContact, listContacts, deleteContact
    - Add subscription functions: addSubscription, getDueBills, payBill, payAllDueBills, snoozeBill

### Phase 5: Playground UI
12. Update `website/src/app/playground/page.tsx`:
    - Add Contacts panel with search, add, edit, delete
    - Add Subscriptions panel with:
      - DUE TODAY section (red)
      - OVERDUE section (orange)
      - UPCOMING section (yellow)
      - PAID THIS MONTH section (green)
    - Add Contact modal with subscription fields
    - Add Pay Now, Pay All Due, Snooze buttons
    - Persist to localStorage

### Phase 6: Final Verification
13. Run full test suite: `npm test`
14. Test voice commands manually in playground
15. Verify persistence (refresh page, contacts still there)
16. Report completion with summary

## QUALITY CHECKLIST

Before marking complete, verify:
- [ ] Can add contact: "save ahmed as 0x..."
- [ ] Can pay contact: "send 50 to ahmed"
- [ ] Can add subscription: "add netflix subscription 15.99 monthly"
- [ ] Can check bills: "what bills are due"
- [ ] Can pay bill: "pay my netflix"
- [ ] Can pay all: "pay all my bills"
- [ ] Can snooze: "snooze netflix for 3 days"
- [ ] Playground shows subscription dashboard
- [ ] Pay Now button works
- [ ] Pay All Due button works
- [ ] Contacts persist after page refresh
- [ ] All tests pass

## FILES TO CREATE/MODIFY

```
src/modules/contacts/index.ts     [CREATE]
src/modules/contacts/types.ts     [VERIFY/UPDATE]
src/modules/contacts/storage.ts   [VERIFY/UPDATE]
src/index.ts                      [UPDATE - add exports]
src/voice/voice-agent.ts          [UPDATE]
src/modules/intent/parser.ts      [UPDATE]
src/core/client.ts                [UPDATE]
src/simple/index.ts               [UPDATE]
website/src/app/playground/page.tsx [UPDATE]
test/contacts.test.ts             [CREATE]
```

## START NOW

Begin with Phase 1. Read the existing files first, then implement ContactManager.

**DO NOT STOP UNTIL EVERYTHING IS COMPLETE AND WORKING.**

**THIS WILL WIN THE HACKATHON. BUILD IT PERFECTLY.**
