# TrailHub — Full Product Specification v2.0

## What is TrailHub
A two-sided marketplace connecting guided trip providers with hikers looking for outdoor experiences.

---

## Three User Types

### 1. Hiker
- Searches for trips using filters
- Registers, pays, cancels
- Can be "interested" or "conditionally interested"
- Receives notifications about trip changes

### 2. Independent Guide
- Publishes trips under their own name
- Is both the trip owner and the field guide
- Manages registrants, sends messages, views statistics
- Can add a co-manager to any trip (see Shared Management)

### 3. Shared Trip Management
- Any guide can add another guide as a co-manager on a trip
- Co-manager sees and can do everything the primary guide can
- No hierarchy, no approvals — full equal access
- Replaces the institutional body model for Phase 1

---

## Guides on a Trip

### Single guide
- One guide — primary and only

### Two guides
- Can be defined on any trip (regular or journey)
- One can be marked as Primary, the other as Secondary
- Or both equal with no distinction
- In a journey: guide assignment can change per day (see Journey section)

---

## Trip Card Structure

### Level 1 — Card in List View
- Main photo
- Trip name / Journey name (with "Journey" label if multi-day)
- Guide name(s) + small avatar(s)
- Region in Israel
- Distance (km) + duration (hours) — or total km + number of days for journeys
- Difficulty: Easy / Medium / Hard / Extreme (visual)
- Date + day of week — or date range for journeys
- Price
- Capacity: X spots out of Y (or "Unlimited")
- Visual capacity bar

### Level 2 — Full Trip Page
- Route on map with waypoints (name + description per point)
- Elevation chart — auto-generated from GPX + start point
- Route type: One-way / Circular nature / Circular urban
- Trip description
- Required equipment (with suggested list to pick from)
- Dynamic fields defined by guide (e.g. health declaration, prior experience)
- Suitability: min/max age, fitness level
- Detailed cancellation policy (up to 3 tiers)
- Full guide profile(s)
- Reviews (only from actual participants)
- Public Q&A channel
- Rideshare board (visible to registered users and interested users)

---

## Publication States
- **Draft** — visible only to the guide, not ready to share
- **Published Public** — appears in search for everyone
- **Published Private** — not in search, accessible via direct link only. All features work: registration, payment, waitlist, notifications, rideshare board

---

## Trip Creation Wizard — 5 Steps
1. Basic details: name, description, date, time, region, meeting point (with map pin option), photos
2. Route: GPX upload, route type, auto map, elevation chart, waypoints (click on route to add), waypoint order drag-and-drop
3. Parameters: difficulty (including Extreme), min/max age, fitness level, max/min participants, equipment (suggested list), dynamic registration fields
4. Payment & cancellation: price, up to 3 refund tiers
5. Publish: review + choose state (Draft / Published Public / Published Private)

### Guides on a Trip (set in step 1 or step 3)
- One guide or two
- If two: optional distinction of Primary / Secondary
- Co-manager can be added separately (full access, not listed as guide)

---

## Journey (Multi-Day Trip)

### What is a Journey
- A named collection of days/stages under one umbrella
- Each day is an independent unit with its own route, waypoints, equipment, guides
- Accommodation is outside the platform

### Registration Modes (guide chooses one)
- **Full journey only** — must register for all days, no partial cancellation
- **Individual days** — each day is independent, separate registration and price
- **Journey with flexibility** — register for all but can leave on day X (with cancellation policy per remaining days)

### Journey Creation
Same 5-step wizard as a regular trip, with an additional "Days" section:
- Add days one by one
- Each day: name, description, date, time, GPX, waypoints, day-specific equipment, guide(s) for that day
- Option to mark a day as "Rest day" — no GPX, just description
- Guide assignment per day: one or two guides, primary/secondary distinction

### Journey Display
- Appears as one card in search with "Journey · X days" label
- Full journey page: collapsible day timeline (tap to expand each day with map, elevation, waypoints, equipment, guides)
- Registration options shown at bottom

---

## Core Flows

### Search (Hiker)
Filters: date + time, region, difficulty, price, min/max age, favorite guides
Views: card list + calendar view (month/week/day)

### Calendar View
- Toggle between list and calendar in search page header
- Quick filters between toggle and date navigation: difficulty, region, favorite guides only
- Month view: large calendar, colored dots per day (green=open, orange=almost full, red=full). Tap day → slide-down with trip list
- Week view: 7 columns, trips shown at their time slot with color
- Day view: full cards sorted by departure time

### Registration (Hiker)

#### Simple Interest
- "Notify me when fewer than X spots remain" (hiker sets X)

#### Conditional Interest
- Multiple conditions with AND (all must be met)
- e.g. "If trip shortens to 20km" AND "If price drops to 120₪"
- Choice: automatic (registers immediately) or manual (gets notification, competes with others)
- Guide sees all accumulated conditional requests

#### Full Registration
1. Read and sign cancellation policy
2. Fill dynamic fields defined by guide (e.g. health declaration)
3. Payment Authorization (not Capture yet)
4. Threshold alert: X hours before no-refund window (hiker sets, platform default exists)
5. Payment Capture when entering no-refund window

#### Waitlist
- Automatic: registers and charges immediately when a spot opens. No refund.
- Manual: simultaneous notification to all manual waiters, first to register wins

### Cancellations
- Hiker cancels before window: full automatic refund
- Hiker cancels after window: charged per tier
- Guide cancels: full refund to everyone + logged on profile
- Major change: equivalent to cancellation — full refund right + re-confirmation required

### Communication
- Public Q&A channel: visible to all registrants, prevents duplicate answers
- Private chat: between hiker and guide
- Push notifications on any trip change
- Who gets notifications: registrants always, conditional registrants always, interested only if requested

---

## Rideshare Board
- Visible to registrants and interested users of a specific trip
- Any of them can post: departure city, number of spots, direction (both ways by default, or one-way), cost sharing (yes/no — no payment through platform)
- Others can claim a spot → private chat opens automatically for coordination
- Spot claimer can leave → spot reopens automatically
- Ride poster can cancel → all claimers get notification "find alternative"
- Full trip: card grayed out, "Full" badge shown

---

## User Profile

### Registration / Sign-in
- Google Sign-in (no extra fields)
- Or: email + password + name

### Personal Profile (filled after registration)
- Name, age, gender
- Fitness level
- Profile photo

### Personal Preferences (defaults for search)
- Preferred regions
- Preferred difficulty levels
- Preferred trip length (km)
- Preferred days of week

### Following Guides
- Separate from preferences
- "Follow" button on guide profile
- Notification when followed guide publishes a new trip

---

## Guide Profile
- Free-form bio
- Specialty regions
- Interests
- Links: YouTube, podcast
- Age, training institution, total years of experience (self-declared — clearly marked)
- Platform stats (clearly marked separately): trips, hikers, on-time percentage, cancellations
- Reviews + ratings (only from actual participants)
- "Follow" button — notification on new trips

---

## Guide Dashboard
- "My Trips" tab: upcoming trips + drafts
  - Per trip: capacity bar, accumulated conditional requests, Broadcast button
- "Registrants" tab: list with status (paid/pending/waitlist), message button, conditional requests, dynamic field answers
- "Statistics" tab: revenue, completion rate, returning hikers, popular trips

---

## "My Trips" Page (Hiker)
- "Upcoming" tab: active registrations + waitlist position
  - Charge alert: "X days left — cancel now for full refund"
- "Interested" tab: conditional (with conditions shown) + simple (with alert threshold)
- "History" tab: completed (with "Write review" + "Register again") + cancelled (with refund status)

---

## Design & UX

### Colors
- Primary green: #1A6B4A
- Light green: #D6EDE3
- Blue: #2C5F8A
- Orange: #E8A020
- Red: #C0392B

### Principles
- RTL throughout — Hebrew
- Mobile-First
- Large dominant trip photos
- Rounded cards (large border-radius)
- Pill-shaped primary buttons
- Guide name + rating shown on the photo itself
- Capacity bar on every card and trip page
- Clear separation between self-declared data and platform data in guide profile
- Journeys clearly labeled with "Journey" badge in all views

---

## Tech Stack

### Web
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth.js
- Stripe (Authorization + Capture separately, test mode)
- Mapbox GL JS
- Open-Elevation API (elevation chart from GPX)

### Mobile (Android first, iOS later)
- React Native + Expo (SDK 54)
- expo-router
- React Query
- expo-secure-store (JWT)
- Connected to the same Web Backend

---

## Project Info
- Web: Next.js. Path: `C:\Users\yarde\OneDrive\Desktop\trailhub\TrailHub-main` (Windows) or `~/Desktop/trailhub` (Mac)
- Android: React Native + Expo SDK 54. Path: `C:\Users\yarde\trailhub-mobile`
- Database: Supabase PostgreSQL. Password: `Trailhub2027`
- Test users (password `password123`): `user@trailhub.co.il`, `roei@trailhub.co.il` (guide), `coordinator@trailhub.co.il`, `emergency@trailhub.co.il`, `fieldguide@trailhub.co.il`

---

## What's Built So Far
- Full Marketplace: search with filters, trip card, full trip page, registration
- Waitlist: automatic and manual competitive
- Conditional interest with AND conditions
- Guide dashboard, public Q&A, reviews
- Android: core screens with mock data

## What's New — Build These
1. Journey (multi-day trip) — creation wizard + display page with collapsible days
2. Two guides per trip — primary/secondary distinction, per-day assignment in journeys
3. Shared trip management — co-manager with full access
4. User profile — personal info + preferences (separate from following)
5. Publication states — Draft / Published Public / Published Private
6. Calendar view — month/week/day with filters, integrated in search page
7. Rideshare board — per trip, for registrants and interested users
8. Dynamic registration fields — guide defines extra fields per trip
9. Stripe — Authorization on registration, Capture at no-refund window (test mode)

---

## Do NOT Build Yet (Phase 2)
- GPS tracking and Real-Time on trip day
- Offline mode / Store & Forward
- Battery saving / Adaptive Polling
- Tail detection algorithm
- Context Awareness (daylight hours, weather, terrain danger)
- GPS reliability model
- Advanced analytics on guides
- SMS notifications
- iOS app

---

## Edge Cases & Business Rules (74 decisions)

### Pricing
- Price cannot be raised after the first registrant. Cannot be lowered either (no coupons in Phase 1).
- Price is locked in both directions once at least one hiker has registered.
- If only interested users (no registrants) — price can still be changed.
- Free trips (price = 0): no Stripe processing, no card required, no cancellation policy.
- Each trip is charged separately — no bundling even if same card, same day.

### Registration
- Dynamic fields added after registration: existing registrants are NOT required to fill new fields. Only new registrants fill them.
- Dynamic field types: checkbox (yes/no) and dropdown (guide defines options). All dynamic fields are mandatory — no optional fields.

