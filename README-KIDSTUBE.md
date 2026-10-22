# KidsTube

A child-facing, Bengali-first video app built from
[NouTube](https://github.com/nonbili/NouTube). It plays learning videos that a
parent has approved, and nothing else.

**Deny by default.** A video is watchable only when a parent has approved that
exact video id. Everything else -- unknown ids, Shorts, search, the home feed,
channel pages, playlists, external links, unknown routes -- is refused.

---

## What it does

| | |
|---|---|
| **Curated library** | A native home screen listing the approved videos by category. Bengali first, then English, then general learning, then Islamic learning. No feed, no search, no recommendations. |
| **Parent controls** | A PIN-gated parent area to add, review, approve, reject, disable and remove videos and channels, with the reviewer and the date recorded on every item. |
| **Shorts removed** | The Shorts entry points, shelves and urls are gone. |
| **Search removed** | The child cannot search. A parent's search is not a child's search. |
| **Autoplay off** | The player stops at the end of a video instead of rolling into the next one. |
| **External links blocked** | A link out of a description or a channel leaves nothing but a refusal. |
| **No ads in the app** | The app's own interface carries no advertising. YouTube's own ad behaviour is filtered by the existing ad blocking, and needs retesting on each build. |
| **Bengali UI** | `locales/bn.json`, with Bengali category names. |

---

## How the restriction is enforced

Four independent layers, so that a change in YouTube's markup that defeats
one of them does not open the door on its own.

| Layer | Where | What it does |
|---|---|---|
| **1. The policy** | `lib/content-policy.ts` | The single place that decides whether a url may be opened. Pure, no React Native or browser APIs, so the app, the page script and the tests all use the same rules. |
| **2. The responses** | `lib/intercept.ts`, `content/intercept.ts` | Every InnerTube response is filtered down to the approved ids before the page renders it. Unapproved videos, Shorts, playlists, channel links and live chat are removed from the data, not just hidden with CSS. The autoplay set and the prefetch hints are taken out whole, because they are not list items and a list filter never sees them. |
| **3. The page** | `content/kids-guard.ts` | Refuses a navigation the page attempts on its own: `history.pushState`, a tap on a link, `window.open`, a form submit. Also stops the player from rolling into the next video and takes the "up next" and comment panels out of the page. |
| **4. The native view** | `modules/nou-tube-view/.../NouKidsPolicy.kt` | The Android webview refuses every url that is not an approved video, including a programmatic `loadUrl`, which does not go through `shouldOverrideUrlLoading`. |

On top of those, `updateUrl()` in `states/ui.ts` is the single choke point for
in-app navigation: the child tapping a video, a shared link, a deep link, the
queue, a bookmark and the player's next button all go through it. A url the
policy refuses is never loaded, and the child is returned to the library.

### What is allowed, exactly

In the restricted session the **only** url that may be opened is
`https://m.youtube.com/watch?v=<approved id>`.

Search, the home feed, trending, explore, Shorts, channel pages, playlists,
live, comments, music and external hosts are all refused. A route that is not
recognised is refused rather than guessed at.

---

## The parent gate

- There is **no default PIN**. An install that has never had one has no parent
  area until a parent creates one, so a child cannot get in by guessing a
  value that ships with the app.
- The PIN is salted and hashed (SHA-256, 1000 iterations, a per-install salt)
  and only the hash is stored.
- The unlocked state is **not persisted**: it lives for the length of the
  session and re-locks itself after five minutes of quiet.
- The PIN gate protects the parent area. It is not a substitute for the
  device's own parental controls -- see the limitations below.

## The content model

```json
{
  "videoId": "JhTj_yCWgys",
  "title": "English alphabet",
  "channelName": "Bebefinn",
  "language": "en",
  "category": "english_alphabet",
  "ageBand": "3-5",
  "approvalStatus": "approved",
  "approvalScope": "video",
  "reviewedByRole": "parent",
  "reviewedAt": "2026-10-21",
  "reviewNotes": "Why this item is suitable",
  "source": "seed-list"
}
```

`approvalStatus` is one of `approved`, `pending` or `rejected`.
`approvalScope` is `video` or `channel`; a channel is never approved as a
whole, its videos are imported one by one as pending candidates, so a later
upload cannot slip in on the strength of an old decision.

Categories, in the order the child sees them:

`bengali_alphabet`, `bengali_reading`, `bengali_rhymes`, `bengali_numbers`,
`english_alphabet`, `english_phonics`, `english_rhymes`, `english_counting`,
`shapes_colours`, `animals_nature`, `everyday_knowledge`, `habits_safety`,
`islamic_quran`, `islamic_duas`, `islamic_stories`, `islamic_adab`,
`islamic_nasheeds`.

### The seed library

`content/kids-seed.json` holds the candidates from the supplied
`kidstube-list`, and **every one of them starts as `pending`**. Nothing
reaches the child until an adult looks at it and approves it. The candidates
are brought in the first time the app runs, so the parent opens the app and
finds the list to work through.

Every entry has been **checked against the video itself**: the real title,
the real channel name, the real @handle and the real channel id were read
from each video's page. Two of the handles that the supplied list only named
were wrong, and are now right:

| The supplied list named | The real channel |
|---|---|
| Jugnu Kids - Bangla Nursery Rhymes & Baby Songs | `@JugnuKidsBangla` |
| YouQaria Kids Nursery Rhymes & Islamic Cartoons | `@YouQaria` |

The one title that was not legible in the supplied list turned out to be
"ABC Song with ChuChu Toy Train" by ChuChu TV, so it is filed as an English
alphabet song rather than as an unknown. The only handle still worth a
second look is `@ChottoDuniya`, which resolves to a channel now called
গল্পের রাজ্য; the seed says so.

The parent can also pull a channel's recent videos in with one button, which
reads the channel's RSS feed. Those arrive as pending candidates too, one by
one, so a later upload cannot slip in on the strength of an old decision.

---

## Building

The Android build is the supported target.

```sh
bun install
bun dev            # watch-build the page script
bun android        # build and run on a device
```

For a release build:

```sh
bun bundle:es
bun expo prebuild -p android --clean --no-install
cd android && ./gradlew assembleFullRelease
```

## Tests

```sh
bun test              # the unit tests
bunx tsc --noEmit     # the type check
cd android && ./gradlew :nou-tube-view:testFullDebugUnitTest
```

The policy tests in `lib/content-policy.test.ts` and the Kotlin tests in
`KidsPolicyTest.kt` are the ones that matter: they check that an unapproved
video is refused through every route.

## Continuous integration

`.github/workflows/kidstube-build.yml` runs on every push:

1. the type check and the unit tests,
2. the Android module's unit tests,
3. the release APK, signed and uploaded as a build artifact.

The signing key lives in the repository's secrets (`SIGNING_KEY`, `ALIAS`,
`KEY_STORE_PASSWORD`, `KEY_PASSWORD`), so every build is signed with the
same key and an installed app can be updated in place.

