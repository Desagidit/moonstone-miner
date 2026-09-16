# Moonstone character database

Official source: https://www.moonstonethegame.com/downloads

This catalogue imports the August 2026 English character-card bundle. Each PDF page is preserved as a separate record, including alternate/summoned cards. It must not be interpreted as 141 independently selectable troupe members.

## Outputs

- `data/characters.json`: structured records for a browser application.
- `data/moonstone.sqlite`: searchable characters, abilities and keywords. The full JSON record is retained in `characters.record_json`.
- `data/cards/`: front and signature card together as PNGs, one per page.
- `data/sources/`: original PDF cards, rules and official category pages.
- `data/extraction.json`: every extracted text glyph with position, font and colour; vector graphic bounds and colours. This retains information that automatic segmentation may misinterpret.
- `data/quality-report.json`: coverage and unresolved extraction issues.
- `data/faction-icons.json`: source icon hashes, grouped by card pages.

## Rebuild

## Review screen

Run `./start-review.ps1` in PowerShell, or `python review_server.py`, then open http://127.0.0.1:8765. The app runs locally and saves to this workspace. Keep the server running while reviewing.

Search characters, scroll through the fields, compare against the original image, edit values and click **Verify and save whole card** when the complete card is checked. Use **Save changes** to keep unfinished edits before moving to another card. Notes and unresolved states are retained. Any field edit returns that field to **Needs review** until reconfirmed. Use the zoom slider and official PDF link for fine details.

Reviews are stored separately in `data/reviews.json`, keyed by the source PDF SHA-256 and page number. Only fields edited or explicitly reviewed are overridden; untouched fields remain available for improved extraction. Saves refresh both JSON and SQLite. Back up `reviews.json` with the source bundle; changing the source hash cannot accidentally apply old corrections to a different card.

The screen separates identity, factions, stats, ordered health dots, abilities, signature moves, character links and troupe eligibility. Eligibility is a binary Selectable/Summon decision, populated and verified from the full card text. No explanation or evidence entry is required. Summoned-only wording and Striga Anya’s Summoned Being restriction identify summons. Health and energy totals must match the track before both can be verified. The progress counter means all eight groups were verified, not simply that a card was opened.

Stop the review server before rebuilding the database. Run `python test_reviews.py` for isolated persistence and stale-save checks. `data/review-progress.json` contains verification totals.

### Import commands

Use Python 3.11+ with `pip install -r requirements.txt`, then `python build_database.py`. The import runs offline against the archived source bundle and overwrites generated outputs. The local Codex bundled Python can also run it.

## Data quality

This is an initial import, not a fully checked rules database. Every record carries explicit review flags. Factions were assigned from a visual review of the card symbols; multiple-faction eligibility needs icon verification. Printed headings segment passives, actions and arcane actions; complex nested rules can require manual corrections. Null stats preserve special values in raw text; null signature damage means the printed no-damage symbol, not zero. Raw Wingdings characters are font encodings rather than meaningful letters. The original card image and positioned glyph archive are the authoritative fallback.

Health tracks preserve the ordered blue energy dots. Signature damage tables, damage type and highlighted outcomes are extracted where recognised. Arcane result colour extraction is provisional. Full rule text, including catastrophes, remains in the raw front/back fields regardless of segmentation.

Official character links are attached only when the name is found in an archived category page. Some records have no matched page; every record has a direct official PDF page link. Source version is the bundle filename, with individual printed card versions separately retained.

For the troupe builder, JSON is the portable export and SQLite is the working database. Before enforcing legality, add verified multiple-faction membership, selection restrictions, summons and transformation relationships from the card rules and official troupe-building rules. Keep hand-reviewed corrections separately so imports cannot overwrite them.

Example query:

```sql
SELECT c.name, a.name, a.energy_cost, a.text
FROM characters c JOIN abilities a ON a.character_id=c.id
WHERE a.category='arcane_action' ORDER BY c.name;
```
Custom tags are editable and saved separately from printed keywords. The tag pass assigns Healer (including self healing), Tank (8+ health), Energetic (4+ energy), Blue/Green/Red arcane colours, Shover (movement or relocation of another model), Woodland and Wet. Pink/red result symbols are normalised to red. Run python tags_pass.py to repeat the source-colour and tag pass; this explicitly replaces custom tag assignments, so ordinary rebuilds should use build_database.py to preserve manual tags. SQLite exposes custom_tags(character_id, tag). The review form now contains nine sections.
Troupe builder: http://127.0.0.1:8765/builder. Browse all cards, focus a card, add/remove selectable faction-compatible members, and combine filter groups using AND/OR both within and between groups. Numeric filters support =, !=, >=, <=, > and <. Select a faction and game size (4/5/6). Incompatible cards remain visible with red outlines; switching faction preserves the roster and marks incompatible members. Summons are browsable but cannot be selected. Tags and keywords count once per member. The current troupe persists in local browser storage under moonstone-troupe-v1; card review data remains server-backed. Run node test_team_logic.cjs and node test_builder_ui.cjs for builder logic and state checks.