### Payment & Capture
- Authorization on registration, Capture at no-refund window.
- Cancellation before window: full automatic refund immediately.
- Cancellation after window: partial refund per tier, processed automatically and immediately.
- Free trips: no payment processing at all.

### Waitlist
- Automatic waitlist: when spot opens → immediate charge. If card fails → notify hiker, move to next in queue. Hiker is removed from waitlist.
- Manual waitlist: when spot opens → simultaneous notification to all manual waiters. First to click registers. No time window.
- When max capacity increased: automatic waitlist fills in order, manual waitlist gets simultaneous notification.
- Hiker leaves waitlist voluntarily: positions of remaining waiters auto-update.

### Conditional Interest
- AND conditions only — all must be met simultaneously.
- If auto-register and card fails → notify hiker, move to next in queue.
- If trip cancelled while conditions not yet met: treated as simple interested (no charge).
- If registered automatically via conditions then cancels: same cancellation policy as regular registrant.

### Trip Changes & Cancellations
- Major changes (trigger full refund right + 24h to decide): date change, meeting point moved beyond configurable distance threshold (super-user configurable), route length change beyond threshold, any difficulty change (up or down).
- Major change in any journey day = major change for entire journey.
- Major change refund = always full, even if past no-refund window.
- Hiker has 24 hours to confirm after major change. No response = auto-exit with full refund.
- Min participants not reached: guide decides, no auto-cancel. If guide cancels → full refund to all, treated as guide cancellation.
- Capacity can be raised anytime. Can only be lowered to current registrant count minimum.

### Trip Postponement (New State)
- Guide can postpone a trip (new state between active and cancelled).
- Guide must specify reason (category + free text).
- Registrants can choose: stay and wait for new date, or exit with full refund.
- When new date set: 24 hours for remaining registrants to confirm. No response = auto-exit with full refund.
- Postponed state applies to both public and private trips.

### Guide Cancellation
- Guide cancels: full refund to all registrants regardless of cancellation policy.
- Guide must specify reason (category: weather, illness, personal, other + free text).
- Cancellation history visible on guide profile (date + reason category).
- Guide cannot delete account with trip history — only deactivate voluntarily.
- Deactivation requires closing all active trips with registrants first.
- Deactivation is voluntary and reversible.

### Guide Account
- Cannot delete account with trip history — only deactivate.
- Cannot deactivate with active trips and registrants.
- Deactivated guide: profile and reviews remain visible, not searchable, cannot publish new trips.

### Reviews
- Only actual participants can write reviews.
- No time window — can write anytime after trip.
- Hiker can edit or delete their own review.
- Guide can reply once per review.
- If hiker deletes review: rating auto-updates immediately.
- Two guides on one trip: each rated separately by each participant, not as a pair.

### Q&A
- Registrants AND interested users can ask questions.
- Anyone (registrants/interested) can answer.
- Guide can mark one answer as "official answer" — shown prominently at top.
- If hiker cancels: their question deleted IF no answers exist. If answered → stays.
- Guide can delete questions/answers (must give reason, logged in system, not visible to users).
- Hiker can delete own question (if no answers).

### Privacy & Data
- Guide sees: hiker name, email, dynamic field answers. Not phone number.
- Hikers see: list of other registrants (names only). Not email, not phone.
- Rideshare board: poster's name visible to all (no anonymity).
- Private chat: deleted when hiker cancels registration or removes interest.
- Both guides on a trip receive all notifications. Co-manager also receives all notifications.

### Rideshare Board
- When hiker cancels: their ride posting cancelled (claimers notified), claimed spots released.
- Direction: default both ways, can specify one-way.
- Chat from rideshare: deleted when hiker cancels registration.

### Search
- Text search: trip name and description only (not guide name, not waypoints).
- Favorite guides filter: only guides the user actively follows.
- Full trips shown in search with "Full" indicator + waitlist option.
- Past trips not shown in regular search (historical search = future phase).

### Age Restrictions
- Hiker without age in profile: blocked from registering for age-restricted trips.
- Hiker below min age: warned (not blocked), guide also notified. Guide's decision is final.

### Guide Rejection of Registrant
- Guide can put registrant in "pending review" state to communicate first.
- Once decision made (accept/reject): final and irreversible.
- Rejected hiker: full refund regardless of policy, blocked from re-registering for that specific trip only. Can register for other trips by same guide.

### Publication States
- Can change between public and private anytime, even with registrants.
- Interested users notified when trip changes from public to private.
- Followers only notified about PUBLIC new trips (not private).

### Journey-Specific Rules
- One cancellation policy for entire journey (not per day).
- Payment for multi-day individual registration: one combined authorization for all selected days. Capture based on no-refund window of the earliest selected day.
- Cancelling individual day in "individual days" mode: allowed, refund per policy.
- "Full journey" mode: no refund for leaving mid-journey. Full policy applies if cancelled before start.
- "Flexibility" mode: paid in full upfront, can leave anytime mid-journey, no refund for unused days.
- Major change to any single day = major change for entire journey → all registrants notified.

### Notifications
- Each update = separate notification (no bundling even if 3 updates in 1 hour).
- Notification = summary of what changed. Tap to open trip page.
- Every trip change notifies registrants — including description-only changes.
- Simple interest threshold alert: fires when spots drop below the threshold.

### Co-Manager
- Only original trip creator can add/remove co-managers.
- Co-manager has full equal access including cancelling the trip.
- Co-manager cannot add other co-managers.

### Reviews (continued)
- Threaded replies: hiker writes review, guide replies, hiker can reply back. No depth limit (expected to stay 2-3 messages).
- Reviews visible to logged-in users only.
- Hiker who registered but didn't show up can still write a review (had interaction with guide before the trip).

### Rejection
- Guide must specify a written reason. Hiker sees the full reason.

### Guide Profile (continued)
- Platform stats shown automatically: number of trips led, total hikers, on-time percentage, number of cancellations, average rating.
- Guide profile only visible if guide has at least one active public trip. No trips = not visible on platform.
- New guide with no reviews yet: rating not shown at all (not "0" or "no rating").
- Rating shown on: trip card (level 1), full trip page (level 2), and guide profile.
- Reviews accessible from any trip the guide led, linking to full profile.

### Conditional Interest (continued)
- No limit on number of AND conditions a hiker can define.

### Broadcast
- No limit on number of broadcasts a guide can send.

### Refunds (continued)
- Processed immediately via Stripe. Bank arrival time (typically 3-5 business days) is outside platform control.

### Trip Postponement (continued)
- No time limit — guide can leave a trip in "postponed" state indefinitely.
- Journey postponement: all days postponed together as one unit. Cannot postpone a single day.

### Blocking
- No guide-level blocking of a hiker. Blocking is trip-specific only (after rejection).

### Sharing
- Any hiker can share a trip link — including private trips. Recipients can access and register for private trips via shared link.

### GPX & Route
- Guide can replace GPX anytime, even with registrants. Map and elevation auto-update. Registrants notified of route update.

### Photos
- Guide can add/replace/delete photos anytime. Photo changes do NOT trigger notifications to registrants.
- Minimum 1 main photo required to publish. Up to 8 photos total, staggered fade rotation every 5-6 seconds.

### Visibility Requirements
- Reviews and Q&A visible to logged-in users only.

### Threshold Alerts
- Fires once only — when capacity first drops below the threshold the hiker set.

### Guide Dashboard (continued)
- Guide sees all types of interest: simple, conditional, registrants, and waitlist.
- Guide can export registrant list as CSV (name, email, payment status, dynamic field answers).

### Date Conflicts
- System does not warn about double-booking (two trips, same date/time). Hiker's responsibility.

### Mandatory Fields to Publish a Trip
Name, date, time, region, main photo, GPX, equipment (at least one item), cancellation policy, completed guide profile. Price — if not set, guide gets a warning; if they proceed, trip is treated as free (0₪).
- Guide profile must be filled (at least bio and specialty regions) before publishing first trip.

### Re-registration
- Hiker who cancelled can re-register for the same trip if a spot is available.

### My Trips Sorting
- Upcoming trips sorted by date, soonest first.

### Trip Duplication
- Future feature (Phase 2) — duplicate a trip and edit specific fields. Not available in Phase 1.

### Journey — Individual Days (continued)
- Hiker can add more days to their registration anytime, as long as spots are available and the day hasn't passed.
- One max-participants setting for the entire journey — cannot vary by day.

### No-Show
- Hiker who registered and paid but didn't show up: no refund. Treated as cancellation after the no-refund window.

### Cancelled Trip Revival
- Cancelled trips appear in guide dashboard under "Cancelled". Guide can revive and republish with a new date.

### Notifications Display
- Shown in a dedicated notifications page only. No real-time in-app pop-up. Push notifications to phone — Phase 2.

### Homepage
- Logged-out user: marketing landing page, not a trip list.
- Logged-in user: recommended trips based on personal preferences, with prominent buttons to full search and calendar.

### Same Account, Multiple Roles
- Same user account can act as both hiker and guide. No separate accounts needed.

### Becoming a Guide
- Any user can become a guide with no verification or approval process. Self-declared only.

### Accessibility & Language
- No specific accessibility requirements in Phase 1.
- Hebrew only in Phase 1. English support — Phase 2.

### Credit Card Storage
- Optional. Hiker can choose to save card for future registrations, or re-enter every time.

### Registration Cancellation Flow
- Single simple button, no additional confirmation step.

### New Guide Display
- If guide has no reviews yet: show "New Guide" badge instead of a rating.

### Guide Trip Cancellation Message
- Category (required) + free-text personal message (optional) to registrants.

### Date Display Format
- Show together: day of week (e.g. "יום ה'") + Hebrew date + Gregorian date.
- Example: "יום ה', י"ז בשבט תשפ"ו · 14 בפברואר 2026"

### Currency
- ILS (Shekel) only in Phase 1. Multi-currency support — Phase 2.

### Guide Search Preview
- Guide can see a "Preview" of how their trip appears in search/card view, directly from the dashboard.

### Frequent Cancellations
- No automatic consequence in Phase 1. Logged in cancellation history on profile — may be used for future analytics or restrictions.

### User Support
- Not required in Phase 1. Support channel — Phase 2.

### Rating Display
- Shown as number + review count, e.g. "4.9 · 47 reviews".

### Editing a Trip with Major Change Fields
- When guide edits a field defined as a "major change" trigger — show a warning before saving: "This change will be considered a major change. Registrants will get 24 hours to decide whether to stay." Guide confirms, then the change saves and the major-change flow triggers.

### Guide Capacity Alerts
- Guide can optionally set up to two capacity threshold alerts (e.g. 50% and 90% full). Off by default — guide opts in and chooses the percentages.

### Multiple Simultaneous Cancellations
- Each cancellation triggers a separate notification to the guide — no bundling, even if several hikers cancel at the same time. Consistent with the rule that every update = a separate notification.

