# Desktop (1440x900) — action log

106 recorded screen changes. One row per action; the step number links to the frame it produced.
Machine-readable equivalents: `actions.jsonl` (one JSON object per step) and `run.json` (whole run, including per-step state diffs).

- Viewport: 1440x900 @1x, touch off
- Layout under test: three-column desktop grid (>=1100px)
- Screenshots: viewport
- Seeded rolls: `Math.random` replaced with mulberry32(0x9e3779b9) so the prompt sequence is identical across profiles
- Prompts drawn: 4a → 5a → 5b → 3a → 4b → 8a

Counts column: memories-in-mind/slots · experiences · diary · lost · characters/skills/resources/marks.

| # | Phase | Action | What was done | Target | Resulting screen | Counts |
| --- | --- | --- | --- | --- | --- | --- |
| [001](screens/001-home-screen-no-saves.png) | home | observe | Home screen, no saves |  | home | — |
| [002](screens/002-open-saves-from-home.png) | home | tap | Open Saves from Home | #menu-saves-button | saves | — |
| [003](screens/003-back-to-home.png) | home | tap | Back to Home | #saves-back-button | home | — |
| [004](screens/004-new-vampire.png) | creation | tap | New Vampire | #new-vampire-button | creation 1 / 8 — Name your vampire | — |
| [005](screens/005-step-1-name-and-first-memory.png) | creation | type | Step 1: name and first memory | #memory-identity | creation 1 / 8 — Name your vampire | 0m/5 · 0exp · 0diary · 0lost · 0/0/0/0 |
| [006](screens/006-next-to-step-2-mortals.png) | creation | tap | Next to step 2 (Mortals) | #next-button | creation 2 / 8 — Mortals | 1m/5 · 1exp · 0diary · 0lost · 0/0/0/0 |
| [007](screens/007-draft-mortal-marek-vess.png) | creation | type | Draft mortal Marek Vess | #mortal-form | creation 2 / 8 — Mortals | 1m/5 · 1exp · 0diary · 0lost · 0/0/0/0 |
| [008](screens/008-add-mortal-marek-vess.png) | creation | tap | Add mortal Marek Vess | #mortal-form button[type=submit] | creation 2 / 8 — Mortals | 1m/5 · 1exp · 0diary · 0lost · 1/0/0/0 |
| [009](screens/009-draft-mortal-sister-ilka.png) | creation | type | Draft mortal Sister Ilka | #mortal-form | creation 2 / 8 — Mortals | 1m/5 · 1exp · 0diary · 0lost · 1/0/0/0 |
| [010](screens/010-add-mortal-sister-ilka.png) | creation | tap | Add mortal Sister Ilka | #mortal-form button[type=submit] | creation 2 / 8 — Mortals | 1m/5 · 1exp · 0diary · 0lost · 2/0/0/0 |
| [011](screens/011-draft-mortal-captain-doru.png) | creation | type | Draft mortal Captain Doru | #mortal-form | creation 2 / 8 — Mortals | 1m/5 · 1exp · 0diary · 0lost · 2/0/0/0 |
| [012](screens/012-add-mortal-captain-doru.png) | creation | tap | Add mortal Captain Doru | #mortal-form button[type=submit] | creation 2 / 8 — Mortals | 1m/5 · 1exp · 0diary · 0lost · 3/0/0/0 |
| [013](screens/013-next-to-step-3-skills.png) | creation | tap | Next to step 3 (Skills) | #next-button | creation 3 / 8 — Skills | 1m/5 · 1exp · 0diary · 0lost · 3/0/0/0 |
| [014](screens/014-add-skill-physician.png) | creation | tap | Add skill Physician | #skill-form button[type=submit] | creation 3 / 8 — Skills | 1m/5 · 1exp · 0diary · 0lost · 3/1/0/0 |
| [015](screens/015-add-skill-reads-the-tide.png) | creation | tap | Add skill Reads the Tide | #skill-form button[type=submit] | creation 3 / 8 — Skills | 1m/5 · 1exp · 0diary · 0lost · 3/2/0/0 |
| [016](screens/016-add-skill-patient.png) | creation | tap | Add skill Patient | #skill-form button[type=submit] | creation 3 / 8 — Skills | 1m/5 · 1exp · 0diary · 0lost · 3/3/0/0 |
| [017](screens/017-next-to-step-4-resources.png) | creation | tap | Next to step 4 (Resources) | #next-button | creation 4 / 8 — Resources | 1m/5 · 1exp · 0diary · 0lost · 3/3/0/0 |
| [018](screens/018-add-resource-the-lamp-room.png) | creation | tap | Add resource The Lamp Room | #resource-form button[type=submit] | creation 4 / 8 — Resources | 1m/5 · 1exp · 0diary · 0lost · 3/3/1/0 |
| [019](screens/019-add-resource-father-s-ledger.png) | creation | tap | Add resource Father's Ledger | #resource-form button[type=submit] | creation 4 / 8 — Resources | 1m/5 · 1exp · 0diary · 0lost · 3/3/2/0 |
| [020](screens/020-add-resource-a-case-of-silver-knives.png) | creation | tap | Add resource A Case of Silver Knives | #resource-form button[type=submit] | creation 4 / 8 — Resources | 1m/5 · 1exp · 0diary · 0lost · 3/3/3/0 |
| [021](screens/021-next-to-step-5-more-memories.png) | creation | tap | Next to step 5 (More Memories) | #next-button | creation 5 / 8 — More Memories | 1m/5 · 1exp · 0diary · 0lost · 3/3/3/0 |
| [022](screens/022-draft-memory-2-tagged-marek-vess-physician.png) | creation | type | Draft memory 2 tagged Marek Vess + Physician | #memory-form-later | creation 5 / 8 — More Memories | 1m/5 · 1exp · 0diary · 0lost · 3/3/3/0 |
| [023](screens/023-add-memory-2.png) | creation | tap | Add memory 2 | #memory-form-later button[type=submit] | creation 5 / 8 — More Memories | 2m/5 · 2exp · 0diary · 0lost · 3/3/3/0 |
| [024](screens/024-draft-memory-3-tagged-sister-ilka-reads-the-tide.png) | creation | type | Draft memory 3 tagged Sister Ilka + Reads the Tide | #memory-form-later | creation 5 / 8 — More Memories | 2m/5 · 2exp · 0diary · 0lost · 3/3/3/0 |
| [025](screens/025-add-memory-3.png) | creation | tap | Add memory 3 | #memory-form-later button[type=submit] | creation 5 / 8 — More Memories | 3m/5 · 3exp · 0diary · 0lost · 3/3/3/0 |
| [026](screens/026-draft-memory-4-tagged-captain-doru-patient.png) | creation | type | Draft memory 4 tagged Captain Doru + Patient | #memory-form-later | creation 5 / 8 — More Memories | 3m/5 · 3exp · 0diary · 0lost · 3/3/3/0 |
| [027](screens/027-add-memory-4.png) | creation | tap | Add memory 4 | #memory-form-later button[type=submit] | creation 5 / 8 — More Memories | 4m/5 · 4exp · 0diary · 0lost · 3/3/3/0 |
| [028](screens/028-next-to-step-6-the-immortal.png) | creation | tap | Next to step 6 (The Immortal) | #next-button | creation 6 / 8 — The Immortal | 4m/5 · 4exp · 0diary · 0lost · 3/3/3/0 |
| [029](screens/029-add-immortal-the-salt-lady.png) | creation | tap | Add immortal The Salt Lady | #immortal-form button[type=submit] | creation 6 / 8 — The Immortal | 4m/5 · 4exp · 0diary · 0lost · 4/3/3/0 |
| [030](screens/030-next-to-step-7-your-mark.png) | creation | tap | Next to step 7 (Your Mark) | #next-button | creation 7 / 8 — Your Mark | 4m/5 · 4exp · 0diary · 0lost · 4/3/3/0 |
| [031](screens/031-add-mark-wet-footprints.png) | creation | tap | Add mark Wet Footprints | #mark-form button[type=submit] | creation 7 / 8 — Your Mark | 4m/5 · 4exp · 0diary · 0lost · 4/3/3/1 |
| [032](screens/032-next-to-step-8-the-curse.png) | creation | tap | Next to step 8 (The Curse) | #next-button | creation 8 / 8 — The Curse | 4m/5 · 4exp · 0diary · 0lost · 4/3/3/1 |
| [033](screens/033-draft-curse-memory-tagged-wet-footprints-the-lamp-room.png) | creation | type | Draft curse memory tagged Wet Footprints + The Lamp Room | #memory-form-curse | creation 8 / 8 — The Curse | 4m/5 · 4exp · 0diary · 0lost · 4/3/3/1 |
| [034](screens/034-save-play-enter-play-at-prompt-1a.png) | play | tap | Save & Play — enter play at prompt 1a | #next-button | prompt 1a · memories · characters | 5m/5 · 5exp · 0diary · 0lost · 4/3/3/1 |
| [035](screens/035-traits-tab-characters-column-always-open-on-desktop.png) | play | observe | Traits tab (Characters) (column always open on desktop) |  | prompt 1a · memories · characters | 5m/5 · 5exp · 0diary · 0lost · 4/3/3/1 |
| [036](screens/036-check-the-first-character.png) | play | tap | Check the first character | #play-character-list .play-trait-action… | prompt 1a · memories · characters | 5m/5 · 5exp · 0diary · 0lost · 4/3/3/1 |
| [037](screens/037-memories-tab.png) | play | tap | Memories tab | .play-bottom-tab[data-play-tab='memorie… | prompt 1a · memories · characters | 5m/5 · 5exp · 0diary · 0lost · 4/3/3/1 |
| [038](screens/038-open-memory-1.png) | play | tap | Open memory 1 | #play-memory-list .play-memory-row[0] | prompt 1a · detail: Memory I · characters | 5m/5 · 5exp · 0diary · 0lost · 4/3/3/1 |
| [039](screens/039-compose-experience.png) | play | type | Compose experience | #play-experience-text | prompt 1a · detail: Memory I · characters | 5m/5 · 5exp · 0diary · 0lost · 4/3/3/1 |
| [040](screens/040-save-experience.png) | play | tap | Save Experience | #play-experience-submit | prompt 1a · detail: Memory I · characters | 5m/5 · 6exp · 0diary · 0lost · 4/3/3/1 |
| [041](screens/041-memories-column-desktop-keeps-list-and-detail-together.png) | play | tap | Memories column (desktop keeps list and detail together) | .play-bottom-tab[data-play-tab='memorie… | prompt 1a · memories · characters | 5m/5 · 6exp · 0diary · 0lost · 4/3/3/1 |
| [042](screens/042-mark-prompt-1a-as-resolved.png) | play | tap | Mark PROMPT 1A as resolved | #prompt-resolve-button | prompt 1a · resolved · memories · characters | 5m/5 · 6exp · 0diary · 0lost · 4/3/3/1 |
| [043](screens/043-roll-d10-d6-prompt-4a.png) | play | tap | Roll d10-d6 → PROMPT 4A | #next-prompt-button | prompt 4a · memories · characters | 5m/5 · 6exp · 0diary · 0lost · 4/3/3/1 |
| [044](screens/044-traits-column-always-open-on-desktop.png) | play | observe | Traits (column always open on desktop) |  | prompt 4a · memories · characters | 5m/5 · 6exp · 0diary · 0lost · 4/3/3/1 |
| [045](screens/045-skills-sub-tab.png) | play | tap | Skills sub-tab | .play-trait-subtab[data-trait-subtab='s… | prompt 4a · memories · skills | 5m/5 · 6exp · 0diary · 0lost · 4/3/3/1 |
| [046](screens/046-add-skill-opens-modal.png) | play | tap | Add Skill (opens modal) | #add-skill-button | modal: Add skill | 5m/5 · 6exp · 0diary · 0lost · 4/3/3/1 |
| [047](screens/047-create-skill-bloodthirsty.png) | play | tap | Create skill Bloodthirsty | #play-skill-submit | prompt 4a · memories · skills | 5m/5 · 6exp · 0diary · 0lost · 4/4/3/1 |
| [048](screens/048-memories-tab.png) | play | tap | Memories tab | .play-bottom-tab[data-play-tab='memorie… | prompt 4a · memories · skills | 5m/5 · 6exp · 0diary · 0lost · 4/4/3/1 |
| [049](screens/049-open-memory-2.png) | play | tap | Open memory 2 | #play-memory-list .play-memory-row[1] | prompt 4a · detail: Memory II · skills | 5m/5 · 6exp · 0diary · 0lost · 4/4/3/1 |
| [050](screens/050-compose-experience.png) | play | type | Compose experience | #play-experience-text | prompt 4a · detail: Memory II · skills | 5m/5 · 6exp · 0diary · 0lost · 4/4/3/1 |
| [051](screens/051-save-experience.png) | play | tap | Save Experience | #play-experience-submit | prompt 4a · detail: Memory II · skills | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [052](screens/052-memories-column-desktop-keeps-list-and-detail-together.png) | play | tap | Memories column (desktop keeps list and detail together) | .play-bottom-tab[data-play-tab='memorie… | prompt 4a · memories · skills | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [053](screens/053-mark-prompt-4a-as-resolved.png) | play | tap | Mark PROMPT 4A as resolved | #prompt-resolve-button | prompt 4a · resolved · memories · skills | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [054](screens/054-roll-d10-d6-prompt-5a.png) | play | tap | Roll d10-d6 → PROMPT 5A | #next-prompt-button | prompt 5a · memories · skills | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [055](screens/055-traits-column-always-open-on-desktop.png) | play | observe | Traits (column always open on desktop) |  | prompt 5a · memories · skills | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [056](screens/056-resources-sub-tab.png) | play | tap | Resources sub-tab | .play-trait-subtab[data-trait-subtab='r… | prompt 5a · memories · resources | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [057](screens/057-strike-out-the-first-resource.png) | play | tap | Strike out the first resource | #play-resource-list .play-trait-action … | prompt 5a · memories · resources | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [058](screens/058-memories-tab.png) | play | tap | Memories tab | .play-bottom-tab[data-play-tab='memorie… | prompt 5a · memories · resources | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [059](screens/059-open-memory-3.png) | play | tap | Open memory 3 | #play-memory-list .play-memory-row[2] | prompt 5a · detail: Memory III · resources | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [060](screens/060-compose-experience.png) | play | type | Compose experience | #play-experience-text | prompt 5a · detail: Memory III · resources | 5m/5 · 7exp · 0diary · 0lost · 4/4/3/1 |
| [061](screens/061-save-experience.png) | play | tap | Save Experience | #play-experience-submit | prompt 5a · detail: Memory III · resources | 5m/5 · 8exp · 0diary · 0lost · 4/4/3/1 |
| [062](screens/062-memories-column-desktop-keeps-list-and-detail-together.png) | play | tap | Memories column (desktop keeps list and detail together) | .play-bottom-tab[data-play-tab='memorie… | prompt 5a · memories · resources | 5m/5 · 8exp · 0diary · 0lost · 4/4/3/1 |
| [063](screens/063-mark-prompt-5a-as-resolved.png) | play | tap | Mark PROMPT 5A as resolved | #prompt-resolve-button | prompt 5a · resolved · memories · resources | 5m/5 · 8exp · 0diary · 0lost · 4/4/3/1 |
| [064](screens/064-roll-d10-d6-prompt-5b.png) | play | tap | Roll d10-d6 → PROMPT 5B | #next-prompt-button | prompt 5b · memories · resources | 5m/5 · 8exp · 0diary · 0lost · 4/4/3/1 |
| [065](screens/065-open-memory-4.png) | play | tap | Open memory 4 | #play-memory-list .play-memory-row[3] | prompt 5b · detail: Memory IV · resources | 5m/5 · 8exp · 0diary · 0lost · 4/4/3/1 |
| [066](screens/066-compose-experience.png) | play | type | Compose experience | #play-experience-text | prompt 5b · detail: Memory IV · resources | 5m/5 · 8exp · 0diary · 0lost · 4/4/3/1 |
| [067](screens/067-save-experience.png) | play | tap | Save Experience | #play-experience-submit | prompt 5b · detail: Memory IV · resources | 5m/5 · 9exp · 0diary · 0lost · 4/4/3/1 |
| [068](screens/068-save-a-second-experience-into-the-same-memory.png) | play | tap | Save a second experience into the same memory | #play-experience-submit | prompt 5b · detail: Memory IV · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [069](screens/069-memories-column-desktop-keeps-list-and-detail-together.png) | play | tap | Memories column (desktop keeps list and detail together) | .play-bottom-tab[data-play-tab='memorie… | prompt 5b · memories · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [070](screens/070-mark-prompt-5b-as-resolved-warnings-shown.png) | play | tap | Mark PROMPT 5B as resolved — warnings shown | #prompt-resolve-button | dialog: Mark as resolved? | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [071](screens/071-confirm-resolution-despite-warnings.png) | play | tap | Confirm resolution despite warnings | .app-dialog-confirm | prompt 5b · resolved · memories · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [072](screens/072-roll-d10-d6-prompt-3a.png) | play | tap | Roll d10-d6 → PROMPT 3A | #next-prompt-button | prompt 3a · memories · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [073](screens/073-diary-tab.png) | diary | tap | Diary tab | .play-bottom-tab[data-play-tab='diary'] | prompt 3a · diary · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [074](screens/074-memories-tab.png) | diary | tap | Memories tab | .play-bottom-tab[data-play-tab='memorie… | prompt 3a · memories · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [075](screens/075-open-the-full-memory.png) | diary | tap | Open the full memory | #play-memory-list .play-memory-row[3] | prompt 3a · detail: Memory IV · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [076](screens/076-memory-menu-control-not-reachable.png) | diary | blocked | Memory ⋮ menu — control not reachable | #play-memory-detail-more | prompt 3a · detail: Memory IV · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [077](screens/077-add-memory-disabled-all-slots-full.png) | play | blocked | Add memory — disabled, all slots full | #add-memory-button | prompt 3a · detail: Memory IV · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [078](screens/078-mark-prompt-3a-as-resolved-warnings-shown.png) | play | tap | Mark PROMPT 3A as resolved — warnings shown | #prompt-resolve-button | dialog: Mark as resolved? | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [079](screens/079-confirm-resolution-despite-warnings.png) | play | tap | Confirm resolution despite warnings | .app-dialog-confirm | prompt 3a · resolved · detail: Memory IV · re… | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [080](screens/080-roll-d10-d6-prompt-4b.png) | play | tap | Roll d10-d6 → PROMPT 4B | #next-prompt-button | prompt 4b · detail: Memory IV · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [081](screens/081-open-memory-1-again.png) | play | tap | Open memory 1 again | #play-memory-list .play-memory-row[0] | prompt 4b · detail: Memory I · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [082](screens/082-memory-menu-control-not-reachable.png) | play | blocked | Memory ⋮ menu — control not reachable | #play-memory-detail-more | prompt 4b · detail: Memory I · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [083](screens/083-memory-slots.png) | play | tap | Memory slots ⋮ | #memory-slots-more-button | dialog: Memory slots | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [084](screens/084-add-memory-slot.png) | play | tap | Add memory slot | .app-action-sheet-item :text("Add memor… | dialog: Add memory slot? | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [085](screens/085-confirm-adding-a-6th-slot.png) | play | tap | Confirm adding a 6th slot | .app-dialog-confirm | prompt 4b · detail: Memory I · resources | 5m/6 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [086](screens/086-memory-slots-again.png) | play | tap | Memory slots ⋮ again | #memory-slots-more-button | dialog: Memory slots | 5m/6 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [087](screens/087-remove-memory-slot.png) | play | tap | Remove memory slot | .app-action-sheet-item :text("Remove me… | dialog: Remove memory slot? | 5m/6 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [088](screens/088-confirm-removing-the-slot.png) | play | tap | Confirm removing the slot | .app-dialog-confirm | prompt 4b · detail: Memory I · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [089](screens/089-mark-prompt-4b-as-resolved-warnings-shown.png) | play | tap | Mark PROMPT 4B as resolved — warnings shown | #prompt-resolve-button | dialog: Mark as resolved? | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [090](screens/090-confirm-resolution-despite-warnings.png) | play | tap | Confirm resolution despite warnings | .app-dialog-confirm | prompt 4b · resolved · detail: Memory I · res… | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [091](screens/091-roll-d10-d6-prompt-8a.png) | play | tap | Roll d10-d6 → PROMPT 8A | #next-prompt-button | prompt 8a · detail: Memory I · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [092](screens/092-traits-column-always-open-on-desktop.png) | play | observe | Traits (column always open on desktop) |  | prompt 8a · detail: Memory I · resources | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [093](screens/093-marks-sub-tab.png) | play | tap | Marks sub-tab | .play-trait-subtab[data-trait-subtab='m… | prompt 8a · detail: Memory I · marks | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [094](screens/094-avatar-identity-menu.png) | play | tap | Avatar → identity menu | #play-avatar-button | dialog: Iolanthe Vess | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [095](screens/095-dismiss-identity-menu.png) | play | observe | Dismiss identity menu |  | prompt 8a · detail: Memory I · marks | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [096](screens/096-hamburger-session-menu.png) | saves | tap | Hamburger → session menu | #play-hamburger-button | dialog: Menu | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [097](screens/097-go-to-saves.png) | saves | tap | Go to Saves | .app-action-sheet-item :text("Saves") | saves | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [098](screens/098-saves-row-menu.png) | saves | observe | Saves row ⋮ menu |  | dialog: Iolanthe Vess | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [099](screens/099-rename-this-save.png) | saves | tap | Rename this save | .app-action-sheet-item :text("Rename") | dialog: Rename vampire | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [100](screens/100-type-the-new-name.png) | saves | type | Type the new name | #app-dialog-root input | dialog: Rename vampire | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [101](screens/101-confirm-rename.png) | saves | tap | Confirm rename | .app-dialog-confirm | saves | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [102](screens/102-re-enter-play-from-a-saves-row.png) | saves | observe | Re-enter play from a Saves row |  | prompt 1a · memories · marks | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [103](screens/103-hamburger-menu.png) | home | tap | Hamburger menu | #play-hamburger-button | dialog: Menu | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [104](screens/104-return-home.png) | home | tap | Return Home | .app-action-sheet-item :text("Home") | home | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [105](screens/105-continue-resumes-the-same-save.png) | home | tap | Continue resumes the same save | #menu-continue-button | prompt 8a · memories · marks | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
| [106](screens/106-full-page-reload.png) | persistence | observe | Full page reload |  | prompt 8a · memories · characters | 5m/5 · 10exp · 0diary · 0lost · 4/4/3/1 |
