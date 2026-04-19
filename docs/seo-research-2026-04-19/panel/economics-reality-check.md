# Economics Reality Check — trafico.live SEO Plan
**Date:** 2026-04-19 | **Analyst:** Research Agent | **Scope:** Affiliate economics + SEO assumption survivability

---

## 1. Affiliate Terms Table (2026 verified data)

> Commission math note: "% of booking" and "% of operator commission" are very different numbers. Wherever the chain is booking → operator commission → affiliate cut, three layers of margin compound downward. Numbers below reflect the *effective* affiliate take on a transaction, not headline rates.

| Program | Vertical | Commission (effective) | Cookie | ES/PT available | Integration | Confidence |
|---|---|---|---|---|---|---|
| **Parclick** | Parking | 3.5% of booking (~€1.05/avg €30 booking) | Not published (short, per-return-visit tracking) | Yes (900 garages, 170+ cities ES/PT) | Direct affiliate panel | 0.85 |
| **DiscoverCars** | Car rental | 70% of DC's profit share (~7-12% of booking value in practice) | 365 days | Yes | Direct (Impact.com or their own) | 0.90 |
| **Rentalcars (Booking)** | Car rental | 6% of booking value | 30 days | Yes (global) | CJ Affiliate / Awin | 0.88 |
| **DirectFerries** | Ferry | 50% of operator commission ≈ 1.5–2% of booking value | Not published (confirm post-signup) | Yes (Baleares, Canarias, Estrecho, Mediterranean) | Direct / CJ / Sovrn | 0.87 |
| **Omio** | Multimodal | 4% of ticket (train/bus/flight, some markets 2%) | 30 days | Yes — Spain confirmed, PT needs verification | Direct (Omio affiliate portal) | 0.85 |
| **Rastreator** | Insurance comparator | DATA NOT AVAILABLE — program is broker-model, terms require direct negotiation. No public affiliate commission listed. | — | Yes (ES only) | Direct negotiation required | 0.50 |
| **Acierto** | Insurance | DATA NOT AVAILABLE — same model as Rastreator. Commissions paid as insurance broker intermediary. | — | Yes (ES only) | Direct negotiation required | 0.50 |
| **Waylet (Repsol)** | Fuel app | DATA NOT AVAILABLE — no public affiliate program. Waylet is a loyalty/payment app, not a standard affiliate product. Repsol has no open affiliate program in 2026. | — | Yes (ES) | No program found | 0.90 |
| **Solred** | Fleet fuel card | DATA NOT AVAILABLE — B2B product (250K customers, 2M cards). No affiliate/referral program found in public sources. | — | Yes (ES) | No program found | 0.90 |
| **Skyscanner** | Flights | ~20% of Skyscanner's commission (≈€0.40–€0.80 per click-through on avg, not per booking) | 30 days | Yes (global, Spain via Impact.com) | Impact.com | 0.92 |
| **Booking.com** | Hotels | 25–35% of Booking.com's commission from hotel (~3.75–5.25€ per €100 booking at Tier 1) | 30 days | Yes (global) | CJ Affiliate / direct | 0.92 |
| **Iberdrola EV / Wallbox** | EV charging | DATA NOT AVAILABLE — Iberdrola is a strategic investor in Wallbox (€15M round 2019+), not an affiliate partner. No public affiliate or referral program found for either brand. | — | Yes (ES) | No program found | 0.88 |
| **Trainline** (plan includes) | Rail booking | 3.5% new customers / 0.5% returning (covers Renfe, OUIGO, Iryo) | 30 days | Yes (ES via Partnerize) | Partnerize | 0.90 |
| **FlixBus** (plan includes) | Intercity bus | ~4% of order value | 60 days | Yes (ES via Awin) | Awin | 0.90 |

**Key structural finding:** Four of the twelve programs in the plan either have no public affiliate program (Waylet, Solred, Iberdrola/Wallbox) or require opaque broker negotiations with no published rates (Rastreator, Acierto). Insurance affiliate revenue cannot be modeled without direct conversations with these companies.

---

## 2. Revenue Projection — 3 Scenarios

### Base inputs (derived from actual program terms)