## GitHub Pages

The builder is published from main by .github/workflows/pages.yml. Deployment renders the source card PDF at 360 DPI and exports the builder, catalogue and images to site/. Relative paths support GitHub project Pages URLs. Troupes save in each visitor's browser; editing/review remains local. Published cards update when the database and reviews are committed. Generated images, extraction metadata and SQLite are excluded from Git; source PDFs, JSON and overlays are tracked. Ordinary deployments use the committed catalogue without overwriting manual reviews.

To generate a static copy locally: python render_card_images.py, then python export_site.py.

Moonstone artwork and rules belong to Goblin King Games. This is an unofficial troupe builder with links to official cards and rules.

Suggested partners are authored tactical inferences from every complete August 2026 character card and signature move. They are starting cores, rather than official ratings or playtested rankings. Each of the 141 source records has three suggested selectable partners for each supported faction (168 cores). Cross-faction characters get separate faction routes. Summons recommend a three-character starting core including their initial summoner or transformation provider; the summon itself is never selected. The three Murder Bunny source records retain identical suggestions.

`data/partner-curation.tsv` contains the authored plans and per-partner reasons, bound to the PDF SHA-256. `python suggested_partners.py` compiles `data/suggested-partners.json`; `python suggested_partners.py --check` verifies full coverage, faction compatibility, unique names, Evolution exclusions and summon providers. Recommendations are attached to the portable character JSON, retained in SQLite `record_json`, and indexed in the `suggested_partners` table. Reimports and review saves reattach the source-bound curation. When changing the card bundle, review the curation and provider relationships before updating its source hash.

The builder shows three partners below the card graphic for the focused character, adapts to the selected faction, and uses normal legality and size checks when adding one. Adding a suggested partner preserves the original focused character. Evolution [Grub] is enforced in both directions; Undecided troupes cannot add characters with no possible shared faction.

Painted miniature photos and shop deeplinks are attached as each character's `miniature` object and preserved in SQLite `record_json`. `data/miniatures.json` is bound to the card-bundle SHA-256. The official public product snapshots are `data/sources/shop-products.json` and `shop-products-2.json` (323 products). `python miniatures.py` compiles exact-name/explicit-alias matches; `python miniatures.py --check` checks the export. Matching excludes stat-card products, packaging images and larger-scale models. The shop's landscape painted photos are used rather than its portrait stat-card previews. Store pages are individual miniatures where available; Gradock retains the supplied Brothers in Arms variant link. The duplicate Murder Bunny cards share the Bunny group photo; Streatham and Pickles share a painted image. The nursery Babelings have individual painted photos from Nanny's product gallery.

In the focused card controls, the photo icon opens an accessible native dialog with the miniature's painted photo and a store link. Close with the button, Escape or the backdrop. Photos load from the official shop CDN; an unavailable photo leaves the store link usable. Artwork remains attributed to Goblin King Games. Reimports and local review saves reattach the source-bound miniature metadata.

Quick strategy guides appear below the selected card, before suggested partners. Every source record has an authored role, game plan, support needs and caution. `data/strategy-curation.tsv` is compiled by `python character_guides.py` into source-bound `data/character-guides.json`; `python character_guides.py --check` and `python test_character_guides.py` check complete coverage and relationships. Published background is recorded in `data/strategy-sources.json`, with official/community labels, links, short research notes and the research date. Current August 2026 cards take precedence over older advice. These guides are tactical judgement, not official ratings or playtested rankings. All guides link the current card, and relevant guides also link published advice.

Named summons, keyword-selected Psychopomps, conditional Encore returns and Anya transformations have clickable outgoing and incoming links. Igor's King summon is explicitly Shades-only. Jackalope and Echo remain selectable despite having summon routes. Generic Reanimate and borrowed abilities do not imply fixed target lists. Guides and relationships survive review saves and reimports via `review_store.apply_reviews`, and remain in SQLite `record_json`. When replacing the source PDF, review the guide curation and relationship list before changing their source binding.

