package expo.modules.noutubeview

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KidsPolicyTest {
  private val approved = setOf("dQw4w9WgXcQ")
  private val preview = ""

  private fun allowed(url: String) = isKidsUrlAllowed(url, approved, preview)

  @Test
  fun allowsAnApprovedVideo() {
    assertTrue(allowed("https://m.youtube.com/watch?v=dQw4w9WgXcQ"))
    assertTrue(allowed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s"))
    assertTrue(allowed("https://youtu.be/dQw4w9WgXcQ"))
    assertTrue(allowed("https://m.youtube.com/embed/dQw4w9WgXcQ"))
  }

  @Test
  fun refusesAVideoThatIsNotApproved() {
    assertFalse(allowed("https://m.youtube.com/watch?v=aaaaaaaaaaa"))
    assertFalse(allowed("https://youtu.be/aaaaaaaaaaa"))
  }

  @Test
  fun refusesShorts() {
    assertFalse(allowed("https://m.youtube.com/shorts/dQw4w9WgXcQ"))
    assertFalse(allowed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=shorts"))
  }

  @Test
  fun refusesTheDiscoverySurfaces() {
    assertFalse(allowed("https://m.youtube.com/"))
    assertFalse(allowed("https://m.youtube.com/feed/subscriptions"))
    assertFalse(allowed("https://m.youtube.com/feed/trending"))
    assertFalse(allowed("https://m.youtube.com/explore"))
    assertFalse(allowed("https://music.youtube.com/"))
  }

  @Test
  fun refusesSearchAndChannelPages() {
    assertFalse(allowed("https://m.youtube.com/search?q=cartoon"))
    assertFalse(allowed("https://m.youtube.com/results?search_query=cartoon"))
    assertFalse(allowed("https://www.youtube.com/@SomeChannel"))
    assertFalse(allowed("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"))
    assertFalse(allowed("https://www.youtube.com/c/SomeChannel"))
  }

  @Test
  fun refusesPlaylistsAndLive() {
    assertFalse(allowed("https://m.youtube.com/playlist?list=PL123"))
    assertFalse(allowed("https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123"))
    assertFalse(allowed("https://m.youtube.com/live/dQw4w9WgXcQ"))
  }

  @Test
  fun refusesExternalLinks() {
    assertFalse(allowed("https://example.com/"))
    assertFalse(allowed("https://google.com/search?q=x"))
    assertFalse(allowed("not a url"))
    assertFalse(allowed(""))
  }

  @Test
  fun refusesAMalformedVideoId() {
    assertFalse(allowed("https://m.youtube.com/watch?v=short"))
    assertFalse(allowed("https://m.youtube.com/watch"))
  }

  @Test
  fun refusesAnUnknownRoute() {
    assertFalse(allowed("https://m.youtube.com/redirect?q=https://example.com"))
    assertFalse(allowed("https://m.youtube.com/clip/abc"))
  }

  @Test
  fun allowsThePreviewedCandidateOnly() {
    val candidate = "aaaaaaaaaaa"
    assertFalse(isKidsUrlAllowed("https://m.youtube.com/watch?v=$candidate", approved, ""))
    assertTrue(isKidsUrlAllowed("https://m.youtube.com/watch?v=$candidate", approved, candidate))
    // The preview does not open anything else.
    assertFalse(isKidsUrlAllowed("https://m.youtube.com/watch?v=bbbbbbbbbbb", approved, candidate))
  }
}