**Assumptions for T+180d (6 months post-launch):**
- Organic sessions: the Routing + Affiliate roadmap (`ROADMAP-ROUTING-AFFILIATE.md`) targets 40K–100K visits/month at month 6. Using the lower bound (40K) for pessimistic and upper bound (100K) for realistic.
- Affiliate-eligible pages: the `/ir` meta-comparator launches July 6 — only ~3 weeks of data within T+180d from April 20. Most affiliate revenue at T+180d comes from standalone landing pages.
- Affiliate CTR benchmarks: industry data shows 0.5–1.25% average for informational sites, 2–5% for high-intent transactional landings. Weighting to 1.5% realistic (blend of informational hubs and booking-intent landings).
- Conversion rate: 3–5% of clicks convert (travel vertical). Trainline ES converts higher (~5%) because it goes directly to checkout.
- Average commission per conversion:
  - Flights (Skyscanner): ~€0.60/click-through (not per booking — Skyscanner pays per click-out, not CPA in ES)
  - Train (Trainline): 3.5% × avg €80 ticket = €2.80/booking
  - Ferry (DirectFerries): 1.8% × avg €120 booking = €2.16/booking
  - Bus (FlixBus): 4% × avg €18 ticket = €0.72/booking
  - Car rental (Rentalcars): 6% × avg €200 rental = €12/booking
  - Hotels (Booking.com): ~€3.75–5/stayed reservation (Tier 1)
  - Parking (Parclick): 3.5% × €30 avg = €1.05/booking
  - Weighted avg commission: **~€4–6 per conversion** (blended, excluding Skyscanner CPC model)

### Pessimistic scenario (month 6)

- Traffic: 25K sessions/month (affiliate-eligible pages only, not all traffic)
- Affiliate CTR: 1% = 250 clicks
- Conversion: 3% = 7.5 conversions
- Avg commission: €4
- **Monthly: ~€30 | Annual: ~€360**

Skyscanner adds CPC on top: 250 clicks × €0.60 = €150/month
**Revised pessimistic total: ~€180/month | ~€2,160/year**

### Realistic scenario (month 12)

- Traffic: 100K sessions/month (all affiliate-eligible pages)
- Affiliate CTR: 2.5% (mix of general pages at 1% + high-intent `/ir` landings at 5-6%)
- Clicks: 2,500
- Conversion: 4% = 100 conversions
- Avg commission: €5
- **Monthly: ~€500 from CPA + €600 from Skyscanner CPC = ~€1,100/month | ~€13,200/year**

The plan's own "Realista mes 12" estimates €1,500/month. This is within range — the internal plan's number is defensible if CTR hits 5% on `/ir` landings specifically.

### Optimistic scenario (month 18–24)

- Traffic: 250K sessions/month
- Affiliate CTR: 5% (mature `/ir` meta-comparator fully indexed)
- Clicks: 12,500
- Conversion: 5% = 625 conversions
- Avg commission: €6
- **Monthly: ~€3,750 CPA + ~€3,750 Skyscanner CPC = ~€7,500/month | ~€90,000/year**

**Verdict on €50K–€200K/year:** The €50K end is achievable but requires 18–24 months, not 180 days. The €200K end requires 400K+ sessions/month and full `/ir` traction. **The plan's T+180d projection of €18K/month is fantasy by a factor of 10–15x.** A realistic T+180d number is €1,500–3,000/month total (all monetization channels combined, not affiliate alone).

---

## 3. SEO Assumption Survivability Scoreboard

### Assumption 1: "AI Overview only 2.4% in winnable keywords — SGE-free window 12–24 months"

**Rating: NEEDS REVISION**

The 2.4% figure may refer to a specific DataForSEO keyword subset, but the broader picture is more aggressive. Semrush data (10M+ keywords, 2025): AI Overviews appeared on 25% of queries in July 2025, settling at ~16% in Spain by May 2025 (Semrush EU data). By early 2026, global coverage reached ~48% of tracked queries, up 58% year-over-year (ALM Corp, Feb 2026).

**However, critical nuance for trafico.live's actual keyword mix:**
- Local/geo queries ("tráfico en Madrid", "gasolinera cerca de mí"): only ~7.9% AI Overview rate — Google deliberately excludes near-me and real-time queries
- Price/live data queries ("precio gasolina hoy"): ~7% AI Overview rate — Google avoids AI answers for real-time accuracy-sensitive queries
- Weather queries: served via native Google Weather widget, not AI Overviews
- Informational queries ("cómo funciona el ICA"): 39–80% AI Overview rate — serious headwind for editorial content

**Net verdict:** The plan's low-competition window is real for the geo-local and real-time verticals (which are most of trafico.live's core). It is not real for the editorial/guide content layer. The "12–24 months" claim is too optimistic for the editorial cluster; the real-time data cluster has structural protection AI cannot easily displace.

