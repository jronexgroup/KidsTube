# KidsTube --- Product Requirements Document (PRD)

**Document status:** Draft v1.0\
**Product type:** Modification/fork of the existing NouTube open-source
application\
**Primary platform for MVP:** Android (confirm against the chosen
NouTube checkout)\
**Primary language:** Bengali\
**Secondary language:** English\
**Content source:** Parent-approved YouTube videos and channels\
**Project name:** KidsTube (working name; final branding is a separate
decision)

------------------------------------------------------------------------

## 1. Executive Summary

KidsTube is a child-focused, Bengali-first version of the existing
NouTube application. It is **not a new video platform and not a new app
built from scratch**. The project will fork/modify NouTube and retain
its existing video-playing experience where technically possible, while
restricting the child-facing experience to a curated list of educational
videos and channels.

The central rule is **deny by default; allow only approved content**. A
child should not be able to browse an unrestricted YouTube feed, Shorts
feed, influencer vlogs, random funny videos, or other unreviewed
material. The home screen and any available search/browse paths must
lead only to the approved learning library.

The learning library prioritizes: 1. Bengali language and literacy. 2.
English language basics. 3. Numbers, counting, and early mathematics. 4.
Rhymes and songs that are educational and age-appropriate. 5. Shapes,
colours, animals, plants, body parts, everyday knowledge, habits,
safety, and kindness. 6. Islamic learning in Bengali, reviewed for
accuracy and suitability for children.

A preliminary list of candidate videos and channels was supplied in
`kidstube-list`. These are **candidates, not automatically approved
content**. Each video and channel must be reviewed before it appears in
the child-facing library.

## 2. Problem Statement

Ordinary YouTube discovery surfaces can expose a young child to Shorts,
influencer videos, random entertainment, and recommendations that are
not aligned with the parent's learning goals. Hiding Shorts alone does
not solve this problem: videos can still be reached through search,
channel pages, recommendations, direct links, history, or other
navigation paths.

KidsTube should make the approved learning library the child's normal
and, where technically enforceable, only route to video playback.

## 3. Product Vision and Principles

### Vision

A child opens KidsTube and sees only videos that a parent or trusted
adult has reviewed and approved for learning.

### Principles

-   **Bengali first:** Bengali learning and navigation receive the
    highest priority.
-   **English second:** English is available as a secondary learning
    track.
-   **Islamic Bengali content included:** Islamic learning is a
    first-class category, not an afterthought.
-   **Allowlist, not keyword-only filtering:** An approved list is the
    source of truth. Titles and thumbnails alone are not reliable safety
    controls.
-   **No endless feed:** No Shorts feed, autoplay rabbit hole, or
    unbounded recommendations.
-   **Adult-controlled:** A child cannot approve content or change
    protection settings.
-   **Privacy by design:** Collect as little information as possible; no
    child profile should require a Google account.
-   **Reuse, don't rewrite:** Prefer modifying NouTube's existing code
    and player integration over building a new player or platform.
-   **Honest guarantees:** Because NouTube relies on YouTube services
    and a WebView, the project must test every access path. Do not claim
    that all unwanted content is blocked until it is demonstrated by
    tests.

## 4. Goals

1.  Fork and modify the existing NouTube project.
2.  Rebrand the child-facing app as KidsTube.
3.  Display a curated, parent-approved educational video library.
4.  Prioritize Bengali learning, then English learning, and include
    Islamic Bengali education.
5.  Block or remove Shorts entry points and all unapproved feeds and
    recommendations.
6.  Restrict search results and navigation to approved content, or
    disable child-facing search in the MVP.
7.  Provide a parent-only workflow to add, review, approve, disable, and
    remove channels/videos.
8.  Avoid third-party advertising in KidsTube's own interface and verify
    the behaviour of the underlying video player.
9.  Test the app on the intended Android device and document known
    limitations.
10. Keep changes maintainable so that upstream NouTube updates can be
    reviewed and merged deliberately.

## 5. Non-Goals