### Dynamic Fields — Editing
- Hiker can edit their dynamic field answers anytime after registration.
- Re-registration after cancellation: previous dynamic field answers are saved and pre-filled by default, editable.

### WhatsApp Integration
- Not needed. The platform replaces the role of a WhatsApp group through the combination of Broadcast, public Q&A, and notifications. No external link required.

### Broadcast Recipients
- Reaches everyone connected to the trip: registrants, waitlist, and interested users (simple and conditional).

### Multi-Person Registration
- A hiker can register multiple people at once. Guide chooses the mode per trip:
  1. **Simple registration** — hiker selects a quantity, pays for all, no per-person details required.
  2. **Detailed registration** — hiker selects a quantity, then fills a separate form (name + dynamic fields) for each participant.

### Partial Cancellation (Multi-Person Registration)
- Hiker can cancel part of a multi-person registration (e.g. cancel 1 of 3). Refund applies only to that portion, per the cancellation policy.

### Source Materials / Reference Documents
- Guide can attach reference materials (e.g. Bible verses, scientific articles, historical context) as PDF files and/or external links — not free text.
- Can be attached at two levels: the trip overall (general references) and a specific waypoint (context relevant to that exact location).
- Displayed accordingly: trip-level materials in the trip description area; waypoint-level materials in the waypoint detail.

### Source Materials in a Journey
- Can be attached at three levels: overall journey, specific day, and specific waypoint within a day.

### Source Materials Visibility
- Guide decides, per trip, whether source materials are visible in advance (to anyone viewing the trip page, as a preview/incentive) or only revealed during the trip itself (to registrants only, on the day of the trip).

### Favorites Button (Heart Icon)
- Completely separate from "Interested". Simple save-for-later — no notifications, no commitment. "Interested" includes a threshold alert or conditions; "Favorite" is just a bookmark.

### "My Trips" Page — Tab Structure (Final)
Four tabs, ordered from most urgent to least:
1. **Upcoming** — active registrations + waitlist position
2. **Interested** — simple interest + conditional interest
3. **Favorites** — saved trips (heart icon), no commitment, no alerts
4. **History** — completed and cancelled trips

### Guide/Hiker Mode Switch
- Toggle button at the top of the page ("Switch to Guide view" / "Switch to Hiker view"). Each mode shows the appropriate interface and navigation for that role.

### Default Mode on Login
- The last active mode (guide/hiker) is remembered and restored on next login.

### Location-Based Search
- Not default. Hiker can opt into a "near me" filter manually — not automatically active.

### Guide Onboarding
- Not required in Phase 1. Guide starts directly with trip creation. May be added later if found to be confusing.

### Platform Fee
- Deducted from the payout to the guide — NOT added on top of the price the hiker sees. The price the hiker pays is exactly the price the guide set.

### Guide Payout Timing
- Guide receives payment only after the trip has actually taken place (the day after the trip date). This protects against cases where the trip doesn't happen for any reason.

### Payout Split — Two Guides
- Full amount goes to the primary guide only. Financial arrangement with the secondary guide is handled outside the platform.

### Trip Creation/Editing — Platform Scope
- Creation (full wizard, GPX upload, map, waypoints) — Web only in Phase 1. Not available on Android.
- Editing — guide can edit simple fields from Android (description, photos, answering Q&A, sending broadcasts). Complex fields (GPX, route, waypoints, parameters) — Web only.

---

## NEW FEATURE: Self-Guided Trip (טיול עצמאי)

### Concept
A new trip type where the guide creates a complete trip package (route, waypoints, guidance materials) that hikers purchase and experience entirely on their own, without a live guide present. Designed for families or groups who want a guided-quality experience at lower cost and flexible timing.

### Key Differences from Regular Trips
- **Always available** — no scheduled date/time. Buyer chooses when to go after purchase.
- **No participant limit** — unlimited purchases, no capacity tracking.
- **No live guide on-site** — the guide creates the content once; no real-time presence required.
- **Payment**: immediate and final at purchase. No Authorization/Capture flow, no cancellation policy — this is a one-time content purchase, not a booking.
- **Access window**: guide sets how long the buyer has access to the trip content after purchase (e.g. 1 week, 1 month, 1 year) — defined per trip at creation.

### Unique Content Requirements
Beyond standard trip fields (GPX, route, equipment), self-guided trips require:
- **Detailed turn-by-turn navigation instructions** at every waypoint (not just descriptive — actual step-by-step guidance, e.g. "after 200m turn left at the large tree")
- **Mandatory guidance materials** (text and/or audio) at every stop — replaces the live guide's explanation
- **Trip-specific safety warnings** for each route segment

### Discovery
- Appears in a completely separate category/tab in search — not mixed with regular guided trips.

### Reviews
- Anyone who purchased can write a review, regardless of whether they actually completed the trip.

### Naming
- Product name: "טיול עצמאי" (Self-Guided Trip)

### Self-Guided Trip — Pricing
- One fixed price per purchase, regardless of group size.

### Self-Guided Trip — Content Sharing
- Buyer can share access with up to 3 additional people (e.g. family members).

### Self-Guided Trip — Offline Access
- Online by default. User can choose to download content in advance for offline viewing before heading into the field (important in areas with no reception).

### "My Trips" Page — Updated Tab Structure (5 tabs)
1. Upcoming
2. Interested
3. Favorites
4. History
5. **Self-Guided Trips** (new) — shows all purchases with access status (active/expired) and a link to start/continue the trip.

### Guide Dashboard — Self-Guided Trips Section
- Managed in a completely separate area from regular trips (different tab/section in the dashboard).
- Shows: number of purchases, total revenue, reviews — not capacity/registrants/date (not applicable to this trip type).

### Self-Guided Trip — No Communication Channel
- No chat, no Q&A, no contact with the guide. Pure content — the buyer is fully self-sufficient with the materials provided.

### Self-Guided Trip — No Rideshare Board
- Not applicable — there's no shared date/time to coordinate transportation around.

### Self-Guided Trip — Required Fields to Publish
Same baseline as regular trips, with adjustments:
- **Required (same as regular trips)**: name, region, main photo, GPX, equipment (at least one item), completed guide profile.
- **Required (unique to self-guided)**: detailed turn-by-turn navigation instructions per waypoint, mandatory guidance materials (text/audio) per stop, access duration setting, price.
- **NOT required (not applicable)**: date/time, cancellation policy, max/min participants.

### Self-Guided Trip — Content Updates
- Buyers still within their access window automatically receive the latest updated version of the content.

### Guide Rating — Separated by Trip Type
- Guide rating for regular (guided) trips and rating for self-guided trips are completely separate — never combined into one score.

### Self-Guided Journey (Multi-Day)
- Self-guided trips can also be multi-day journeys. Same structure as a regular journey (separate days, each with its own route, navigation, and guidance materials) — but without fixed dates, without purchase limits, and one final payment for the entire journey.

---

## NEW: Trip Attribute Tags (Searchable Filters)

### Concept
Additional trip characteristics, set by the guide at creation, that hikers can filter by in search — same mechanism as difficulty/region filters.

### Tag List (Phase 1)
- 🐕 Dog-friendly
- 👶 Stroller/baby-friendly
- ♿ Wheelchair accessible
- 🚻 Restrooms available
- 🅿️ Parking available
- 🌳 Shaded route
- 💧 Water features (streams/pools for dipping)
- 🔥 Suitable for campfire/outdoor cooking

### Implementation
- Each tag is a searchable filter, same as difficulty and region.
- Guide selects applicable tags during trip creation (Step 3 — Parameters).
- Tags displayed on trip card and full trip page.

### Trip Attribute Tags — Final List & Classification

**Applies to both regular (guided) trips and self-guided trips:**
- 🐕 Dog-friendly
- 👶 Stroller/baby-friendly
- 🚸 Suitable for young children (walking age, not just strollers)
- ♿ Wheelchair accessible
- 🚻 Restrooms available
- 🌳 Shaded route
- 💧 Water features (streams/pools for dipping)
- 🏊 Suitable for swimming
- 🚲 Suitable for cycling
- 📸 Scenic viewpoints/photo spots
- 🧗 Requires climbing/hands-on scrambling
- 🌙 Night trip

**Applies ONLY to self-guided trips:**
- 🔥 Suitable for campfire/outdoor cooking
- 🌅 Good for sunrise/sunset (timing-dependent, only meaningful when hiker chooses their own time)
- 🍂 Seasonal recommendation (e.g. spring bloom, autumn colors)
- 🌧️ Not suitable on rainy days (stream/mud route)

**Removed (not relevant):**
- Parking — removed, not a meaningful differentiator.
- 🦟 Mosquito-heavy area — removed.
- 🐍 Snake habitat area — removed.
- ☀️ No shade at all — removed.

### Journey — Rideshare Board Scope
- Rideshare board exists only for Day 1 (arrival at the journey) and the last day (return trip home). No rideshare board for middle days.

### Journey — Private Chat
- One unified chat thread with all journey guides together, not separated by day or guide.

### Journey — Public Q&A
- Separate Q&A thread per day, not one unified thread for the whole journey.

### Journey — Reviews
- One unified review for the entire journey, not separate per day.

### Journey — Reviews for Partial (Single-Day) Participants
- A hiker who registered for even just one day out of the journey can write a review for the entire journey, not just that specific day.

### Guide Dashboard — Journey Registrants Display
- One unified list, with a column showing which days each hiker registered for.

### Journey — Partial Waitlist (Individual Days Mode)
- A hiker can register directly for open days and join the waitlist only for full days within the same journey. Each day manages its own capacity and waitlist independently.

### Journey — Capacity Threshold Alerts (Individual Days Mode)
- Separate per day — hiker sets a specific capacity alert threshold for each day they're interested in.

### Adding a Co-Manager
- Immediate access granted — no acceptance/confirmation required from the co-manager.

### Co-Manager — Final Definition (Corrected)
- Co-manager is a backend management partner ONLY. Does NOT appear as a guide on the trip page, NOT visible to hikers, does NOT receive a rating.
- Has full management access behind the scenes: dashboard, registrants, broadcast, can even cancel the trip.
- Co-manager can remove themselves from a trip at any time — not only the primary guide can remove them.

### Adding a Visible Second Guide
- Both the primary guide AND a co-manager can add a second visible guide to the trip. The only restriction on co-managers remains: they cannot add/remove other co-managers.

### Co-Manager Limit
- Limited to a small number per trip (e.g. up to 3) — not unlimited.

### Notifications — Unread Indicator
- Red badge with count on the notifications icon shows the number of unread notifications.

### Notifications — Retention
- Auto-deleted after a defined period (e.g. 90 days) — not kept forever.

### Notifications — Display by Active Mode
- Separated by active mode (guide/hiker). Switching modes shows only the notifications relevant to that mode.

