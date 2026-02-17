# Product Marketing Context

*Last updated: 2026-02-17*

## Product Overview
**One-liner:** Golf OS is the operating system for serious golfers who want data-driven practice and precise yardage cards.
**What it does:** Golf OS imports shot data from your Garmin Approach R50, analyzes dispersion patterns, builds environment-adjusted yardage cards, and generates structured practice plans with strokes-gained scoring — so you practice smarter, not just more.
**Product category:** Golf performance analytics / practice companion
**Product type:** SaaS (web app)
**Business model:** Freemium — free tier on Supabase/Vercel, potential paid tier for advanced features or multi-user teams

## Target Audience
**Target users:** Serious amateur golfers (scratch to ~20 handicap) who own a Garmin Approach R10/R50 or use a launch monitor at the range
**Decision-makers:** The golfer themselves — individual purchase decision
**Primary use case:** Turn raw launch monitor data into actionable insights: know your real distances, see your patterns, and practice with purpose
**Jobs to be done:**
- "I want to know my actual carry distances per club, not what I think they are"
- "I want a yardage card I can trust on the course"
- "I want to practice with structure and see if I'm getting better"
- "I want to compare putters / wedge setups objectively"
**Use cases:**
- Pre-round prep: Build a yardage card adjusted for the destination course conditions
- Post-session analysis: See dispersion patterns and identify which clubs need work
- Structured practice: Follow programs, track scores, use voice input for hands-free logging
- Equipment testing: A/B test putters with drill data, build wedge distance matrices

## Problems & Pain Points
**Core problem:** Golfers collect launch monitor data but don't do anything meaningful with it — CSVs sit on their phone, they guess at yardages, and practice is aimless
**Why alternatives fall short:**
- Garmin Golf app shows individual shots but no dispersion analysis or yardage cards
- Generic golf apps don't import R50 data or understand shot patterns
- Spreadsheets require manual work and can't adjust for elevation/temperature
- No existing tool combines shot analytics + practice planning + equipment comparison
**What it costs them:** Wrong club selections on the course, wasted practice time, no objective way to track improvement
**Emotional tension:** "I practice a lot but my handicap doesn't move" — frustration from effort without direction

## Competitive Landscape
**Direct:** Arccos (GPS + club tracking) — falls short because it's course-play only, no range data import, no practice planning, expensive subscription
**Secondary:** Shot Scope, Garmin Golf app — falls short because they show data without analysis, no yardage card builder, no environment modeling
**Indirect:** Spreadsheets + YouTube drills — falls short because it's fragmented, manual, and not personalized

## Differentiation
**Key differentiators:**
- Imports actual Garmin R50 CSV data — real numbers, not estimates
- Environment-adjusted yardage cards (elevation, temp, humidity) for destination courses
- Dispersion arc analysis showing total lateral spread per club
- Strokes-gained-inspired practice scoring engine
- Voice input for hands-free shot logging during practice
- Putter Lab and Wedge Lab for systematic equipment testing
- All-in-one: analytics + yardage card + practice + equipment in one platform
**How we do it differently:** We start from your real shot data and work outward — everything is computed from actual patterns, not manufacturer specs or averages
**Why that's better:** Your 7-iron doesn't go what the box says. Your dispersion isn't symmetric. Your distances change at altitude. Golf OS knows all of this.
**Why customers choose us:** "It's the first tool that actually makes my range data useful"

## Objections
| Objection | Response |
|-----------|----------|
| "I don't have a Garmin R50" | We're expanding device support — but if you have any launch monitor data in CSV, we can likely parse it |
| "Seems complicated" | Import a CSV, see your card. The basics take 30 seconds. Advanced features are there when you want them |
| "I already use Arccos/Shot Scope" | Those track on-course play. Golf OS is for range sessions and practice — they're complementary, not competing |

**Anti-persona:** Casual golfers who play twice a year and don't care about their numbers. Golfers without a launch monitor.

## Switching Dynamics
**Push:** "I have all this data from my R50 but I don't know what to do with it"
**Pull:** "I can finally see my real yardages and practice with purpose"
**Habit:** "I've been eyeballing my distances for years" / "My current practice routine is fine"
**Anxiety:** "Is it worth setting up another tool?" / "Will I actually use it?"

## Customer Language
**How they describe the problem:**
- "I have hundreds of shots on my Garmin but I just look at averages"
- "I don't trust my yardages when I get to a new course at altitude"
- "I practice putting but I don't know if I'm actually getting better"
- "I need to figure out my wedge distances for partial swings"
**How they describe us:**
- "It's like a flight log for your golf game"
- "Finally makes range sessions feel productive"
- "The yardage card alone is worth it"
**Words to use:** real data, your actual numbers, practice with purpose, know your distances, dispersion, pattern, structured practice, data-driven
**Words to avoid:** AI-powered (overused), revolutionary, game-changing, synergy, leverage

## Brand Voice
**Tone:** Direct, technical but accessible, confident without hype
**Style:** Show the data, let it speak. Short sentences. No fluff.
**Personality:** Analytical, honest, golfer-first, no-BS

## Proof Points
**Metrics:**
- 25+ data points captured per shot
- Environment modeling adjusts for elevation, temperature, humidity
- 15 built-in putting drills with descriptions and setup instructions
- 5 wedge swing systems supported (clock, percentage, body, thirds, custom)
- 12 seed practice drills across all categories
**Value themes:**
| Theme | Proof |
|-------|-------|
| Know your real distances | Percentile-based yardage cards from actual shot data |
| Practice with purpose | Strokes-gained scoring, structured programs, AI-generated plans |
| Test equipment objectively | Putter Lab with drill tracking, Wedge Lab with distance matrices |
| Play any course confidently | Environment-adjusted yardage cards for destination conditions |

## Goals
**Business goal:** Grow user base among Garmin R50 owners; establish Golf OS as the go-to range analytics platform
**Conversion action:** Sign up for a free account and import first CSV
**Current metrics:** Early stage — building initial user base