The MVP will **not**: - Build a new video-hosting service or upload
platform. - Create original educational videos. - Replace YouTube as a
service. - Guarantee that every video on an approved channel is safe;
approval is per-video unless an adult explicitly chooses channel-wide
approval. - Provide unrestricted YouTube search, recommendations,
comments, live chat, or social features to children. - Collect detailed
child behaviour analytics. - Guarantee ad-free playback solely because
NouTube currently advertises ad-blocking; this must be retested after
modification. - Claim that web-based filtering is a tamper-proof
parental-control system. Device-level controls may still be needed.

## 6. Target Users

### Child viewer

A young Bengali-speaking child who needs a simple, visual way to watch
pre-approved learning videos.

### Parent / guardian

An adult who chooses what the child may watch, reviews content, and
controls settings.

### Content curator

A trusted adult who researches potential channels and videos, records
language/category/age suitability, and recommends items for parent
approval. The curator cannot bypass final approval unless explicitly
granted that role.

### Maintainer / developer

The person modifying NouTube, maintaining the allowlist logic, testing
regressions, and managing upstream updates.

**Age range:** Not finalized. The initial release should be designed for
early-childhood and early-primary learning, but the exact age band must
be confirmed before content approval. Content must be labelled with a
suggested age/learning level.

## 7. MVP Scope

### Included

-   KidsTube branding and Bengali-first navigation.
-   Home screen with curated categories.
-   A local or otherwise controlled allowlist of approved video IDs and
    optional approved channels.
-   Video detail/playback launched only from an approved item.
-   Parent-only settings and approval workflow.
-   Shorts entry-point removal and access-path blocking.
-   Unapproved search/feed/recommendation blocking or removal.
-   Basic language/category/age-level metadata.
-   A small, reviewed seed library based on the supplied
    `kidstube-list`.
-   Tests for allowed and denied URLs and navigation routes.
-   Documentation of build, test, and update steps.

### Deferred

-   Cloud sync across devices.
-   Multiple guardian accounts and remote administration.
-   Personalised recommendations.
-   Child progress tracking and gamification.
-   Download/offline mode unless already present and shown to be
    appropriate and legally/technically supportable.
-   Content transcripts, quizzes, and original lessons.
-   Advanced filtering by AI.
-   Full desktop/iOS support unless selected as a separate target after
    Android MVP validation.

## 8. Information Architecture

### Child-facing home

Recommended sections, in this order:

1.  **বাংলা শিখি** --- Bengali alphabet, letter sounds, words, reading,
    simple sentences.
2.  **বাংলা ছড়া** --- Bengali rhymes and poems selected for learning and
    age suitability.
3.  **বাংলা সংখ্যা ও গণিত** --- Bengali numerals, counting, number
    recognition, basic maths.
4.  **English শেখা** --- ABCD, phonics, vocabulary, spelling, simple
    sentences.
5.  **English Rhymes** --- Nursery rhymes and songs.
6.  **রং ও আকার** --- Colours and shapes.
7.  **চারপাশের জগৎ** --- Animals, birds, fruits, vegetables, body parts,
    transport, nature, family, and everyday objects.
8.  **ভালো অভ্যাস ও নিরাপত্তা** --- Hygiene, kindness, safety, patience,
    and everyday habits.
9.  **ইসলামিক শিক্ষা** --- Bengali Islamic learning, with subcategories
    described below.

The exact home-screen labels may be refined, but Bengali must remain the
primary language. English labels can appear where they help learning.

### Islamic Bengali learning subcategories

-   Arabic letters and beginner Quran reading.
-   Noorani Qaida and age-appropriate recitation lessons.
-   Short surahs, pronunciation, and simple Bengali meanings.
-   Daily duas with Bengali explanations.
-   Stories of the Prophets, based on reliable sources and presented in
    a child-appropriate way.
-   Basic Islamic practices: prayer, Ramadan, fasting, Eid, and the Five
    Pillars.
-   Adab and akhlaq: honesty, kindness, cleanliness, patience, respect
    for parents, and care for others.
-   Child-appropriate Bengali nasheeds, if reviewed and approved.

Religious content must be checked for source reliability, respectful
presentation, age suitability, and absence of hateful or sectarian
messaging. Do not present disputed claims as settled facts without
appropriate review.