### Guide Rating — Calculation & Trend Indicator
- Simple average of all reviews.
- If there's a meaningful gap between recent reviews (recent period) and the historical average, display a trend badge next to the rating: "📈 Recently improving" or "📉 Recently declining". Helps hikers know if the overall rating reflects the current experience.

### Review Structure
- Star rating only (1-5), general — no separate category ratings in Phase 1. Specific feedback (knowledge, conduct, punctuality) goes in the free-text review body.

### Guide Cancellation Before Capture
- Simple: the Authorization is automatically voided, no money moves at all. All registrants receive a standard cancellation notification.

### Guide Financial Reports
- Phase 1: simple revenue summary report (not an official invoice). Official invoicing requires a payment-provider arrangement or appropriate licensing — Phase 2.

### Rideshare Board — Single Trip Scope
- Each ride post belongs to exactly one trip. Cannot link a single ride to multiple trips.

### Guide Following Another Guide
- No separate mechanism needed. A guide simply switches to "hiker" mode (using the existing mode toggle) and follows like any other hiker.

### Conditional Interest — "Better Than Requested" Trigger
- Any condition that is met or exceeded triggers the condition automatically. E.g. a condition "if it shortens to 20km" also triggers if the trip shortens to 18km.

### Profile Photo
- Hiker: optional. Default avatar with initials and colored background.
- Guide: **required**. A guide cannot publish a trip without a profile photo (builds trust with hikers).

### Main Navigation — Hiker
- 4 tabs: Search, My Trips, Notifications, Profile.

### Main Navigation — Guide
- 4 tabs, parallel structure to hiker nav: Dashboard (my trips, including separate self-guided trips tab), Registrants (all trips overview), Notifications, Profile (includes switch to hiker mode).

### Search — No Autocomplete
- Search executes only after pressing Enter / search button. No live suggestions while typing.

### Review Sharing
- Only the full guide page or trip page can be shared — no direct link to a specific individual review.

### Account Creation — Minimum Age
- No minimum age requirement for creating a platform account (age restrictions exist only at the individual trip level, as already defined).

### Hiker Account Deletion with Active Registrations
- If there are active future registrations, the system shows a clear warning explaining that deleting the account will automatically cancel all active registrations. The hiker must knowingly confirm before deletion proceeds.

### Guide Notification — Cancellation from Account Deletion
- Standard cancellation notification, same as any other cancellation — no special explanation about the reason.

### Featured/Promoted Trips
- No "featured" or "highlighted" tag mechanism in Phase 1.

### Hiker Photo Gallery
- No hiker-submitted photo gallery feature in Phase 1.

### Weather Display
- Not relevant in Phase 1. Weather/context awareness — Phase 2 (already noted in the original scope).

### Social Sharing
- Share button opens the target app (WhatsApp, etc.) with a ready-made trip link. The link works even for recipients without the TrailHub app installed — opens in the Web version.

### Real-Time Position on Map (All Trip Types)
- A blue dot shows the user's real-time location on the map relative to the route (personal GPS only, not shared with anyone). Applies to regular guided trips, journeys, and self-guided trips alike.

### Self-Guided Trip — Text-to-Speech
- Guidance materials include a "read aloud" option (Text-to-Speech) that reads the text content out loud — not only manually recorded audio files.

### Saving Trips for Later Viewing — Clarification
- This is fully covered by the existing Favorites feature (heart icon) — no separate mechanism needed.

### Guide Comp Codes (Free Volunteer Invites)
- Guide can generate a coupon code for 100% discount, given to a specific person (volunteer, friend, route-tester).
- When the code is used at registration, the person registers for free.
- Comp registrations do NOT count against the trip's max participant capacity — they're entirely outside the regular paying group count.
- Guide can issue as many comp codes as they want, independent of the trip's capacity limit.

### Hiker Profile Photo — Editing After Registration
- Hiker can change their profile photo anytime, even after already being registered for trips.