---

## What has been checked

Not everything here has been run on a phone yet, so this is an honest list of
what was verified and how.

**Verified by running it:**

- The policy decisions, against every url shape YouTube uses (`bun test`).
- The allowlist filter, against **live InnerTube responses**. A real search
  response carried 22 videos; after the filter, 0 were left. A real "up next"
  response carried 50; after the filter, 1 was left, and that one is the video
  the child is watching. Nothing leaked.
- The native policy, against the same rules, in Kotlin (`KidsPolicyTest`).
- The channel import, against a real channel feed.
- The type check, the unit tests and the page script bundle, on every push.

**Not yet verified:**

- The app on a real Android device. The build, the launcher icon and the
  splash are checked by the build, but the child facing screen has not been
  looked at on a phone.
- The video actually playing, and the ad behaviour of a real playback. The
  ad blocking is inherited from NouTube and has to be retested on this build
  rather than assumed.
- The parent gate against a determined child.

## Known limitations

These are real, and worth reading before the app is put in front of a child.

- **This is not tamper-proof.** It is a client-side filter on top of YouTube's
  own web pages. A determined person with a rooted device or a modified
  client can get around it. **Use the device's own parental controls
  (Family Link, Screen Time) as the real boundary.** KidsTube is a second
  layer, not the only one.
- **The policy is only as good as the review.** Approving a channel wholesale
  approves whatever it uploads next. Video-level approval is the safer
  default, and the parent area warns about this.
- **The seed list has not been watched.** Every entry in
  `content/kids-seed.json` is pending on purpose. The titles, channels and
  handles are now verified against the videos, but nobody has watched the
  videos end to end, and a parent still has to do that before approving.
- **Islamic content needs a careful reviewer.** Recitation, pronunciation and
  meaning have to be checked against a reliable source, and the reviewer's
  note is kept with the item for that reason.
- **YouTube changes.** The page structure, the renderers and the routes all
  move. The tests have to be rerun after an upstream update, and any route
  that is not recognised is refused rather than allowed -- so a change fails
  closed, but it may still fail.
- **Ad behaviour is not guaranteed.** The app's own interface carries no
  advertising. YouTube's ads are filtered by the existing ad blocking, which
  needs to be retested on each build rather than assumed.
- **Android only for now.** The desktop and browser-extension workspaces are
  untouched and still carry the unrestricted behaviour.

## Licence

GNU AGPL-3.0, as inherited from NouTube. See `LICENSE` and `NOTICE`.

KidsTube is not endorsed by the NouTube maintainers.