## 9. Functional Requirements

Priority key: **P0** = required for MVP; **P1** = important next; **P2**
= later.

### FR-01 --- Approved content is the source of truth (P0)

-   The app must maintain an allowlist of approved video IDs.
-   A video must not appear in the child interface or start playback
    unless it is approved.
-   Channel approval may be supported, but it must be explicit and
    clearly distinguished from per-video approval.
-   Default state for new or unknown content is **blocked**.
-   Removing approval must make the item unavailable on the next
    relevant library refresh and must prevent direct playback through
    the app's controlled routes.

**Acceptance criteria** - A video ID not present in the allowlist is not
shown in home, search, history, related videos, or channel browsing. -
Opening an unapproved direct URL inside the app is blocked or redirected
to a safe KidsTube screen. - An approved video can be opened and played
through the normal player path, subject to YouTube availability.

### FR-02 --- Remove Shorts (P0)

-   Remove Shorts tabs, shelves, buttons, cards, and navigation entry
    points from the child experience.
-   Block Shorts URLs and known Shorts routes from being opened through
    in-app navigation.
-   Ensure that Shorts cannot re-enter through search results, channel
    pages, history, recommendations, or external-link handling.

**Acceptance criteria** - No Shorts entry point appears in the child
UI. - A Shorts URL tested through each supported route is denied. -
Tests are repeated after upstream NouTube changes because YouTube's
interface may change.

### FR-03 --- Block unapproved discovery surfaces (P0)

-   Do not expose unrestricted YouTube home feeds, trending, explore,
    live, music, comments, or recommendations to the child unless a
    specific surface is redesigned to show allowlisted items only.
-   If a safe search cannot be enforced reliably, disable child-facing
    search in the MVP.
-   Channel pages must not expose every upload automatically. They must
    show only approved videos.
-   Autoplay to an unapproved next video must be prevented; preferably
    disable autoplay entirely in the MVP.

### FR-04 --- Curated category home (P0)

-   Show only categories with at least one approved item.
-   Each item displays title, thumbnail, language, category, and
    suggested age/level where available.
-   The interface must not depend on YouTube's personalised
    recommendation system.
-   The home page should be simple, readable, and usable by a young
    child.

### FR-05 --- Parent-only mode (P0)

-   Provide a parent gate before changing the allowlist, app
    restrictions, or content settings.
-   Parent settings should not be accessible through an obvious
    child-facing button without a gate.
-   Do not rely only on a secret gesture as the sole security control.
-   Where feasible, use a parent PIN/passcode and explain that
    device-level restrictions are still recommended.
-   Never hard-code a default PIN in the source or ship with a publicly
    documented PIN.

### FR-06 --- Content management (P0)

Parents/curators can: - Add a candidate video or channel. - Review
metadata and preview the candidate in a protected review flow. -
Approve, reject, disable, or remove an item. - Assign language,
category, age/learning level, and review status. - Add a short reason or
reviewer note. - See when an item was last reviewed.

For the first MVP, content data may be stored locally in a simple
versioned JSON file or equivalent structure, provided the format is
validated and easy to maintain. The final storage choice must match the
existing project architecture.

### FR-07 --- Language priority (P0)

-   Bengali is the default UI language.
-   Bengali categories appear before English categories.
-   English learning remains available as a distinct secondary section.
-   Content metadata supports Bengali, English, and mixed-language
    entries.

### FR-08 --- Video playback (P0)

-   Reuse NouTube's existing player integration where possible.
-   Preserve essential playback controls such as play/pause, seeking,
    volume, and captions where available.
-   Remove or disable navigation paths from the player to unapproved
    videos, Shorts, external pages, and unrestricted recommendations.
-   Handle removed, private, region-restricted, or unavailable videos
    with a simple safe error screen.
-   Test the actual playback and navigation behaviour rather than
    assuming DOM filtering is sufficient.

### FR-09 --- Ads and tracking (P0)

-   Keep KidsTube's own interface free of third-party advertising and
    promotional placements.
-   Verify whether NouTube's existing ad-blocking behaviour still works
    after changes and on the tested version.
