# Golf OS - Testing & Validation Checklist

Use this checklist to walk through every feature. Test data is provided where needed.

---

## 1. Landing Page (`/landing`)

- [ ] Page loads without errors
- [ ] Hero section displays tagline and CTA buttons
- [ ] Stats bar shows: 25+, 15, 5, 4x6"
- [ ] Problem/Solution section renders both columns
- [ ] Feature cards display (9 total) in 3-column grid
- [ ] **Launch monitor badges**: Yardage Cards and Dispersion show blue "Launch Monitor" badge
- [ ] **No equipment badges**: All other 7 features show green "No Equipment" badge
- [ ] Pricing toggle switches between Monthly ($5/mo) and Annual ($49/yr, shows $4.08/mo)
- [ ] Free tier lists 5 features
- [ ] Pro tier lists 8 features, "Most Popular" badge visible
- [ ] FAQ accordion opens/closes (7 questions)
- [ ] FAQ #3 ("Can I use this without a launch monitor?") lists standalone modules
- [ ] "Get Started Free" and "Sign In" links navigate correctly
- [ ] Footer shows "Sobojinski Solutions" branding
- [ ] Page is responsive on mobile

---

## 2. Auth Flow

- [ ] `/auth/signup` — Create account form works
- [ ] `/auth/signin` — Sign in form works
- [ ] Sign out button in nav works
- [ ] Unauthenticated users redirected to sign in (AuthGuard)

---

## 3. Home Page (`/`)