### Private Chat Availability — Reconfirmed
- Already established: private chat is available to interested users (simple or conditional) and registrants alike, not registrants only. (See earlier decision #23.)

### Google Calendar — One-Way Export
- Both guides and hikers can add a trip to their personal Google Calendar via a simple "Add to Calendar" button. Available on: guide's own trips (guide dashboard), and hiker's registered/upcoming trips (My Trips). One-way export only (app → calendar) — not a two-way sync/connection.

### Search Entry — Guided Intent Flow (Replaces Calendar Toggle)
- On entering search, the hiker is first asked a quick intent question instead of choosing between "List" and "Calendar" views upfront.
- Example options: "I know when I'm free — show me what's available", "I know what kind of trip I want, not sure when", "Just show me everything".
- Based on the answer, the system opens the search results with the relevant filter already emphasized/expanded: date-first (calendar-style date picker prominent) if availability-driven, or difficulty/region filters prominent if content-driven, or the full unfiltered list if open-ended.
- This replaces the original full-screen List/Calendar toggle (wireframe 05) — the calendar becomes a contextual tool within this flow rather than a separate persistent view.
- Returning users can skip the intent question (remembered preference) or access it again via a "change what I'm looking for" option.


### Search Entry — Intent Question Options (Detailed)
The initial intent question offers these options, each leading to a distinct full scenario:

**1. "I know when I'm free"**
→ A compact calendar opens at the top of the screen. Hiker picks a date (e.g. "next Friday"). Below the calendar, the list shows all trips departing that day, sorted by time.

**2. "Looking for a specific kind of trip"**
→ Standard search list opens with filters (difficulty, region, tags) already expanded/prominent, no date constraint applied. Hiker narrows by content first.

**3. "Show me what's coming up soon"**
→ List opens immediately, sorted by nearest upcoming date, no filters pre-applied — a quick "what's happening soon" view.

**4. "Just browsing, surprise me"**
→ List opens with trips curated/ordered based on the hiker's saved preferences (regions, difficulty) rather than strict date or filter logic.

### Favorites — Independent of Registration Status
- The Favorites (heart) flag is completely independent of registration status. Cancelling a registration does NOT remove the trip from favorites — they're two separate mechanisms.

### Trip Page Access After Registration Cancellation
- Identical to any other logged-in visitor — can still view description, reviews, public Q&A. Does not lose access to the page itself.

### Deleting a Past Trip
- Not possible. Permanently retained to preserve review and rating history.

### Stale Draft Auto-Cleanup
- If a draft is untouched for ~2-3 weeks, the guide receives a warning notification about upcoming auto-deletion. A grace period of a few additional days follows. If still untouched, the draft is automatically deleted.

### Self-Guided Trip — Exception Refund / Dispute Process

**Content defect claim:**
- Buyer can file a complaint if they claim the route/content is defective, missing, or significantly inaccurate (e.g. described as "winter-suitable" but actually isn't).
- Complaint goes simultaneously to: (1) platform admins, (2) the guide who created the content.

**Accidental purchase (e.g. double-click):**
- Possible, but more restricted than a content complaint — there must be a reasonable time window (e.g. cannot claim "bought by accident" two days later, since they may have already completed the trip by then). Exact window TBD but should be short (e.g. same day / few hours).

**Aggregate complaint detection:**
- The system should track complaints per self-guided trip and flag a pattern — if multiple buyers report the same issue (e.g. several people independently say the route doesn't match its description, or isn't winter-suitable as claimed), this should surface as a signal to admins that the content itself may be defective, not just an individual dispute.
- This aggregate signal helps distinguish "one person didn't like it" from "the content is actually broken/misrepresented."

### Platform Admin Panel (New — Required in Phase 1)
- Basic admin panel required already in Phase 1.
- Access: a defined team of admins (not just the platform owner) — role configurable in the future, but the system must support multiple admin accounts from the start.
- Core capabilities needed: view/manage users, handle complaints and disputes (including self-guided trip content complaints with aggregate pattern flagging), suspend/deactivate problematic accounts, view platform-wide stats.

### Admin Suspending a Guide
- Not available in Phase 1. Admins can handle complaints and view data, but cannot forcibly suspend/deactivate a guide's account in this phase — guide deactivation remains voluntary only (as already defined).

### Admin — Urgent Action Available
- Admin can remove a specific trip from search/publication (not suspend the guide entirely). This is the only urgent enforcement action available in Phase 1.

### Self-Guided Trip — Pre-Publish Automated Checks (No Human Review Team)
**Moved to a later phase — NOT Phase 1.** Both the logical consistency validation and the duplicate/similar trip detection described below are deferred to a more advanced phase, once there's enough trip volume and data for these checks to be meaningful. Phase 1: no automated pre-publish checks — guide publishes directly.

[Deferred spec, for future reference:]

**1. Logical consistency validation (applies to BOTH regular guided trips and self-guided trips):**
- System checks for contradictions between trip attributes/tags and content. Example: trip tagged "winter-suitable" but equipment list mentions sandals — flag as a potential inconsistency for the guide to review before publishing (warning, not a hard block).

**2. Duplicate/similar trip detection (SELF-GUIDED TRIPS ONLY):**
- System checks if a very similar trip (same/overlapping route, similar GPX, similar location) already exists on the platform.
- If a close match is found, the guide is shown a notice before publishing — like a recipe site flagging "a very similar recipe already exists" — prompting them to consider whether this is genuinely a new offering or a near-duplicate.
- This doesn't block publishing, just surfaces the comparison for the guide's judgment.
- **NOT applicable to regular guided trips** — a guide legitimately running the same route repeatedly (e.g. monthly) is expected and valid; there's nothing to flag there. Duplicate detection only makes sense for self-guided content, which is a one-time content product rather than a recurring live-guided event.

### Admin-Removed Self-Guided Trip — Existing Buyer Impact
- Existing buyers (within their access window) receive a notification explaining the content was found defective/problematic, and lose access to the content immediately.

### Private Chat — Closing a Conversation
- Only the primary/original guide can close a private chat with a hiker. A secondary guide cannot close it.

### Broadcast Message Format
- Free-text message, guide's choice. No forced structure — guide can write one long message with all details, or send several separate shorter broadcasts. No daily limit (as already established).

### Registration Flow — Field Order Flexibility
- No strict order enforced. Hiker can save card details before completing all dynamic fields for multi-person registrations — the system doesn't force a specific sequence.

### Co-Manager — Comp Codes Permission
- Co-manager can issue comp codes (free volunteer invites) for trips they manage, same as the primary guide.

### Comp Codes — No Limit
- No maximum number of comp codes per trip.

### Comp Code Registrant — Review & Rating Rights
- A volunteer/comp registrant who actually participated can write a review and rate the guide, exactly like a paying hiker.

### Comp Codes — Not Single-Use, Not Person-Locked
- A comp code is not restricted to one specific person — it works for anyone who receives and enters it (guide controls distribution by who they choose to send it to, but the system doesn't enforce a single-use lock per code).

### Comp Codes — Cancellation Before Use
- Guide can cancel/revoke a comp code if it hasn't been used yet. Once used, it cannot be revoked.

### Comp Registrant — Dashboard Display
- Appears in the guide's registrant list exactly like any other registrant — no special "volunteer" badge or distinction.

### Comp Codes — Applicable to Journey Individual-Day Registration
- Comp codes work for individual-day registration within a journey, same discount mechanism as regular trips.

---

## Trip Detail Page — Hiker View (Finalized)

### Page Order (top to bottom)
1. Photos (rotating with staggered fade, 5-6 sec intervals)
2. Trip name
3. Guide name(s) + rating — both guides shown equally, no visual distinction between primary/secondary
4. Tags (difficulty, region, attribute tags)
5. Quick stats (km, hours, min age)
6. Capacity bar — shown prominently in the upper section, not just near the registration button
7. Date and departure time
8. Meeting point + navigation button (opens Waze/Google Maps)
9. Description
10. Map with route + waypoints (tapping a waypoint opens a full drawer with name, description, source materials if available)
11. Elevation chart
12. Equipment list + "Copy list" button (copies all items to clipboard — if technically simple)
13. Source materials (closed by default — guide actively opens them; close again after trip at guide's discretion)
14. Q&A (official-answer questions first, then chronological)
15. Reviews (all shown, no pagination)
16. Rideshare board link
17. Cancellation policy

### Registration Button
- Floating fixed at bottom of screen, always visible while scrolling (if technically simple; otherwise at bottom of page only).

### Platform Fee
- NO service fee added to hiker price. Hiker pays exactly the guide's stated price. Platform fee is deducted from guide payout only, never shown to hiker.

### Registration Flow Steps
1. Cancellation policy display (all tiers shown explicitly) + confirmation checkbox
2. Dynamic fields (if guide defined any — otherwise step disappears entirely)
3. Payment (saved card option + option to save new card)
4. Cancellation threshold alert (per-trip setting, not global profile setting)
5. Confirmation screen: trip name + date + time + guide name + charge date + alert timing + Add to Google Calendar button + Back to Search button

### Cancellation Flow
- Not a single tap. Intermediate screen shows exact refund amount calculated based on current time vs. no-refund window.
- Includes estimated refund timing: "usually 3-5 business days depending on your bank" if exact timing unknown.

### Source Materials Visibility
- Closed by default — guide must actively open them.
- Close again after trip at guide's discretion (not automatic).

---

## Homepage (Logged-in Hiker) — Finalized

### Structure (top to bottom)
1. **Hero** — rotating by visit count (visit 1→2→3→4→1→2...)
2. **Intent question** — 4 large prominent buttons ("מה תרצה לעשות היום?")
3. No personalized recommendations in Phase 1

### Hero Rotation Categories
Rotates by visit number, not by time:
- Visit 1: **Featured Trip** — highest-rated upcoming trip
- Visit 2: **Featured Guide** — most active guide recently
- Visit 3: **New in App** — feature or improvement (written manually by admin)
- Visit 4: **Trip Near You** — based on user's preferred region
- Visit 5: back to Visit 1, etc.

### Hero — Two Actions
Each Hero has two buttons regardless of category:
1. **Context-sensitive deeplink** — "צפה בטיול" / "ראה פרופיל מדריך" / "קרא עוד" depending on category
2. **"אהבתי — הראה לי עוד כאלה"** — saves preference signal. Phase 1: data collection only, no action taken on it yet. Foundation for future personalization engine.

### Intent Question
4 large/prominent buttons displayed below the Hero:
1. "אני יודע מתי אני פנוי" → opens calendar date picker, filters trips by that date
2. "מחפש סוג טיול מסוים" → opens search with filters prominent
3. "מה יש בקרוב?" → list sorted by nearest upcoming date
4. "הפתיעו אותי" → list based on personal preferences

---

## Homepage — Finalized Spec

### Structure (top to bottom, nothing else)
1. Top bar: logo "TRAILHUB" + notification bell + profile avatar
2. Hero — full-width ~70vh
3. Intent question section: "מה תרצה לעשות היום?" + 4 cards in 2x2 grid
4. Nothing below the intent cards

### Hero Rotation — by Visit Count
Rotates by visit number (1→2→3→4→1→2...):
- Visit 1: Featured Trip — highest-rated upcoming trip (auto)
- Visit 2: Featured Guide — most active guide recently (auto)
- Visit 3: New in App — written manually by admin in Admin Panel
- Visit 4: Trip Near You — based on user's preferred region (auto)

### Hero — Two Action Buttons
1. Context-sensitive deeplink: "צפה בטיול" / "ראה פרופיל מדריך" / "קרא עוד"
2. "♥ אהבתי — הראה לי עוד כאלה" — saves preference signal only. Phase 1: data collection, no personalization action yet.

### Intent Cards (exact labels, 2x2 grid)
1. "אני יודע מתי אני פנוי" → opens calendar date picker
2. "מחפש סוג טיול מסוים" → opens search with filters prominent
3. "מה יש בקרוב?" → list sorted by nearest date
4. "הפתיעו אותי" → list based on personal preferences

---

## Trip Detail Page — Hiker View (Finalized Order)
1. Photos (full-width, staggered fade, 5-6 sec, NOT simultaneous)
2. Trip name
3. Guide name(s) + rating — both shown equally, no primary/secondary distinction
4. Tags (difficulty, region, attribute tags)
5. Quick stats: km / hours / min age
6. Capacity bar — prominent in upper section
7. Date and departure time
8. Meeting point + Waze/Google Maps button
9. Description
10. Map with route + waypoints (tap waypoint → full drawer: name, description, source materials)
11. Elevation chart
12. Equipment list + "העתק רשימה" button (copies to clipboard)
13. Source materials (closed by default — guide actively opens; close after trip at guide's discretion)
14. Q&A (official-answer questions first, then chronological)
15. Reviews (all shown, no pagination)
16. Rideshare board link
17. Cancellation policy

### Registration Button
- Floating fixed at bottom, always visible while scrolling.

---

## Registration Flow — Exact 5 Steps
1. Cancellation policy (all tiers explicit) + confirmation checkbox
2. Dynamic fields — step DISAPPEARS ENTIRELY if guide defined none
3. Payment — saved card option + save new card option
4. Cancellation threshold alert — per-trip (not global profile setting)
5. Confirmation screen: trip name + date + time + guide + charge date + alert timing + "הוסף ליומן Google" + "חזרה לחיפוש"

### Platform Fee
- NO fee shown to hiker ever. Hiker pays guide's stated price exactly.
- Platform fee deducted from guide payout only, behind the scenes.

---

## Cancellation Flow
- Intermediate screen before cancellation completes:
  - Shows exact refund amount per current cancellation policy
  - Shows estimated timing: "בדרך כלל 3-5 ימי עסקים" if Stripe timing unknown

---

## Design System

### Aesthetic Direction
- Inspired by NOMAD hiking app (Behance: behance.net/gallery/191501569)
- Editorial, magazine-like — NOT a generic utility app
- Generous whitespace, full-width photography, strong typographic hierarchy

### Color
- Default: Dark mode — deep blacks (#0a0a0a), dark greens, earthy browns
- Accent: warm green (#3d8f5f) or amber (#c8893a) — used sparingly for CTAs only
- Max 2-3 colors in palette
- User can toggle Light mode in Settings — both modes must look premium

### Typography
- Headings / trip names: Playfair Display (Google Fonts)
- Body / metadata: Inter (Google Fonts)
- Strong size contrast between display and body text

### Icons
- Lucide icons throughout — not emoji

### Trip Cards
- Large image ~60% of card height, full-width
- Dark gradient overlay on image
- Trip name in Playfair Display over gradient
- Guide avatar + name + rating minimal at bottom of image
- Stats row below card (km, hours, date, price) in small Inter
- Capacity bar below stats

### Bottom Navigation
- 4 tabs: Search / My Trips / Notifications / Profile
- Lucide icons, active tab shows accent color label
- No labels on inactive tabs


---

## Additional Bug Fixes — Round 3

### Password Reset
- Add "Forgot password" / "שכחתי סיסמה" link on the login screen. Sends a password reset email to the user. Required — currently missing entirely.

### Trip Card — Tag Overlap
- Region and difficulty tags currently overlap with the trip name on the card (both positioned top-right). Fix the layout so tags and trip name don't collide — tags should be positioned separately (e.g. top-left, or below the title).

---

## Pre-Production Checklist

### MUST DO before going live:
- **Full database reset** — wipe all test data (trips, users, registrations, reviews, seed data) before launch.
- Replace all 8 test guide accounts (real names from teva.org.il) with fictional guides or real guides who have given explicit permission.
- Replace Unsplash test images with licensed or owned photos.
- Switch Stripe from test mode to live mode.
- Publish Google OAuth consent screen (remove "Testing" restriction).
- Replace all seed/test data with real content.

---

## Rideshare Board — Trip Card Integration

### Rideshare indicator on trip card
Add a rideshare indicator to the bottom stats row of every trip card (date, km, hours row), positioned on the right side. It shows a label "טרמפים" above and icons below, both right-aligned (`align-items: flex-end`).

### 5 states (right side of stats row):

**State 1 — Not registered/interested (locked):**
- Label: "טרמפים" in muted color
- Icons: car icon + small lock icon, both muted, opacity 0.5
- Not clickable. Tooltip on hover: "הירשם לטיול כדי לגשת ללוח הטרמפים"

**State 2 — Registered, no rides yet:**
- Label: "טרמפים" in muted color
- Icons: car icon + text "אין עדיין", muted
- Clickable → opens rideshare drawer

**State 3 — Registered, only seekers (no offers):**
- Label: "טרמפים" in accent/blue color
- Icons: person-search icon + "X מחפשים", blue
- Clickable → opens rideshare drawer

**State 4 — Registered, rides available:**
- Label: "טרמפים" in success/green color
- Icons: car icon + "X מקומות", green
- Clickable → opens rideshare drawer

**State 5 — Registered, both rides and seekers:**
- Label: "טרמפים" in green
- Two separate small badges side by side: green car + count, blue person-search + count
- Clickable → opens rideshare drawer

### Rideshare drawer
- Opens as a bottom sheet/drawer, NOT a new page
- User stays in the context of the trip card/page
- Shows the full rideshare board content inside the drawer

---

## Rideshare Modal — Full Spec

### Trigger
Clicking the rideshare indicator on any trip card opens a modal overlay (not a new page). Closing the modal returns the user to exactly where they were.

### Modal Header
- Single line: "לוח טרמפים — [trip name] · [date]" — all same font size and weight, trip name and date in muted color after the dash
- Close button (X) on the left

### Tabs (two tabs)
- Tab 1: "טרמפים מוצעים (N)" — default active
- Tab 2: "מחפשים (N)"

### Tab 1 — Offered rides
Each ride card shows:
- Avatar (initials) + name + phone number
- Seats badge (green): "N מקומות"
- Details row: departure point (pin icon) + direction (arrows icon) + cost sharing (coin icon) if applicable
- Two separate action buttons:
  - "תפוס מקום" — claims a spot (green background)
  - "פתח צ'אט" — opens private chat with the driver (neutral background + message icon)

### Tab 2 — Ride seekers
Each seeker card shows:
- Avatar (initials) + name + general area
- "פתח צ'אט" button (blue/accent) — opens private chat

### Modal Footer (always visible)
Two buttons:
- "הצע טרמפ" (green) — opens form to post a new ride offer
- "אני מחפש טרמפ" (blue) — marks user as looking for a ride + sends notification to them when new ride is posted

---

## Guides Directory — New Feature

### Location
Third tab in the search/discovery screen, alongside "טיולים מודרכים" and "עצמאיים".
Tab label: "מדריכים"

### Guide Card (in the directory list)
Each card shows:
- Profile photo (or initials avatar if none)
- Name
- Specialty/region (e.g. "מומחה נגב ומדבר")
- Star rating + number of reviews
- Number of active upcoming trips
- Clicking the card → goes to the guide's full profile page

### Filters
- Filter by region (same regions as trip search)
- Filter by specialty/tag (e.g. geology, archaeology, birdwatching, desert, etc.)
- Filters apply instantly, no "show results" button

### Guide Profile Page (already exists via trip page link — no change needed)
- Full profile: photo, bio, rating, all upcoming trips
- Already accessible by tapping a guide's name on any trip page

---

## Bug Fixes & Feature Additions — Round 4

### Notifications — Deep Links
- Every notification must be tappable and lead directly to the relevant content. Example: "המדריך ענה לשאלתך" → taps directly to that Q&A answer on the trip page. No notification should be a dead end.

### Coupon/Comp Code — Apply After Registration
- A hiker who already completed registration and payment should be able to apply a coupon code retroactively. Add an "הזן קוד הנחה" field in the trip detail page (post-registration view) or in "My Trips" for that specific trip. If valid, apply a partial refund via Stripe.

### Registrant List — Visible to Fellow Registrants
- A hiker who is registered or interested in a trip can see a list of other registrants (not just the count).
- **Privacy choice at registration:** During registration flow, hiker chooses: "הירשם גלוי" (name visible to other registrants) or "הירשם אנונימי" (shows as "משתתף אנונימי" in the list).
- The list shows: avatar/initials + name (or "אנונימי") + registration date.
- Waitlist members are shown separately.

### Post-Registration Trip Card — Fix Button States
- After registering for a trip, the "להרשמה" and "מתעניין" buttons must be hidden/disabled entirely.
- Replace with: "רשום לטיול ✓" status label + "בטל הרשמה" button always visible alongside it.
- "בטל הרשמה" must be accessible at all times from the trip card and trip detail page — not buried.

### Search — Separate Quick Filter Chips
Two separate quick filter chips in the guided trips search list:
- "הטיולים שלי" — shows trips the hiker is registered for OR interested in
- "מועדפים" — shows trips the hiker has hearted (favorited), regardless of registration status
These are two distinct filters, not combined into one.

### Self-Guided Trips — Separate Quick Filter Chips
Same as guided trips: two separate quick filter chips in the self-guided trips list:
- "הרכישות שלי" — shows only trips the hiker has purchased
- "מועדפים" — shows trips the hiker has hearted, regardless of purchase status

### Self-Guided Trip Card — Access Window Indicator (Post-Purchase)
On a purchased self-guided trip card, show the remaining access time prominently:
- "זמין עוד X ימים" — green if plenty of time (>7 days)
- "זמין עוד X ימים" — amber/warning if expiring soon (2-7 days)  
- "פג תוקף בעוד יומיים" — red if <2 days remaining
- "פג תוקף" — grey/muted if already expired
This replaces the trip date field (which is irrelevant for self-guided trips).

### Search — Autocomplete (Decision Changed)
- Previous decision (no autocomplete) is overridden.
- Search field now shows live autocomplete suggestions as the user types.
- Suggestions come from real data: trip names, guide names, and regions that exist in the system.
- Selecting a suggestion executes the search immediately.

---

## Updates — Search Flow & Notifications & Participant Cards

### Search Intent Flow — Simplified
- Remove "שנה מה אני מחפש" button entirely — no value.
- Merge options 1 and 2 into one: "אני יודע מה אני מחפש" → opens search with filters prominent.
- Option 3 "מה יש בקרוב?" → list sorted chronologically from today forward, no other filters pre-applied.
- Option 4 "הפתיעו אותי" → must actually work: show trips based on user's saved preferences (region, difficulty). Fix the current broken state.

### Notifications — Mark as Read Without Entering
- Add a "mark as read" action on each notification (e.g. swipe or long-press or a small checkmark button) that marks it read without navigating to the linked content.
- Marking as read does NOT delete the notification.

### Participant Cards — What to Show
Each participant card in the registrant list modal shows:
- Profile photo (or initials avatar if none)
- Gender icon next to the name (♂/♀ or equivalent Lucide icon)
- Name (or "אנונימי" if registered anonymously)
- Personal slogan/tagline — a short free-text field the user writes once in their profile settings, visible to fellow registrants. User can update it anytime.

### User Profile — New Field
- Add "סלוגן אישי" (personal tagline) field to the profile settings page. Short free text, optional. Displayed on participant cards when the user appears in a trip's registrant list.

---

## Search Filters — Updates

### Date filter
- Change from "מתאריך" (single date) to a date RANGE picker (from date → to date).
- User selects a start and end date, results show trips departing within that range.

### Price filter
- Remove entirely. No price filter.

### Age filter ("מתאים לגיל")
- Remove entirely. Current implementation is confusing and low value.

---

## Trip Manager (מנהל טיול) — New Role

### Overview
A third distinct platform role (separate from hiker and guide). A "remote supervisor" of trips — read-only access to everything the guide sees, but cannot change anything.

### Registration
- At signup, users choose one of three roles: מטייל / מדריך / מנהל טיול
- A מנהל טיול cannot also be a guide or hiker (separate role)

### How they're assigned to a trip
- The guide manually assigns a מנהל טיול to their trip (same searchable autocomplete as adding a second guide, but searches ONLY from users registered as מנהל טיול)
- Assignment is immediate, no confirmation required from the מנהל טיול

### What מנהל טיול can see (read-only)
- Everything the guide sees: registrant list, payment status, dynamic field answers, waitlist, Q&A, Broadcast history, trip details
- Cannot modify anything
- Cannot send Broadcast (blocked in Phase 1)
- Cannot cancel or postpone the trip
- Cannot add/remove other team members

### Rename throughout system
- All references to "co-manager" / "מנהל משנה" in the codebase and UI must be renamed to "מנהל טיול"
- This is a breaking rename — update database schema, API routes, UI labels, and CLAUDE.md references accordingly

---

## Guide Dashboard — Trip Card Fix
The guide dashboard trip cards are currently broken. Fix:
1. Trip photos not loading — fix image URLs
2. Action buttons (הודעות, שאלות, נרשמים, ליומן, דחה, הודעה לקבוצה) must NOT appear on the dashboard card. Card shows only: trip name, date, capacity, status tags. All actions go inside the trip management page.
3. Status tags (קשה, ציבורי, פתוח) overlapping the trip name — fix positioning.

---

## Next Actions for Claude Code

Read CLAUDE.md from start to finish. Then implement ALL of the following in order:

### Priority 1 — Critical fixes
1. Rename all "co-manager/מנהל משנה" → "מנהל טיול" throughout codebase, DB, API, UI
2. Add "מנהל טיול" as third signup role
3. Guide assigns מנהל טיול via autocomplete (searches only מנהל טיול users)
4. מנהל טיול dashboard: read-only view of everything guide sees
5. Fix guide dashboard trip cards (images, buttons, tag overlap)

### Priority 2 — From bugfix_round3.txt (items not yet done)
6. Post-registration banner: "בטל הרשמה" in green top bar, remove all buttons below
7. Registrant list modal (clickable, opens like rideshare modal)
8. Self-guided filter chips: "הרכישות שלי" + "מועדפים"
9. Self-guided access window indicator (green/amber/red)
10. Guides directory multi-select filters
11. Autocomplete in search field
12. Search intent flow — simplify (merge 1+2, fix option 4)
13. Remove calendar toggle from guided trips, keep only list
14. Remove calendar from self-guided entirely
15. Date filter → range picker
16. Remove price filter and age filter
17. Notifications — mark as read without navigating
18. Trip photos — high quality Unsplash with specific IDs
19. Photo rotation — staggered fade

Commit and push after each priority group. Send ntfy notification when done or waiting for input.

---

## Search — Quick Filter Chips Behavior
When a user activates a quick filter chip ("הטיולים שלי", "מועדפים", "הרכישות שלי"):
- All other active filters are automatically cleared/reset
- The filter panel collapses or hides (no longer relevant in this context)
- Only the selected chip remains active
- Deactivating the chip restores the normal search view with filters available again

---

## Registrant Count & List — Display Fix

### Trip Card
- Remove the separate "X משתתפים" badge from the stats row — it duplicates information already shown in the capacity line below.
- The capacity line "X מתוך Y רשומים" should include a clickable link "לרשימת המשתתפים" that opens the registrant list modal.

### Registrant List Modal — Full Participant Card
Each participant card must show:
- Profile photo (or initials avatar if none)
- Gender icon next to name (Lucide icon ♂/♀)
- Name (or "משתתף אנונימי" if registered anonymously)
- Personal slogan ("סלוגן אישי") if filled in profile
- Waitlist members shown separately below a divider

---

## Waitlist — Status & Button Fix

### "הצטרף לרשימת המתנה" Button
- Must look clearly clickable — styled as a button (background, border, or distinct style), not plain text.

### Status After Joining Waitlist
- Show: "ממתין למקום — מיקום X בתור"
- Replace the registration button area with this status label + "בטל המתנה" button (same pattern as "בטל הרשמה" for registered hikers)
- Color: amber/warning tone to distinguish from the green "רשום לטיול ✓" state

---

## Search Filters — Additional Removal
- Remove "רק מדריכים שאני עוקב אחריהם" filter — unnecessary.

---

## Hebrew Calendar Support

### Guide (input side)
- Guide always enters dates in Gregorian calendar only — no change to the creation flow.

### Hiker (display side)
- User preference in profile settings: "לוח שנה לועזי" or "לוח שנה עברי"
- All dates displayed throughout the app (trip cards, trip detail page, registration confirmation, My Trips, notifications) automatically convert to the chosen calendar.
- Conversion is automatic — no manual input needed from guide or hiker.
- Default: Gregorian.

### Implementation
- Use a Hebrew date conversion library (e.g. `@hebcal/core` or similar) to convert Gregorian → Hebrew dates automatically.
- Hebrew date format: "י״ד תמוז תשפ״ה" or shorter "י״ד תמוז" depending on context.

---

## Hebrew Calendar Toggle — Placement

### Two locations:
1. **Profile settings** — permanent preference (Gregorian / Hebrew)
2. **Date filter panel** — quick toggle next to "נקה" button: small "ע׳ / ל׳" toggle that switches all displayed dates instantly without going to settings

### Date filter panel layout:
```
סינון לפי תאריך 📅        נקה  |  ע׳/ל׳
```

### Behavior:
- Toggle in date filter panel changes display immediately for that session
- If user has a saved preference in profile, that's the default
- Toggling in the panel does NOT permanently change the profile preference — it's a session-level override

---

## Hebrew Calendar Toggle — Full Spec (Updated)

### Two locations:
1. **Profile settings** — permanent preference: "לוח שנה לועזי" (default) or "לוח שנה עברי"
2. **Date filter panel** — quick toggle "ע׳/ל׳" next to "נקה" button. Session-level only, does NOT save to profile.

### Date filter panel layout:
`סינון לפי תאריך 📅` — — — `נקה | ע׳ ל׳`

### Display behavior:
- All dates throughout the app convert automatically based on preference: trip cards, trip detail page, registration confirmation, My Trips, notifications, guide dashboard
- Guide always inputs dates in Gregorian only — conversion is display-side only
- Hebrew date format: "י״ד תמוז תשפ״ה" (full) or "י״ד תמוז" (short, for cards)

### Date picker (borer):
- The date picker UI itself stays in Gregorian (easier UX, avoids complexity)
- Only the displayed result after selection converts to Hebrew if preference is set

### Implementation:
- Use `@hebcal/core` npm package for Gregorian → Hebrew conversion
- Add "לוח שנה" field to user profile schema (enum: 'gregorian' | 'hebrew', default: 'gregorian')

---

## Google OAuth — Fix Login Flow
- After Google authentication completes, the app currently ignores the result and continues with the previous session.
- Fix: Google sign-in must create or log into the correct account and redirect the user to the app as that Google user.
- Ensure NextAuth Google provider is correctly configured and the session is updated after OAuth callback.

---

## Bug Fixes & Features — Round 5

### 1. Slogan & Branding
- Replace "TrailHub" with the new slogan throughout the app
- Slogan: "בשבילי נברא העולם — דרך. אחרת. לטייל"
- The word "שביל" inside "בשבילי" is bold and in green (#3d8f5f), same font size as the rest
- Dark/light mode toggle moves from avatar dropdown to the top bar near the logo

### 2. Dark Mode Toggle Location
- Remove dark/light toggle from avatar dropdown menu
- Add it to the top navigation bar near the logo/branding area (sun/moon icon)

### 3. Hebrew Calendar — Fix
- When "ע" is selected in the date filter panel toggle:
  - Calendar grid shows Hebrew date numbers (e.g. "ט״ו", "ט״ז")
  - Month header shows Hebrew month name (e.g. "תמוז תשפ״ו")
  - Use `@hebcal/core` for conversion

### 4. Guide Default Mode on Login
- When a guide logs in, default landing is the guide dashboard (not hiker view)
- When a מטייל logs in, default is hiker home/search
- When a מנהל טיול logs in, default is trip manager dashboard

### 5. Trip Status Order
- Correct order (right to left): טיוטא → פרסום פרטי → ציבורי
- Apply everywhere: status tabs, toggle, trip creation wizard

### 6. Registrant List — Guide Dashboard
- In the guide's trip management page, clicking "נרשמים" opens a modal (same pattern as hiker-facing modal)
- Header: "משתתפים — [trip name]"
- Each card: profile photo/avatar + gender icon + name (or "אנונימי") + personal slogan
- Waitlist shown separately below divider

### 7. Q&A — Threaded Conversation
- After guide answers a question, hiker can reply in the same thread (not open new question)
- Guide can also continue replying in the same thread
- Show full conversation: question → answer → follow-up → reply etc.
- Visual thread/indent to distinguish replies

### 8. Broadcast — History
- Save every broadcast to DB with: content, timestamp, sender, trip ID
- In guide's trip management page, show "הודעות ששלחתי" section with full history
- Hikers see broadcast in notifications with full content

### 9. Broadcast Notification — Deep Link Fix
- Tapping a broadcast notification must navigate to the trip page and scroll to announcements section
- Currently does nothing — fix deep link

### 10. Notifications — Real-Time
- Notifications must update in real-time without page refresh
- Use Supabase Realtime to subscribe to new notifications for current user
- Update bell badge count and notification list automatically

### 11. Notifications — Deep Links (Full Audit)
Every notification must navigate to exact relevant location:
- "המדריך ענה לשאלתך" → trip page, specific Q&A thread
- "הודעה מהמדריך" → trip page, announcements section
- "נרשמת לטיול בהצלחה" → trip page
- "מקום התפנה ברשימת המתנה" → trip page, registration section
- "טרמפ חדש נוסף לטיול" → rideshare modal for that trip
- "מישהו תפס מקום בטרמפ שלך" → rideshare modal, your ride entry
- "הטרמפ שלך בוטל" → rideshare modal for that trip
- "שאלה חדשה בטיול שלך" (guide) → guide dashboard, Q&A section
- "נרשם משתתף חדש" (guide) → guide dashboard, registrant list
Audit ALL notification creation points and ensure link field is populated correctly.

### 12. Ride Cancellation — Notification Bug
- When a ride is cancelled, notification is sent once per trip registrant instead of once per person who claimed a spot on that specific ride
- Fix: send notification ONLY to people who had claimed a spot on the cancelled ride

### 13. Own Ride Highlight in Rideshare Modal
- In rideshare modal, highlight the current user's own ride offer with "הטרמפ שלי" badge or distinct styling
- Same for seekers tab if user marked themselves as seeking

### 14. Coupon — Show Updated Price
- After valid coupon code is entered and applied:
  - Show original price with strikethrough
  - Show new discounted price in green
  - Show discount amount/percentage
- If code invalid: show "קוד לא תקין" error message

---

## Group Registration — Full Spec

### Three registration modes (guide decides per trip):
1. **אדם בודד** — hiker registers only themselves. Default.
2. **כמות בלבד** — hiker enters number of spots (e.g. "3 מקומות"), no details per person. Shows in registrant list as "דני לוי + 2" or "דני לוי (קבוצה של 3)".
3. **פרטים לכל משתתף** — hiker fills details per person: full name, age, gender, fitness level, special needs (optional). OR search for existing platform users by name/email (autocomplete) and add them directly.

### Payment for groups:
- Each participant selects their own price category (adult/child/senior etc.) same as solo registration
- Total calculated per all categories, charged as one payment on one card

### Cancellation:
- Can cancel individual participants from a group, not just the whole group

---

## Guide Mode — Bug Fixes & Features Round 6

### 1. Free Self-Guided Trips
- If guide sets price = 0, automatically tag the trip as "חינם" with a visual badge
- Add "חינם בלבד" filter chip in self-guided trips search

### 2. Registrant List — Guide Dashboard (THIRD TIME — must be fixed)
- Must behave EXACTLY like the hiker-facing registrant modal
- Same modal pattern: header "משתתפים — [trip name]", each card shows photo + gender icon + name (or אנונימי) + personal slogan, waitlist below divider
- This has been requested 3 times and not implemented correctly

### 3. PDF Upload per Waypoint — Fix
- After uploading a PDF to a waypoint, show the uploaded file name with a delete button
- Limit: max 2 files per waypoint
- User must be able to see what was uploaded and delete if needed

### 4. PDF Upload at Trip Level — Same Fix
- Same as waypoint: show uploaded files, allow deletion, same UX

### 5. Remove Web Link Field
- Remove "קישור לדף web" field from trip creation — not useful, causes confusion

### 6. Health Declaration — Fix
- Must be an uploadable document (PDF)
- Must be viewable inside the app AND downloadable/openable outside
- Add text field next to it: "אני חותם על כך ש..." that hiker must fill/confirm

### 7. Trip Team Search — Fix (THIRD TIME)
- Search for second guide and מנהל טיול via autocomplete is broken
- Must search only among users registered as מדריך (for second guide) or מנהל טיול (for trip manager)
- This has been requested multiple times — must be fixed

### 8. Discount Group Selection
- After selecting a group for discounted pricing, the list disappears and requires manual re-entry
- Fix: keep the list visible after selection, allow adding multiple groups without list disappearing

### 9. Save Trip at Any Point (Draft Without Required Fields)
- Add "שמור טיוטא" button visible at every step of trip creation wizard
- Saves current state without requiring mandatory fields to be filled
- Also add "בטל טיול" button to cancel/discard at any point

### 10. Waypoint Distance Validation
- GPX file is mandatory for guided/self-guided trips
- When guide places a waypoint on the map, validate that it is within 10 meters of the GPX route
- If waypoint is more than 10 meters from route: show warning "הנקודה רחוקה מהמסלול — האם אתה בטוח?"
- Do not block saving, just warn

---

## Multi-Participant Registration — Full Spec

### Guide setting (per trip):
Guide chooses one of three registration modes when creating the trip:
1. **אדם בודד** — hiker can only register themselves
2. **כמות בלבד** — hiker enters number of spots, no details per person required
3. **פרטים לכל משתתף** — hiker must fill details for each person

### Mode 2 — Registrant list display:
Shows as "דני לוי + 2" or "דני לוי (קבוצה של 3)" — no individual names shown

### Mode 3 — Details per participant:
For each additional participant, hiker fills:
- Full name
- Age
- Gender
- Fitness level
- Special needs (optional)
- OR: search existing platform user by name/email (autocomplete) and add them directly

### Payment:
Each participant selects their own price category (adult/child/senior). Total charged as one payment on one card.

### Cancellation:
Can cancel individual participants from a group without cancelling the whole registration.

---

## Notifications — Full Fix (Round 2)

### Real-time (already requested — verify it works):
Notifications must appear instantly without page refresh using Supabase Realtime.

### Deep links — Full audit (already requested — verify each one):
Every notification must navigate to the EXACT location, not just the trip homepage:
- "המדריך ענה לשאלתך" → scroll to that specific Q&A answer
- "הודעה מהמדריך" → scroll to announcements section
- "טרמפ חדש" → open rideshare modal
- "נרשם משתתף חדש" (guide) → open registrant list modal
- etc. (see full list in Round 5)

---

## Branding — Updated Slogan
Replace "TrailHub" in the top navigation bar with:

**"בשבילי נברא העולם — אנוכי עפר ואפר"**

Styling:
- "בשבילי" — in green (#3d8f5f), bold
- "עפר" — in green (#3d8f5f), bold  
- Rest of text — regular color (white/light on dark background)
- Same font size throughout — no size variation
- "דרך. אחרת. לטייל" — removed from top nav (may appear elsewhere like splash screen)

---

## Branding — Logo/Slogan Visual Design

### Text
"בשבילי נברא העולם — אנוכי עפר ואפר"
- "בשבילי" (כולה, כולל האות ב׳) — ירוק #3d8f5f, bold
- "עפר" — ירוק #3d8f5f, bold
- שאר הטקסט — #f0ede8, font-weight 300
- גודל אחיד לכל הטקסט

### אלמנט ויזואלי — שביל מאויר
מתחת לטקסט: שביל מאויר בסגנון סקיצי/ידני:
- שני קווים מקבילים מפותלים (לא ישרים) בירוק #3d8f5f
- אלמנטים לאורך השביל: עץ מאויר, סלע, באר מים — בסגנון עדין וסכמטי
- נקודת התחלה ונקודת סיום מסומנות
- רקע שחור #0a0a0a

### יישום
- להטמיע כ-SVG inline בתוך הקומפוננטה
- להופיע בדף הבית (Hero) ובמסך splash
- בנאב העליון — הטקסט בלבד ללא השביל (אין מקום)

---

## Self-Guided Trips — Audio per Waypoint

### Guide side (creation):
- At each waypoint, guide can upload an audio file (MP3/M4A/WAV) — their own voice recording
- Show uploaded file name + duration + delete button
- Max 1 audio file per waypoint
- Allow re-upload (replaces existing)

### Hiker side (playback):
- At each waypoint, if audio exists: show a play button prominently
- Tapping play: plays the guide's voice recording through the phone speaker
- Show progress bar + pause/resume controls
- Audio plays inline in the app — no need to open external player
- If user is in TTS mode (text-to-speech), audio recording takes priority over TTS for that waypoint

---

## Features — Round 7

### 1. Audio Files for Self-Guided Trips — Seed Data
Create several self-guided trips in the DB that have audio files at some of their waypoints (use placeholder/sample MP3 URLs from a public source). At least 3 trips with 3-4 waypoints each having audio.

### 2. Slogan Placement
- **Before login (splash/landing page):** Full slogan with trail illustration: "בשבילי נברא העולם — אנוכי עפר ואפר"
- **After login (landing/home page):** Same full slogan
- **Main trip search screen:** Only the word "בִּשְׁבִילִי" with full Hebrew nikud (vocalization). Nothing else from the slogan.

### 3. Mode Indicator — Guide vs Hiker
- The UI for switching between guide mode and hiker mode must look identical in both directions (currently looks different)
- Add a clear visual indicator so the guide always knows which mode they're in — e.g. a subtle colored badge or label in the top bar showing "מצב מדריך" or "מצב מטייל"

### 4. Company Logo per Guide / Trip Manager
- Guide can upload their company logo in profile settings
- Trip Manager (מנהל טיול) can upload their organization logo in profile settings
- Logo appears on all trip cards belonging to that guide
- If a trip has both a guide logo AND a trip manager logo — trip manager logo takes priority
- If guide has logo but trip manager has none — show guide logo
- If neither has logo — show nothing
- Logo displayed as small icon in the trip card strip (bottom-left or top-left corner)

---

## Self-Guided Trip — Map Waypoint UX Fixes

### 1. First waypoint placement
When the guide opens the map to add waypoints, the map must center on the GPX route (if uploaded) or the trip's region — NOT on a random/default location.

### 2. Remove "הוסף תחנה" button
Remove the "הוסף תחנה" button entirely. Tapping the map already creates a waypoint — this is sufficient and the button is redundant.

### 3. Map mode indicator + toggle
Add a clear visual toggle on the map with two modes:
- **מצב צפייה** (view/static) — tapping the map pans/zooms only, no new waypoints created
- **מצב עריכה** (edit) — tapping the map creates a new waypoint

Show clearly which mode is active (e.g. colored toggle button at top of map). Default: view mode. Guide switches to edit mode intentionally to add waypoints.

---

## Reviews — Unlock After Trip Ends

### Guide adds end time to trip
- Add "שעת סיום משוערת" field to trip creation (time field, required)
- This is in addition to the existing departure time

### Review unlock logic
- Reviews are locked until 1 hour before the trip's estimated end time
- If a hiker tries to write a review before that: show message "ניתן לכתוב ביקורת החל משעה לפני סיום הטיול"
- After unlock time: review button becomes active
- The unlock is per-trip based on date + end time

### Display
- If review is locked, show the review button as disabled/greyed out with the explanation message on hover/tap

---

## UI & UX Fixes — Round 8

### 1. Slogan text alignment
Two-line slogan must be right-aligned (RTL). Second line "אנוכי עפר ואפר" must end where the first line ends — aligned to the right edge, not centered.

### 2. My Trips — dual date display
In registered trip cards (My Trips), always show BOTH dates:
- If user preference is Gregorian: "10 יולי (כ׳ תמוז)"
- If user preference is Hebrew: "כ׳ תמוז (10 יולי)"
Apply only to My Trips cards, not general search results.

### 3. Bottom navigation — always show labels
Show text labels below ALL bottom nav icons at all times, not just the active tab. Active tab remains highlighted in green.

### 4. "שאלה למדריך" button — scroll to Q&A
Clicking "שאלה למדריך" must smooth-scroll to the Q&A section on the trip page (anchor `id="qa-section"`), not to the top of the page.

### 5. Company logo — size and position
Logo on trip cards: place at bottom-left corner of the trip image, slightly larger than current size. Should sit on the gradient overlay.

### 6. Rideshare seekers indicator — guide dashboard
On each trip card in guide dashboard: show "🙋 X מחפשי טרמפ" only when there are unmatched seekers. Informational only, no action required. Show nothing if no unmatched seekers.

### 7. Trail SVG — full width
The trail illustration SVG on splash/landing page must span full screen width with no containing black box. Remove the frame, set SVG width to 100%.

### 8. Map mode toggle — self-guided waypoints
- Remove "הוסף תחנה" button
- Add view/edit mode toggle on map
- Default: view mode. Guide switches to edit mode to place waypoints.
- First waypoint must center on GPX route, not random location.

### 9. Audio files for waypoints — seed data
Create 3+ self-guided trips in DB with audio files at some waypoints (use public sample MP3 URLs).

### 10. Daily summary email
Send daily email at 08:00 Israel time via Vercel Cron + Resend:
- New registrations in last 24h (names + emails)
- Logins in last 24h
- Total users to date
- Trips viewed
- New trip registrations

### 11. New user notification via ntfy
Every time a new user registers (email or Google), send ntfy notification with: name, email, method, timestamp.

---

## "My Trips" Tabs — Restructure

### New tab order:
1. **רשומים** — trips the hiker is registered for, not yet departed
2. **בהמתנה** — trips where hiker is on the waitlist
3. **מתעניין** — trips hiker marked as interested
4. **עצמאיים** — purchased self-guided trips (active + expired)
5. **היסטוריה** — past guided trips (departed)

### Self-guided (עצמאיים) tab:
- Active purchases shown normally with access window indicator
- Expired purchases shown at bottom of the same tab, greyed out with "פג תוקף — רכוש מחדש" button
- Do NOT hide expired trips — show them as a re-purchase opportunity

### היסטוריה tab:
- Shows guided trips that have passed their end time
- Each card has "כתוב ביקורת" button (or "ערוך ביקורת" if already reviewed)
- Trips the hiker cancelled do NOT appear here

### Reviews — identification:
- Each review is stored with the user ID in DB
- In the trip's review section: hiker's own review appears first with "הביקורת שלי" label + edit button
- In היסטוריה tab: button shows "כתוב ביקורת" or "ערוך ביקורת" based on whether they've reviewed

---

## GPX Route Editing & Waypoint Safety

### Waypoint map gating (creation/edit)
- The waypoint map section is disabled/greyed until a GPX file is uploaded, showing: "יש להעלות קובץ GPX תחילה כדי להוסיף נקודות עניין". Once a GPX is uploaded the section becomes active.
- Deleting OR replacing the GPX while waypoints exist prompts: "מחיקת קובץ ה-GPX תמחק את כל נקודות העניין שהגדרת. האם להמשיך?" — confirm deletes all waypoints (and applies the new/empty GPX); cancel keeps the existing GPX and waypoints unchanged.

### GPX edit after publish
- The GPX may be edited/replaced at any time, even after publish and with registrants.
- If the trip has registered hikers, saving a changed route first warns: "שינוי המסלול ישלח הודעה אוטומטית לכל הנרשמים. האם להמשיך?". On confirm, the new GPX is saved AND an automatic broadcast + notification is sent to all registrants: "המדריך עדכן את מסלול הטיול — [trip name]. מומלץ לבדוק את המסלול המעודכן." (logged in broadcast history).
- If the trip has no registrants, the GPX is replaced silently with no notification.
- Elevation stats and the map/waypoint positions are derived from the GPX on the fly, so they update automatically after a GPX change.

---

## Broadcast (הודעות קבוצתיות) — Modal
- Guide dashboard trip cards have a single "הודעות קבוצתיות" button (no separate "דחה" / "הודעה לקבוצה" buttons) opening a modal.
- Modal lists past broadcasts newest-first, with a "+ הודעה חדשה" composer.
- The composer has an optional "הטיול בוטל" checkbox that requires a reason; cancellation broadcasts are shown in red in the history list.

---

## Search Filters — Persistence & Presets
- Active filters persist permanently (localStorage) — never reset on refresh or navigation.
- Profile preferences are NOT auto-applied as filters.
- The filter panel has an "אפס לפי העדפותי" button that loads the user's saved profile preferences (regions/difficulties) into the active filters — the only connection between profile prefs and active filters.

---

## Trip Gender Restriction
- Optional "מיועד ל" field at trip creation (Step 3) — guided trips only, NOT self-guided: כולם (default) / גברים בלבד / נשים בלבד.
- Display only — NOT technically enforced at registration.
- Shown as a badge on trip cards and the trip detail page.
- Search has a "מיועד ל" filter (כולם / גברים / נשים); selecting a gender shows trips for that gender plus open-to-all trips.

## Self-Guided Trip — Before vs After Purchase
- Before purchase: GPX route line on map, NO waypoint markers, content + source materials locked.
- After purchase (within window) / free trips: full owner view — waypoints, content, audio, GPS, TTS.
- After expiry: waypoints visible on the map but content + source materials locked.
- Free trips: full access permanently, no expiry.

## Q&A — Display Logic by Registration Status
- Viewer only (not registered/interested): public questions only, no שלי/אחרים toggle, "שאל שאלה" prompts to register first.
- Registered or interested: full שלי/אחרים toggle, can ask freely (public or private).
- Q&A opens as a modal from the trip-card indicator (no navigation).

## Guides Directory — Follow/Unfollow from Card
- Each guide card shows follow state: "+ עקוב" if not following, "עוקב ✓" if following; toggle directly from the card.