-   Do not promise that all YouTube ads or sponsored segments are
    blocked until verified.
-   Do not add analytics SDKs, ad SDKs, or child profiling to the MVP.
-   Do not collect personal details from the child.

### FR-10 --- Safe navigation and external links (P0)

-   Links from descriptions, comments, channel pages, or other content
    must not open unrestricted browsing in the child session.
-   External links should be blocked in child mode or require parent
    approval.
-   Back navigation must not return the child to an unrestricted YouTube
    page.
-   App opening from a shared URL must apply the allowlist check before
    playback.

### FR-11 --- Library reliability (P1)

-   Validate content records at startup.
-   Handle malformed or missing records safely by hiding/blocking the
    affected item.
-   Provide a way for the parent to export/backup the allowlist.
-   Keep a human-readable source file for the curated seed list.

### FR-12 --- Accessibility and usability (P1)

-   Large touch targets and readable Bengali fonts.
-   Clear category labels and consistent icons.
-   Avoid noisy animations, autoplay, and attention-grabbing endless
    scrolling.
-   Support device text scaling where feasible.
-   Provide understandable unavailable-video messages.

## 10. Content Data Model

A content record should contain fields similar to:

``` json
{
  "videoId": "YOUTUBE_VIDEO_ID",
  "title": "Video title reviewed by a parent",
  "url": "https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID",
  "channelName": "Channel name",
  "channelUrl": "https://www.youtube.com/@CHANNEL",
  "language": "bn",
  "category": "bengali_alphabet",
  "ageBand": "TBD",
  "learningGoals": ["letter_recognition", "pronunciation"],
  "approvalStatus": "approved",
  "approvalScope": "video",
  "reviewedByRole": "parent",
  "reviewedAt": "YYYY-MM-DD",
  "reviewNotes": "Why this item is suitable",
  "source": "seed-list-or-parent-added"
}
```

This is an illustrative schema, not a mandate to use JSON if the
existing codebase suggests a better fit. Do not store a child's name,
date of birth, or other personal data unless a future feature genuinely
requires it and has been reviewed.

### Suggested category IDs

-   `bengali_alphabet`
-   `bengali_reading`
-   `bengali_rhymes`
-   `bengali_numbers`
-   `english_alphabet`
-   `english_phonics`
-   `english_rhymes`
-   `english_counting`
-   `shapes_colours`
-   `animals_nature`
-   `everyday_knowledge`
-   `habits_safety`
-   `islamic_quran`
-   `islamic_duas`
-   `islamic_stories`
-   `islamic_adab`
-   `islamic_nasheeds`

Category labels shown to children should be Bengali-first.

## 11. Content Approval Policy

Every candidate begins as **pending**, not approved.

Review checklist: 1. Is the video genuinely educational or suitable for
a specific learning goal? 2. Is the language correctly labelled? 3. Is
the content appropriate for the selected age/learning level? 4. Does the
video contain scary, violent, sexual, hateful, manipulative, or
otherwise unsuitable material? 5. Does it encourage unsafe imitation,
dangerous behaviour, or unhealthy habits? 6. Does it contain excessive
advertising, product promotion, or influencer-style engagement that
conflicts with the product goal? 7. Are religious claims, Quran
recitation, hadith, and stories checked against reliable sources where
applicable? 8. Are title and thumbnail consistent with the actual video?
9. Is the source reliable enough for this topic? 10. Is channel-wide
approval justified, or should approval be limited to individual videos?

A channel's reputation is not enough to approve every upload. The safest
default is video-level approval. If a parent enables channel-wide
approval, the UI must clearly warn that future uploads may also become
accessible and should provide a way to disable the setting.

## 12. Technical Approach and Constraints

### Existing project

The project is based on the official NouTube repository: - Repository:
https://github.com/nonbili/NouTube - Official project information:
https://noutube.org/ - NouTube is described by its project documentation
as a TypeScript project and as wrapping YouTube's mobile website in a
WebView, with injected code for additional behaviour. - The repository
declares the GNU AGPL-3.0 licence.

These details must be rechecked against the exact commit selected for
the fork before implementation. Do not assume that every platform or
version uses identical internals.