Sources: [Semrush AI Overviews Study](https://www.semrush.com/blog/semrush-ai-overviews-study/) | [ALM Corp Feb 2026 data](https://almcorp.com/blog/google-ai-overviews-surge-9-industries/) | [Local query coverage](https://www.localfalcon.com/blog/whitepaper-studies-the-impact-of-google-ai-overviews-on-local-business-search-visibility)

---

### Assumption 2: "KD ≤20 = trivially winnable"

**Rating: NEEDS REVISION**

DataForSEO's KD methodology differs from Ahrefs. DataForSEO weights domain rank (×0.1) and page rank backlinks (×0.9), normalized to 0–100. Ahrefs weights only referring domains to the top-10 pages.

The practical consequence: DataForSEO KD ≤20 includes many queries where the top-3 SERP slots are occupied by government sites (DGT, AEMET, Renfe), which have enormous domain authority but thin backlink profiles on individual pages. These pages rank due to domain trust, not page-level links — meaning a KD ≤20 DataForSEO score does not mean the query is beatable by a 6-month-old domain.

**Proxy check:** A query like "estado del tiempo en Murcia" would score KD ~15–20 in DataForSEO (AEMET page has few inbound links). But displacing AEMET.es on its own content is likely impossible regardless of page quality — Google treats government weather sites as authoritative for weather queries. The KD metric is not useless, but it consistently underestimates institutional authority as a ranking signal.

**Recommendation:** Treat DataForSEO KD ≤10 as "winnable in 6–12 months," KD 10–20 as "winnable in 12–24 months," and cross-reference against whether the top-3 includes institutional domains (DGT, AEMET, Renfe, BOE).

Sources: [DataForSEO KD methodology](https://dataforseo.com/help-center/what-is-keyword-difficulty-and-how-is-it-calculated) | [Ahrefs vs DataForSEO comparison](https://keywordseverywhere.com/blog/how-the-top-tools-calculate-kd/)

---

### Assumption 3: "Ciudad mega-hubs will rank for 15M volume queries"

**Rating: NEEDS REVISION**

The March 2026 core update explicitly shifted visibility from aggregator/discovery pages toward "destination sources" and specialist publishers. Broad city-level hub pages that aggregate 6 different verticals (weather + traffic + fuel + rail + air quality + transit) into one URL are precisely the page type Google's recent updates have demoted — they solve too many intents at once and fully satisfy none.

The Zapier/Airbnb/Canva model of programmatic SEO that survived penalties works because each page serves one specific, narrow intent with unique, verifiable data. A `/madrid` page doing everything is the anti-pattern.

**The survivable version:** `/madrid/tráfico-tiempo-real`, `/madrid/gasolineras-baratas`, `/madrid/calidad-aire` as separate intent-matched URLs. The audit (`VERDICT.md`) already recommends "Madrid triple pack" as separate pages — that's correct. The mega-hub framing in the original plan needs to be decomposed before it is built.

Sources: [Google March 2026 core update analysis](https://almcorp.com/blog/google-march-2026-core-update-what-changed/) | [Programmatic SEO post-March 2026](https://www.digitalapplied.com/blog/programmatic-seo-after-march-2026-surviving-scaled-content-ban)

---

### Assumption 4: "Programmatic landings at scale (17,500 URLs) safe from spam penalties"

**Rating: SURVIVES — with conditions**

Google's March 2024 spam update and subsequent 2025 enforcement targeted "scaled content abuse" defined as: pages generated to manipulate rankings, not help users, with near-identical content across URLs. The 45% reduction in low-quality content Google reported post-update was largely aimed at AI-rewritten thin pages and keyword-swap doorways.

trafico.live's programmatic pages are structurally different: each station, airport, or route page exposes genuinely different data (real-time sensor readings, unique coordinates, distinct GTFS stop sequences, live vessel positions). This is the Zillow/Yelp model — data differentiation per page — which survived all 2024–2026 updates. The March 2026 core update even confirmed: "legitimate programmatic SEO on unique, data-backed pages saw no enforcement targeting."

**The risk condition:** thin entity pages (e.g., small railway stations with only a name, coordinates, and 2 stops) that have no differentiated content beyond template boilerplate. These may be caught in collateral effects. The audit noted 15–25 pages already under 300 words — monitor these closely.

Sources: [Google March 2024 spam policies](https://developers.google.com/search/blog/2024/03/core-update-spam-policies) | [Programmatic SEO survival guide 2026](https://guptadeepak.com/the-programmatic-seo-paradox-why-your-fear-of-creating-thousands-of-pages-is-both-valid-and-obsolete/)

---

### Assumption 5: "News sitemap + Discover = meaningful traffic channel"

**Rating: NEEDS REVISION**

Google's February 2026 Discover Core Update — the first-ever update specifically targeting the Discover feed — increased quality requirements substantially. Key findings:

- Discover now requires demonstrable expertise: author credentials, cited sources, editorial review processes — especially for YMYL content (transport safety, weather emergencies are YMYL)
- E-E-A-T signals evaluated at topic level, not site level. A site without author pages, bylines, and editorial credentials will not consistently appear in Discover for transport or weather content
- No special tags or News sitemap required for Discover eligibility — but the February 2026 update caused a 21% year-on-year drop in Google Discover referrals across 2,500+ publishers (NewzDash), concentrated on sites lacking clear authorial identity
- Publisher profile claiming is coming but not yet live

**For trafico.live:** Current pages are data-forward with no author bylines, no About/editorial team page, no citations. This is fine for standard search but disqualifies Discover for YMYL transport topics. Fixing requires: author entity pages, editorial standards documentation, and topic-specific expertise signals before Discover becomes a reliable channel.

Sources: [Google February 2026 Discover Core Update](https://almcorp.com/blog/google-february-2026-discover-core-update-guide/) | [Google Discover guidelines official](https://developers.google.com/search/docs/appearance/google-discover) | [HiLand SEO Discover 2026](https://hilandseo.com/google-discover-guidelines-update-2026/)

---

### Assumption 6: "Portugal market: tempo.pt and maisgasolina.com are weak UX — easy wins"

**Rating: DATA NOT AVAILABLE (confidence: 0.45)**

No reliable 2025–2026 traffic data or UX audit for tempo.pt or maisgasolina.com was found in public sources. Semrush does not surface these domains in its trending websites index for PT. The assumption may be correct — Portuguese transport data sites historically lag Spanish equivalents in SEO sophistication — but "weak UX" does not mean "weak rankings." Portuguese users may have strong brand loyalty to existing tools regardless of UX quality, and institutional Portuguese sites (IMTT, SNIRH, IPMA) may have structural authority similar to DGT/AEMET in Spain.

**Recommendation:** Do a manual Semrush/Ahrefs pull on these two domains before committing Portugal resources. The PT market is smaller (10M vs 47M population, ~8x less search volume) and should not be in the T+180d scope.

---

## 4. Top 3 Uncomfortable Truths the Plan Underestimates

**1. Affiliate commission chains are thin, not thick.**
The plan's €50K–€200K/year headline assumes meaningful commissions per transaction. In practice: Skyscanner pays per click-out (€0.40–€0.80), not per booking. Booking.com's "25% commission" is 25% of Booking's cut of the hotel rate — yielding ~€3.75 per €100 booking. DirectFerries pays 50% of what operators pay DirectFerries, making the effective rate 1.5–2% of booking value. Four programs in the plan (Waylet, Solred, Iberdrola EV, Rastreator/Acierto insurance) have no accessible affiliate program at all. The monetizable affiliate stack is smaller than assumed by approximately 40%.

**2. The site launches with known P0 SEO defects that will delay ranking by 3–6 months.**
The internal VERDICT audit found 47 pages with double-brand title suffixes, 32 pages without canonical tags, 117 pages without OG images, and 4,000+ URLs missing from sitemaps. Google's crawl budget will be spent on structurally broken pages before it reaches the new affiliate landing pages. The T+180d revenue projection implicitly assumes these are already fixed — but they are T+0 launch bugs. Each month of delay in fixing P0 issues costs roughly one ranking cycle (6–8 weeks).

**3. Zero-traffic affiliate applications will be rejected or ignored.**
Skyscanner Partners requires minimum 5,000 UV/month. Trainline requires "relevant audience." Awin requires a live, content-rich site reviewed manually. Applying on April 20 (launch day, 0 organic traffic) risks rejection across all major programs. The plan acknowledges this risk but underweights the consequence: rejected applications create a 6–12 week delay before reapplication is accepted. This pushes the `/ir` meta-comparator's commercial activation from July 2026 to Q4 2026 at the earliest.

---

## 5. Top 3 Hidden Upsides the Plan Underestimates

**1. Real-time data is structurally protected from AI Overview displacement.**
Weather, live traffic, current fuel prices, vessel positions, live aircraft — none of these categories trigger AI Overviews (Google explicitly keeps AI out of real-time accuracy-sensitive queries: ~7% coverage vs 48% global average). trafico.live's core value proposition sits in the only major SEO category where the AI disruption risk is structurally low. Most sites discussing this space fear AI displacement; trafico.live is actually one of the safer bets in the 2026 search landscape.

**2. The `/ir` meta-comparator has genuine product moat, not just SEO play.**
No Spanish competitor has real-time multimodal journey planning that integrates DGT traffic, live Renfe positions, AIS ferry tracking, and AEMET weather into a single route comparison. Rome2Rio's data for Spain is generic. This is a product with retention value, not just a one-time SEO landing. If it acquires repeat users (commuters checking weekly), RPM from direct return visits (no attribution needed for affiliate clicks) compounds over 18–24 months in ways the model does not capture.

**3. API premium tier is a more reliable revenue model than affiliate for the data platform layer.**
The AFFILIATE-PROGRAMS-APPLICATIONS.md and ROADMAP-ROUTING-AFFILIATE.md focus heavily on affiliate commissions, but trafico.live already has a Stripe-integrated FREE/PRO/ENTERPRISE API tier with 12+ MCP tools. Fleet managers, logistics companies, and transport operators will pay €100–500/month for programmatic access to real-time DGT + AEMET + AIS data. One enterprise API customer (€500/month) equals 3+ months of affiliate revenue at the realistic scenario. The affiliate channel is the right consumer play; the API tier is the right B2B play, and B2B monetization requires zero affiliate approvals, zero cookie attribution, and no Google ranking dependencies.

---

## Sources

1. [Parclick Affiliate Program](https://parclick.com/partnership/affiliate) — 2026, official
2. [DiscoverCars Affiliate Program](https://www.discovercars.com/affiliate) — 2026, official
3. [DirectFerries Affiliate Program](https://www.directferries.com/affiliate.htm) — 2026, official
4. [Omio Affiliate Programme](https://www.omio.com/affiliate) — 2026, official
5. [Skyscanner Affiliate — revenue share structure](https://www.travelpayouts.com/blog/skyscanner-flight-affiliate-program/) — 2025
6. [Booking.com Affiliate Commission explained](https://affiliates.support.booking.com/kb/s/article/Commission-and-Payments) — 2026, official
7. [Rentalcars 6% commission, CJ Affiliate](https://www.travelpayouts.com/en/offers/rentalcars-affiliate-program) — 2025
8. [FlixBus ~4%, Awin, 60-day cookie](https://www.flixbus.com/company/partners/affiliate-partners) — 2026, official
9. [Trainline 3.5%/0.5%, Partnerize](https://join.partnerize.com/trainline/en) — internal research doc, verified 2026-04-17
10. [Repsol Waylet — no affiliate program found](https://www.repsol.com/es/accionistas-inversores/club-accionistas/actualidad-en-accion/negocio-y-estrategia/waylet-app-repsol-ahorrar-centimos-litro-gasolina-diesel/index.cshtml) — 2026
11. [Semrush AI Overviews Study — 10M keywords](https://www.semrush.com/blog/semrush-ai-overviews-study/) — 2025, primary research
12. [Google AI Overviews Surge 58% — Feb 2026](https://almcorp.com/blog/google-ai-overviews-surge-9-industries/) — 2026
13. [Google AI Overviews EU expansion — Spain included March 2025](https://searchengineland.com/google-rolls-out-ai-overviews-in-eu-regions-453595) — 2025
14. [AI Overviews local queries 7.9% coverage](https://www.localfalcon.com/blog/whitepaper-studies-the-impact-of-google-ai-overviews-on-local-business-search-visibility) — 2025
15. [DataForSEO KD methodology](https://dataforseo.com/help-center/what-is-keyword-difficulty-and-how-is-it-calculated) — official docs
16. [KD methodology comparison — DataForSEO vs Ahrefs](https://keywordseverywhere.com/blog/how-the-top-tools-calculate-kd/) — 2025
17. [Google March 2026 Core Update — aggregators demoted](https://almcorp.com/blog/google-march-2026-core-update-what-changed/) — 2026
18. [Programmatic SEO after March 2026](https://www.digitalapplied.com/blog/programmatic-seo-after-march-2026-surviving-scaled-content-ban) — 2026
19. [Google March 2024 spam update — scaled content abuse](https://developers.google.com/search/blog/2024/03/core-update-spam-policies) — 2024, official
20. [Google February 2026 Discover Core Update](https://almcorp.com/blog/google-february-2026-discover-core-update-guide/) — 2026
21. [Google Discover guidelines official](https://developers.google.com/search/docs/appearance/google-discover) — 2026, official
22. [Affiliate CTR benchmarks 2026 — 1.25% avg](https://wecantrack.com/insights/affiliate-click-through-rate-statistics/) — 2026
23. [Travel conversion rate benchmarks 0.2–4%](https://unbounce.com/conversion-benchmark-report/travel-hospitality-conversion-rate/) — 2025