The builder card has no zoom control. Previous/Next sits beside Add to troupe and follows in-session character browsing, including partner and summon links. New browsing after Previous replaces the forward branch; troupe edits, faction/size changes and adding a suggested partner while retaining focus do not create extra visits.

Named troupes can be saved, loaded, renamed and created locally. Saved snapshots use `moonstone-troupes-v2`; the working draft survives reloads separately, so editing a troupe does not overwrite its saved version until Save. Existing `moonstone-troupe-v1` drafts migrate automatically. Storage is specific to the browser, device and site origin.

`data/character-ratings.tsv` contains six source-bound 0–5 estimates for every card: Tank (survival), Damage (offensive threat), Support (healing/buffs/energy/control), Moonstone (objective collection and carrying), Complexity (sequencing/rules burden), and Range (useful attack/ability reach). Higher Complexity means more demanding. Ratings incorporate card roles and expected use, including a summoner's indirect impact; they are comparative starting estimates rather than official scores. Identical Murder Bunny cards share identical ratings. Compile with `python character_guides.py`, then apply reviews/export to enrich `troupe_metrics`. The radar uses arithmetic averages of the selected starting characters, with zero for an empty troupe, and excludes additional summons and conditional faction/partner bonuses.

Character tiles show a tick beside the name for troupe members and a gold favourite star beside the keywords. Favourites use independent browser storage (`moonstone-favourites-v1`) and remain across troupe changes. The Favourite Yes/No filter participates in the existing AND/OR groups. Star clicks preserve the focused card and browsing history.

The troupe builder now uses six fixed slots and derives faction from slot 1, with dual-faction leaders allowing either shared route until other members narrow it. Drag a member onto another slot to reorder; the drag handle also supports up/down arrow keys. Reordering updates compatibility and partner suggestions while preserving card browsing history. Order persists in both draft and saved snapshots. Legacy game sizes and manual faction choices are replaced by six slots and the faction derived from the stored order.

Combine filters starts collapsed. Troupe controls now consist of Troupes and New / Save / Load / Rename. New prompts for a name, creates an empty saved troupe and selects it; Rename immediately persists the selected troupe name. Save updates the loaded troupe snapshot. Without any troupes, Save, Load and Rename are disabled and New is required. Existing saved troupes and drafts remain compatible.

Selecting a troupe loads it automatically. Switching from a changed loaded troupe opens an in-page “Save current troupe?” dialog: Save commits the current snapshot and switches, Discard switches without updating that snapshot, and Cancel keeps the current draft. Failed storage writes retain the current troupe.

Troupes now autosave after every member addition, removal, reorder and rename. The dropdown switches directly, with New and Rename icons alongside it. The Save button and unsaved-switch dialog have been removed. Legacy drafts are folded into their active troupe on restoration. Dotted strips on the left of slots indicate dragging; empty slots remain drop targets.

Troupe selection and New/Rename icons live in the header. The roster heading displays the active troupe name. The faction funnel beside the derived faction toggles compatible cards, follows the current shared faction options and disables/resets for an empty troupe; Clear filters resets it too. The header no longer shows the card count or official-card link.

Filters now present one setting for every available field with implicit AND. All rows start inactive; changing a setting activates it, and its X resets it to Any without removing the row. Stats use minimums; base size and card version use exact dropdown values, alongside categorical fields. Active rows use a subtle accent. Filter groups and operator controls are no longer part of the UI.

Numeric filters now use discrete sliders over the distinct valid values in the catalogue, with an initial Any position. Stats remain minimum thresholds and base size remains exact. Card Version and Review Status were removed. Summon is a switch: on shows summons, off leaves eligibility unrestricted. X resets any control to its inactive state.

Use **Compare** in the header to select saved troupes and inspect their members, faction, average radar profile and keyword counts. Click a character name to open its card above the comparer. **Share** copies an MS1 code containing the troupe name and ordered character names; import validates the code and creates a separate saved troupe. Codes work across browsers without an account; they do not include favourites or personal browser data.

Strategy and Partners share keyboard-accessible tabs beneath the inspected card. Faction filtering automatically starts when the first hero is added or a populated troupe is loaded, and resets for an empty troupe. The faction funnel remains a manual override.