### Implementation strategy

1.  Fork the upstream repository and pin the initial base commit.
2.  Build the unmodified app first to establish a working baseline.
3.  Map every entry point that can display or open videos: home, search,
    channel pages, history, bookmarks, direct URLs, player suggestions,
    external links, and Shorts.
4.  Identify the right layer for allowlist enforcement. Prefer a central
    policy function used by all navigation and playback routes, rather
    than scattered UI-only hiding.
5.  Apply UI filtering as a usability layer, but do not rely on CSS
    hiding alone as the safety mechanism.
6.  Intercept navigation and verify the target video ID before loading
    it.
7.  Where YouTube's WebView or injected scripts prevent reliable
    enforcement, disable that surface rather than expose unrestricted
    browsing.
8.  Add unit tests for allowlist decisions and manual integration tests
    for actual WebView behaviour.
9.  Recheck ad behaviour and upstream compatibility.
10. Document build commands from the selected commit's official README
    and scripts; do not copy stale commands without checking the
    repository.

### Important limitation

NouTube depends on YouTube, a third-party service whose pages and
playback behaviour can change. A client-side filter may be bypassed by a
new route or a changed page structure. Therefore: - allowlist checks
must be centralized and tested; - unknown routes must fail closed; - app
restrictions are not a substitute for Android/device-level parental
controls; - the MVP must not be marketed as tamper-proof.

## 13. Privacy and Security Requirements

-   No child account or Google login should be required for the curated
    library.
-   Keep settings and content records local for the MVP unless sync is
    later justified.
-   Do not add analytics, ad tracking, or behavioural profiling.
-   Protect parent-only settings with an appropriate gate.
-   Never place secrets, PINs, or credentials in source code.
-   Avoid logging children's viewing history. If local history is
    retained for usability, make it minimal and clearable by the parent.
-   Fail closed on malformed allowlist data or unrecognized navigation.
-   Test that direct URLs and external intents cannot bypass the content
    policy.
-   Review upstream updates for changed WebView navigation, injected
    scripts, permissions, and data handling.

## 14. Performance and Reliability

-   Startup should not require a network request just to render the
    category screen.
-   The local approved library should load quickly on low- to mid-range
    Android devices.
-   Unavailable or blocked videos should fail gracefully without leaving
    the child in an unrestricted page.
-   Avoid background work not required for playback or library loading.
-   The app should remain usable on a modest device and ordinary mobile
    data connections.

Exact performance budgets should be set after measuring the baseline
build on the target device.

## 15. Success Metrics

MVP acceptance is based on verifiable behaviour, not engagement time.

-   100% of test videos outside the allowlist are denied through all
    tested app entry points.
-   100% of tested Shorts routes are hidden or blocked.
-   100% of child-facing home/library surfaces contain only approved
    content.
-   No unrestricted search, recommendations, or external browsing is
    accessible in child mode.
-   Parent can add, approve, reject, disable, and remove a content item.
-   Bengali is the default UI language and the first category group.
-   The seed library has review metadata for every approved video.
-   No third-party ad is shown in the KidsTube interface during test
    sessions; underlying player ad behaviour is separately documented.
-   No critical navigation bypass or privacy issue remains open at MVP
    release.

These targets are test goals, not claims that have already been
achieved.

## 16. Test Plan

### Unit tests

-   Approved video ID → allow.
-   Unknown/unapproved video ID → deny.
-   Missing/malformed video ID → deny.
-   Shorts URL pattern → deny.
-   Approved channel with video-level approval only → only individually
    approved videos allowed.
-   Disabled or removed item → deny.
-   Invalid content data → item not shown.

### Integration tests

-   Home screen contains only allowlisted items.
-   Search is disabled or returns only approved results.
-   Channel view does not reveal unapproved uploads.
-   Direct URL opening checks approval before playback.
-   Player suggestions and next-video behaviour cannot open unapproved
    items.
-   Back navigation cannot expose unrestricted YouTube pages.
-   External links are blocked or parent-gated.
-   Removed/private/unavailable videos display a safe message.
-   Parent gate protects settings and content management.
-   Bengali text renders correctly.