- [ ] Module hub loads with 3 groups: Train, Track, Tools
- [ ] **10 module cards** displayed with icons and descriptions
- [ ] **Launch monitor badges** visible on: Shot Data, Compare, Yardage Card (blue "Launch Monitor" with chip icon)
- [ ] Other 7 cards have **no badge** (they're standalone)
- [ ] Cards are clickable and navigate to correct routes
- [ ] Layout is responsive (stacks on mobile)

---

## 4. Navigation

### Desktop
- [ ] 3 dropdown groups: Train, Track, Tools
- [ ] Clicking group label opens dropdown
- [ ] Each item shows label + description
- [ ] **LM badge** appears next to: Shot Data, Compare, Yardage Card
- [ ] No LM badge on other items
- [ ] Active page highlighted
- [ ] Clicking outside closes dropdown
- [ ] Route change closes dropdown
- [ ] User email and Sign Out visible

### Mobile
- [ ] Hamburger menu opens/closes
- [ ] Grouped sections with headers (Train, Track, Tools)
- [ ] **LM badge** appears next to: Shot Data, Compare, Yardage Card
- [ ] All links navigate correctly and close menu

---

## 5. Speed Training (`/speed`)

### Test Data — Sessions
| Date       | Protocol   | Program         | Notes              |
|------------|------------|-----------------|---------------------|
| 2026-02-20 | TheStack   | Level 2 Week 3  | Felt good today     |
| 2026-02-18 | SuperSpeed | Green Phase     | First session back  |
| 2026-02-15 | TheStack   | Level 2 Week 2  |                     |

### Test Data — Readings (for Feb 20 session)
| Set | Rep | Club        | CHS (mph) | Ball Speed |
|-----|-----|-------------|-----------|------------|
| 1   | 1   | Driver      | 108.2     | 158.5      |
| 1   | 2   | Driver      | 110.5     | 162.0      |
| 1   | 3   | Driver      | 109.8     | 160.3      |
| 2   | 1   | Driver      | 111.3     | 163.1      |
| 2   | 2   | Driver      | 112.0     | 164.5      |
| 2   | 3   | Driver      | 110.1     | 161.2      |

### Checks — Log Tab
- [ ] Create new session with date, protocol, program, notes
- [ ] Session appears in sidebar list
- [ ] Click session to view details
- [ ] Summary cards show: Max CHS, Avg CHS, Swings count
- [ ] Add readings using quick-add form (club, CHS, ball speed, set, rep)
- [ ] Readings table shows all entries with correct Smash Factor (Ball / CHS)
- [ ] Expected smash for Set 2 Rep 2: 164.5 / 112.0 = **1.47**
- [ ] Delete individual readings
- [ ] Delete entire session (confirm dialog)

### Checks — Progress Tab
- [ ] Summary cards: All-Time Max, Latest Max, Speed Gain, Sessions count
- [ ] Bar chart renders with driver CHS data over time
- [ ] Hover tooltip shows date, max, avg
- [ ] History table shows date, max, avg, change delta

---

## 6. Golf Fitness (`/fitness`)

### Test Data — Workout
| Field        | Value                    |
|-------------|--------------------------|
| Date        | 2026-02-22               |
| Type        | Strength                 |
| Program     | TPI Level 2              |
| Name        | Upper Body + Rotation    |
| Duration    | 45 min                   |
| Difficulty  | 4 stars                  |
| Notes       | Shoulder felt tight early |

### Test Data — Exercises
| Exercise                    | Sets | Reps | Weight |
|-----------------------------|------|------|--------|
| Cable Woodchop              | 3    | 12   | 30     |
| Pallof Press                | 3    | 10   | 25     |
| Single Leg RDL              | 3    | 8    | 35     |
| 90/90 Hip Rotation          | 2    | 15   |        |

### Checks — Workout Log Tab
- [ ] "Log Workout" opens the form
- [ ] Fill in date, type, program, name, duration
- [ ] "Browse Library" opens the exercise picker (70+ exercises in categories)
- [ ] Click an exercise from library to add it to the form
- [ ] Manually type exercise name and add with sets/reps/weight
- [ ] Exercise list shows all added exercises with remove buttons
- [ ] Click 1-5 stars for difficulty rating
- [ ] Save workout — appears in history
- [ ] History card shows name, type badge, date, duration, difficulty stars, exercises
- [ ] Delete workout from history

### Checks — Exercises Tab
- [ ] Search bar filters exercises
- [ ] Categories displayed: Mobility, Core, Rotational Strength, Power, Lower Body, Upper Body, Cardio/Conditioning
- [ ] Searching "woodchop" returns Cable Woodchop

### Checks — Stats Tab
- [ ] This Week count, Last 30 Days count, Time (30d), Current Streak
- [ ] Workout Type Breakdown chart renders
- [ ] Total workouts count displayed

---

## 7. Round Tracking (`/rounds`)

### Test Data — Round
| Field   | Value              |
|---------|--------------------|
| Date    | 2026-02-21         |
| Course  | Pebble Beach GL    |
| Tees    | Blue               |
| Holes   | 18                 |
| Notes   | Windy, firm greens |

### Test Data — Scorecard (Front 9)
| Hole | Par | Score | Putts | FIR | GIR | Penalties |
|------|-----|-------|-------|-----|-----|-----------|
| 1    | 4   | 5     | 2     | Y   | N   | 0         |
| 2    | 5   | 4     | 1     | Y   | Y   | 0         |
| 3    | 3   | 3     | 2     | —   | Y   | 0         |
| 4    | 4   | 4     | 1     | Y   | Y   | 0         |
| 5    | 3   | 4     | 2     | —   | N   | 0         |
| 6    | 5   | 6     | 2     | N   | N   | 1         |
| 7    | 3   | 2     | 1     | —   | Y   | 0         |
| 8    | 4   | 5     | 3     | Y   | N   | 0         |
| 9    | 4   | 4     | 1     | Y   | Y   | 0         |

**Expected Front 9**: Score 37 (+1), Putts 15, FIR 5/6, GIR 5/9

### Checks — Scorecards Tab
- [ ] Create new round with date, course, tees, holes (9 or 18), notes
- [ ] Round appears in sidebar
- [ ] Click round to see scorecard
- [ ] Summary cards show: Score, To Par (color-coded), Putts, Par
- [ ] Enter par for each hole (dropdown: 3, 4, 5)
- [ ] Enter score — cell color changes:
  - Eagle or better: **gold**
  - Birdie: **red**
  - Par: **white**
  - Bogey: **blue**
  - Double+: **dark blue**
- [ ] FIR toggle cycles: Y (green) → N (red) → — (gray)
- [ ] GIR toggle cycles: Y → N → —
- [ ] Front 9 subtotal row calculates correctly
- [ ] Back 9 subtotal row calculates correctly
- [ ] Total row sums all 18
- [ ] "Save Scorecard" persists data
- [ ] Score legend visible at bottom
- [ ] Delete round works

### Checks — Stats Tab
- [ ] Scoring Avg, Best Round, Last 5 Avg displayed
- [ ] Avg Putts, Avg FIR%, Avg GIR% displayed
- [ ] Scoring trend bar chart shows recent rounds
- [ ] Tooltip on hover shows date, score, course name

---

## 8. Shot Data (`/shots`) — Requires Launch Monitor

### Test Data
Use a Garmin R50 CSV file. If none available, verify the upload UI renders.

### Checks
- [ ] File input accepts .csv files
- [ ] Upload shows progress / success message
- [ ] Sessions list appears after import
- [ ] Each session shows: name, date, shot count, club count
- [ ] Click session navigates to detail view
- [ ] Delete session with confirmation
- [ ] "Compare Sessions" and "Yardage Card" quick links work

---

## 9. Wedge Lab (`/wedges`)

### Test Data — Bag Clubs
| Club | Brand    | Model      | Loft | Shaft       | Flex |
|------|----------|------------|------|-------------|------|
| PW   | Titleist | T200       | 43   | Project X   | 6.0  |
| GW   | Titleist | Vokey SM10 | 50   | DG S200     | Stiff|
| SW   | Titleist | Vokey SM10 | 54   | DG S200     | Stiff|
| LW   | Titleist | Vokey SM10 | 58   | DG S200     | Stiff|

### Test Data — Wedge Matrix (Clock System)
|              | PW   | GW   | SW   | LW  |
|--------------|------|------|------|-----|
| Full         | 140  | 120  | 100  | 80  |
| 3/4 (9:00)  | 125  | 108  | 88   | 70  |
| 1/2 (7:30)  | 105  | 90   | 72   | 55  |

### Test Data — Calibration Shots (GW, Full swing)
| Shot | Carry (yds) | Offline (yds) |
|------|------------|---------------|
| 1    | 118        | -2            |
| 2    | 121        | 1             |
| 3    | 119        | -1            |
| 4    | 122        | 3             |
| 5    | 117        | -3            |

**Expected Average**: Carry 119.4 yds, Offline -0.4 yds

### Checks — My Bag Tab
- [ ] Add clubs with all fields
- [ ] Club count shows (e.g., 4/14 clubs)
- [ ] Clubs appear in table with all specs
- [ ] Edit club opens form with pre-filled values
- [ ] Remove club with confirmation

### Checks — Wedge Matrix Tab
- [ ] Select swing system (Clock, Percentage, Body Reference, Thirds, Custom)
- [ ] Swing labels update based on system
- [ ] Add/remove custom swing labels
- [ ] Add/remove wedge clubs
- [ ] Enter distances in the grid
- [ ] Save Matrix persists data
- [ ] Reload page — matrix data retained

### Checks — Calibrate Tab (Sessions)
- [ ] Create new calibration session with date, club selection, swing selection
- [ ] Session appears in list
- [ ] Click session to see combo selector grid (clubs x swings)
- [ ] Click a combo cell to start entering shots
- [ ] Enter carry distance and offline, click Add Shot
- [ ] Shot appears in log with shot number, carry, offline
- [ ] Include/Exclude toggle works
- [ ] Delete individual shots
- [ ] Combo cells show shot count and average
- [ ] Progress shows X/Y combos filled

### Checks — Calibrate Tab (Averages)
- [ ] Switch to Averages view
- [ ] Table shows cross-session averages per combo
- [ ] Standard deviation displayed
- [ ] Delta vs current matrix values shown
- [ ] "Apply Averages to Wedge Matrix" updates the matrix tab

### Checks — Practice Tab
- [ ] Set min/max range (e.g., 55 to 140)
- [ ] Start session — random target appears
- [ ] Enter actual carry, click "Log & Next"
- [ ] Skip button generates new target
- [ ] Score card updates (0-10 scale)
- [ ] Avg Error and Shot count update
- [ ] Shot log shows: target, actual, error (color-coded)

---

## 10. Putter Lab (`/putters`)

### Test Data — Putters
| Name            | Length | Lie   | Loft | Neck  | Grip            |
|-----------------|--------|-------|------|-------|-----------------|
| Scotty Cameron  | 34     | 70    | 3.5  | Plumber| SuperStroke 2.0 |
| Odyssey Ai-ONE  | 34     | 70    | 3    | Slant | Pistol GT       |

### Test Data — Drill Results
| Putter         | Drill          | Distance | Made | Attempted |
|----------------|----------------|----------|------|-----------|
| Scotty Cameron | 3-ft Circle    | 3        | 18   | 20        |
| Scotty Cameron | Ladder (3-7ft) | 5        | 12   | 20        |
| Odyssey Ai-ONE | 3-ft Circle    | 3        | 17   | 20        |
| Odyssey Ai-ONE | Ladder (3-7ft) | 5        | 14   | 20        |

### Checks — Specs Tab
- [ ] Add putter with all fields
- [ ] Specs comparison table shows all putters side-by-side
- [ ] Edit putter updates the table
- [ ] Delete putter with confirmation

### Checks — Log Drills Tab
- [ ] Select a putter (button toggles active, color-coded dot)
- [ ] "Generate" random drill — card shows drill name, space needed, description, setup, focus
- [ ] "Reroll" generates different drill
- [ ] "Use this drill" loads drill into the form
- [ ] Fill in made/attempted (e.g., 18/20)
- [ ] Log Result — appears in Recent Drill Results table
- [ ] Table shows: date, putter, drill, distance, result, percentage
- [ ] Expected: 18/20 = **90.0%**
- [ ] Delete drill result

### Checks — Results Tab
- [ ] Putter comparison cards show: Make Rate %, Made/Att, Drills count
- [ ] Drill filter dropdown filters results
- [ ] Breakdown by Drill table shows % per putter per drill
- [ ] Bar chart renders with horizontal bars sorted by make rate
- [ ] Trend line comparison (last 3 vs first 3)

---

## 11. Practice (`/practice`)

- [ ] Hub page loads with 3 action cards
- [ ] "Start Program" navigates to program selection
- [ ] "Random Practice" generates a session
- [ ] "Drill By Time" allows category/time selection
- [ ] Continue banner shows if incomplete session exists
- [ ] Recent Sessions list shows last 5 with status dots
- [ ] Delete session works

---

## 12. Yardage Card (`/yardage`) — Requires Launch Monitor

- [ ] Page loads with controls on left, preview on right
- [ ] Dataset scope options: All-time, Rolling N, Selected sessions
- [ ] Shot filter toggle (full shots only)
- [ ] Range band selector (P20-P80 / P10-P90)
- [ ] Display options: gaps, dispersion arc, tendency, low-confidence clubs
- [ ] Min shots per club input
- [ ] Club selection buttons
- [ ] Distance mode: Observed, Normalized, Simulated
- [ ] Simulated mode shows environment inputs (elevation, temp, humidity, pressure)
- [ ] Preview renders yardage table with club distances

---

## 13. Compare / Dispersion (`/compare`) — Requires Launch Monitor

- [ ] Page loads with controls on left, chart on right
- [ ] Compare mode: All-time, Rolling N, Selected sessions
- [ ] Club multi-select checkboxes
- [ ] Chart mode toggle: Carry / Total
- [ ] D3 scatter plot renders with shot dots
- [ ] 1σ and 2σ ellipses displayed
- [ ] Stats panel shows: mean, std dev, shot count
- [ ] Multiple sessions overlay in different colors

---

## 14. Calculator (`/calculator`)

### Test Data
| Field            | Value |
|------------------|-------|
| Actual Yardage   | 150   |
| Elevation Change | +15   |
| Wind             | 10    |
| Temperature      | 55    |
| Humidity         | 40    |
| Course Elevation | 5000  |

**Expected ~**: Plays like **163-168 yds** (uphill + headwind + altitude add; cool temp adds slightly)

### Checks
- [ ] Enter all 6 inputs
- [ ] "Plays like" result updates in real time
- [ ] Effect breakdown shows individual adjustments:
  - Elevation effect (positive for uphill)
  - Wind effect (positive for headwind)
  - Altitude effect (positive for high elevation)
  - Temp effect (slight addition for cool weather)
- [ ] Color coding: red for adverse effects, green for favorable
- [ ] Change values and verify result updates
- [ ] Try negative elevation (downhill) — result should decrease
- [ ] Try negative wind (tailwind) — result should decrease

---

## 15. Cross-Feature Integration

- [ ] Wedge Lab calibration averages → "Apply to Matrix" updates Wedge Matrix distances
- [ ] Wedge Matrix data appears in Practice random targets
- [ ] Shot Data import creates sessions visible in Compare and Yardage Card
- [ ] Home page cards all navigate to correct modules
- [ ] Nav links all navigate to correct modules
- [ ] Sign out from any page redirects to sign in

---

## 16. Responsive / Mobile

- [ ] Landing page stacks properly on mobile
- [ ] Home page cards stack in single column
- [ ] Nav hamburger menu works
- [ ] Scorecard table scrolls horizontally
- [ ] Wedge matrix grid scrolls horizontally
- [ ] Putter specs table scrolls horizontally
- [ ] All forms are usable on mobile

---

## 17. Data Persistence

- [ ] Create data in each module, refresh page — data persists
- [ ] Delete data, refresh — data is gone
- [ ] Sign out and sign in — all data still present
- [ ] Different user cannot see another user's data (RLS)

---

## Summary

| Module          | LM Required | Key Test Actions                              |
|-----------------|-------------|-----------------------------------------------|
| Speed Training  | No          | Create session, add readings, check progress  |
| Golf Fitness    | No          | Log workout with exercises, check stats       |
| Rounds          | No          | Enter scorecard, verify calculations          |
| Shot Data       | Yes         | Import CSV, view sessions                     |
| Compare         | Yes         | Select sessions/clubs, view dispersion        |
| Wedge Lab       | No          | Add clubs, build matrix, calibrate, practice  |
| Putter Lab      | No          | Add putters, log drills, compare results      |
| Practice        | No          | Start session, log scores                     |
| Yardage Card    | Yes         | Configure settings, preview card              |
| Calculator      | No          | Enter values, verify plays-like result        |
