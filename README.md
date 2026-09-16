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