### Manual regression tests

-   Shorts button, Shorts shelf, and Shorts URL.
-   Search result to player flow.
-   Channel page to player flow.
-   History/bookmark to player flow.
-   Shared link / Android intent opening.
-   Network unavailable and YouTube page layout changed.
-   Ad-blocking behaviour in the exact fork build.
-   App restart after updating the allowlist.
-   Parent removes an item while the app is open.

### Release gate

Do not release to a child device until all P0 tests pass or any known
limitation is explicitly accepted by the guardian. If an access path
cannot be reliably restricted, disable it.

## 17. Development Roadmap

### Phase 0 --- Repository audit

-   Fork official NouTube.
-   Read the current README, licence, package configuration, and
    contribution/build instructions.
-   Build the unmodified project.
-   Record platform, toolchain, and commit.
-   Map navigation and video entry points.

**Exit criterion:** A working baseline build and a written architecture
note.

### Phase 1 --- Allowlist prototype

-   Implement a central content policy.
-   Load a small local set of approved video IDs.
-   Block unknown video IDs and unrecognized routes.
-   Add automated tests.

**Exit criterion:** Unknown content is denied through the routes
identified in the audit.

### Phase 2 --- KidsTube interface

-   Update branding.
-   Replace the child home with Bengali-first curated categories.
-   Remove Shorts entry points and unrestricted discovery surfaces.
-   Disable autoplay and unsafe external navigation.

**Exit criterion:** Child mode shows only curated categories and
approved items.

### Phase 3 --- Parent controls

-   Add parent gate.
-   Add approve/reject/disable/remove flows.
-   Add review status and metadata.
-   Add import/export or backup for the allowlist.

**Exit criterion:** A guardian can manage the content library without
editing source code.

### Phase 4 --- Content library

-   Review the supplied seed list.
-   Add Bengali, English, general learning, and Islamic Bengali
    categories.
-   Verify each video and channel individually.
-   Mark all unreviewed entries as pending.

**Exit criterion:** Every visible item has a documented approval record.

### Phase 5 --- Safety, privacy, and compatibility

-   Run the full test plan.
-   Verify ad behaviour.
-   Review privacy and licence obligations.
-   Test the built APK on the target device.
-   Document known limitations and update procedure.

**Exit criterion:** P0 acceptance criteria pass and remaining risks are
documented.

## 18. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  YouTube changes its page structure  Regression tests after upstream
                                      updates; unknown routes fail closed

  Hidden UI element remains reachable Central navigation/playback
                                      allowlist; test direct links and
                                      every entry point

  Approved channel uploads unsuitable Default to video-level approval;
  future content                      warn before channel-wide approval

  Video is deleted, made private, or  Graceful unavailable state;
  region-restricted                   guardian can remove it

  Ad behaviour changes                Test the actual build; do not
                                      promise universal ad blocking

  A child exits the app or uses       Recommend device-level parental
  another app                         controls; KidsTube alone cannot
                                      control the whole device

  Religious content has inaccurate    Use reliable sources and adult
  claims                              review; retain reviewer notes

  Upstream changes conflict with fork Keep changes focused, record base
                                      commit, review upstream diffs
                                      before merging

  Licence obligations are overlooked  Preserve notices and comply with
                                      AGPL-3.0 when distributing modified
                                      versions; seek appropriate legal
                                      advice if unsure
  -----------------------------------------------------------------------

## 19. Licence and Distribution

NouTube's repository identifies its licence as GNU AGPL-3.0. Before
distributing KidsTube: - preserve applicable copyright and licence
notices; - review the AGPL requirements for modified versions,
especially when distributing or providing network access to a modified
program; - disclose source code as required by the licence; - do not
imply endorsement by the original NouTube maintainers; - check the terms
and rights associated with any third-party branding, assets, videos,
music, and fonts.

This section is a project checklist, not legal advice.

## 20. Open Questions

These must be decided during repository audit or before release:

1.  Exact target age band and learning levels.
2.  Android-only MVP or Android plus desktop.
3.  Whether child-facing search should be disabled initially
    (recommended) or restricted to approved content.
4.  Whether parents can approve individual videos only, channels, or
    both.
5.  Whether the allowlist is stored as local JSON, a local database, or
    another project-native format.
6.  Whether any watch history is needed; default recommendation is
    minimal local history or none.
7.  Which adult(s) are responsible for approving Islamic content and
    other educational categories.
8.  Which ad-blocking behaviour is reliable in the selected NouTube
    version.
9.  Whether a separate parent PIN is technically adequate or
    device-level restrictions are also required.
10. Final name, logo, app identifier, and distribution plan.

## 21. Initial Content Inventory from `kidstube-list`

The uploaded PDF is an early working list. Some rows have incomplete or
misaligned fields, and age-group values are missing or unreadable.
Therefore, entries below are **unverified candidates**. The presence of
a link here does not mean the video/channel has been reviewed or
approved. Confirm titles, channels, language, category, age suitability,
and current availability before importing any entry into the approved
library.

### 21.1 English video candidates

  ------------------------------------------------------------------------------
  Candidate title as      URL                            Initial category
  supplied                                               
  ----------------------- ------------------------------ -----------------------
  English alphabet        https://youtu.be/JhTj_yCWgys   English alphabet

  English Number          https://youtu.be/9UOPCfZgMgU   Counting / numbers

  Bebefinn ABC Song       https://youtu.be/1itfhRRlvUY   English alphabet / song

  My First ABCD Class     https://youtu.be/NpDBZiD56a0   English alphabet

  Title not legible in    https://youtu.be/Nkmarl4ynRM   Pending review
  supplied list                                          

  Twinkle Twinkle & More  https://youtu.be/EVIJd4MGlG4   English rhymes

  Educational Nursery     https://youtu.be/rz-vqMXZuOw   English rhymes
  Rhymes                                                 

  ABC Song \| Islamic     https://youtu.be/sP3Rz2b1Ok4   English alphabet /
  Alpha                                                  Islamic-themed
                                                         candidate
  ------------------------------------------------------------------------------

### 21.2 English channel candidates

  -----------------------------------------------------------------------------------------------
  Channel name as         Channel URL                                     Initial note
  supplied                                                                
  ----------------------- ----------------------------------------------- -----------------------
  PRINIT                  https://www.youtube.com/@PRINIT1419             Listed twice in the
                                                                          PDF; verify channel and
                                                                          individual videos

  Bebefinn                https://www.youtube.com/@Bebefinn               English learning
                                                                          candidate; review
                                                                          individual videos

  ABCD bangla kids class  https://www.youtube.com/@ABCDbanglakidsclass    Bengali-to-English
                                                                          candidate

  ChuChu TV Nursery       https://www.youtube.com/@ChuChuTV               Review individual
  Rhymes & Kids Songs                                                     videos

  Kids Carnival           https://www.youtube.com/@KidsCarnivalOfficial   Review individual
                                                                          videos

  LooLoo Kids - Nursery   https://www.youtube.com/@LooLooKids             Review individual
  Rhymes and Children's                                                   videos
  Songs                                                                   

  SHiKHI SHiKHi           https://www.youtube.com/@SHiKHISHiKHi13         Review language and
                                                                          individual videos
  -----------------------------------------------------------------------------------------------

### 21.3 Bengali video candidates

  -------------------------------------------------------------------------------
  Candidate title as      URL                             Channel name as
  supplied                                                supplied / notes
  ----------------------- ------------------------------- -----------------------
  অ'য় অজগর আসছে তেড়ে      https://youtu.be/\_Gvfay-qbT4   Jugnu Kids - Bangla
                                                          Nursery Rhymes & Baby
                                                          Songs (PDF row
                                                          alignment should be
                                                          verified)

  অ আ ই ইসলামিক বাংলা     https://youtu.be/MlGNAARHmm0    SHiKHI SHiKHi (PDF row
                                                          alignment should be
                                                          verified)

  অ তে অযু \| শিশুদের জন্য   https://youtu.be/-3jA6KloUss    Kids Creation TV
  ইসলামিক বাংলা বর্ণ মালা                                  
  গান                                                     

  বাংলা সংখ্যা ১ থেকে...   https://youtu.be/UYT7EEaFPwM    Evas Learn
  (title truncated in                                     
  PDF)                                                    

  Bangla Namta 1          https://youtu.be/R2TTSYdVun0    Evas Learn

  Bangla Namta 6          https://youtu.be/w0IIg8jVY04    Evas Learn
  -------------------------------------------------------------------------------

The PDF also lists these Bengali channel candidates, but the
row-to-column alignment is incomplete and must be verified: - Jugnu
Kids - Bangla Nursery Rhymes & Baby Songs - SHiKHI SHiKHi - Kids
Creation TV - 5 Minute Solution BD - Evas Learn - Hutum School Rhymes -
বাংলা ছড়া - The Kids Islamic School - Hasi Khushi Rhymes -
ChottoDuniya - Madani Channel Bangla Official

No channel in this list should be automatically approved as a whole.
Verify each video.

### 21.4 Arabic / Quran-learning video candidates

  ------------------------------------------------------------------------------
  Candidate title as      URL                            Initial category
  supplied                                               
  ----------------------- ------------------------------ -----------------------
  আলিফ বা তা ছা \| Quran  https://youtu.be/o0lg-U4PQ4g   Arabic alphabet / Quran
  Alphabet for Beginners                                 basics

  Alifun Allah 🌟Alif Baa https://youtu.be/vVoLgjKFe2Q   Arabic alphabet
  Taa Arabic Alphabet                                    
  Song for Kids                                          

  ALIFUN BA TA UN SA      https://youtu.be/z--F7-Ufo98   Arabic alphabet; title
                                                         and content need review
  ------------------------------------------------------------------------------

The PDF lists these channel candidates in the Arabic section, but their
language/category mappings are incomplete: - 5 Minute Solution BD -
YouQaria Kids Nursery Rhymes & Islamic Cartoons

Verify Arabic pronunciation, teaching quality, religious accuracy, and
age suitability before approval.

### 21.5 Content inventory completion checklist

For every candidate: - \[ \] Confirm that the URL opens and identifies
the expected video/channel. - \[ \] Record the exact title and
channel. - \[ \] Confirm language: Bengali, English, Arabic, or mixed. -
\[ \] Assign one primary category and optional secondary categories. -
\[ \] Set the age/learning level after the target age is decided. - \[
\] Review the full video, including beginning and end. - \[ \] Review
ads, sponsorships, product promotion, and external links where
observable. - \[ \] For Islamic content, verify sources and
pronunciation/meaning where relevant. - \[ \] Record reviewer, date, and
notes. - \[ \] Set status to `approved`, `rejected`, or `pending`. - \[
\] Only `approved` items may appear in the child library.

## 22. Definition of Done

KidsTube MVP is ready for supervised testing when: - \[ \] The chosen
NouTube base commit is recorded and the unmodified baseline builds. - \[
\] The app is rebranded without removing required licence notices. - \[
\] The child home is Bengali-first. - \[ \] The approved-content
allowlist is enforced centrally. - \[ \] Unapproved direct links and
unknown routes are blocked. - \[ \] Shorts and unapproved discovery
surfaces are removed or blocked. - \[ \] Parent controls manage the
library. - \[ \] All displayed videos have a review record. - \[ \]
Islamic Bengali content has its own category and review rules. - \[ \]
P0 automated and manual tests pass. - \[ \] Ad behaviour and limitations
are documented honestly. - \[ \] A guardian has reviewed the app before
it is used by a child.

## 23. References

-   NouTube source repository: https://github.com/nonbili/NouTube
-   NouTube project website: https://noutube.org/
-   NouTube desktop repository:
    https://github.com/nonbili/NouTube-Desktop
-   Uploaded preliminary content inventory: `kidstube-list` (PDF
    supplied for this project)

------------------------------------------------------------------------

**Final product rule:** KidsTube is a modified NouTube client with an
educational allowlist. It must not show a child unreviewed content
merely because YouTube recommends it. When the app cannot verify that
content is approved, it should block that route and return the child to
the safe KidsTube library.
