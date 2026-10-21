package expo.modules.noutubeview

import java.net.URI

/**
 * The native mirror of the app's content policy (lib/content-policy.ts).
 *
 * The app checks every url before it hands one to the webview, but the webview
 * can also be asked to go somewhere by the page itself. This is the layer that
 * refuses those, so a change in YouTube's markup cannot open the door on its
 * own.
 *
 * The rules are the same as the ones in the app: only a video a parent has
 * approved may be opened, and everything else -- Shorts, search, the feeds,
 * channel pages, playlists, external links -- is refused. An unknown route is
 * refused rather than guessed at.
 */

private val KIDS_VIDEO_ID = Regex("^[A-Za-z0-9_-]{11}$")

/**
 * Whether the url may be opened while the app is in KidsTube mode.
 *
 * @param approvedVideoIds the ids of the videos a parent has approved.
 * @param previewVideoId the one candidate the parent is allowed to watch
 *   while reviewing it. Empty when there is none.
 */
internal fun isKidsUrlAllowed(
  value: String,
  approvedVideoIds: Set<String>,
  previewVideoId: String,
): Boolean {
  val uri = try {
    URI(value)
  } catch (_: Exception) {
    return false
  }

  val host = uri.host?.lowercase() ?: return false
  val isShortHost = host == "youtu.be" || host.endsWith(".youtu.be")
  val isTubeHost = host == "youtube.com" || host.endsWith(".youtube.com")
  if (!isShortHost && !isTubeHost) {
    // Anything outside YouTube is an escape from the library.
    return false
  }
  if (host == "music.youtube.com") {
    return false
  }

  val path = uri.path.orEmpty()
  val segments = path.split('/').filter { it.isNotEmpty() }
  val first = segments.firstOrNull().orEmpty()

  if (first == "shorts") {
    return false
  }

  val params = uri.rawQuery.orEmpty()
    .split('&')
    .filter { it.isNotEmpty() }
    .map { it.substringBefore('=') to it.substringAfter('=', "") }
    .toMap()

  if (params["feature"] == "shorts" || params.containsKey("shorts")) {
    return false
  }

  val videoId = when {
    isShortHost -> segments.firstOrNull()
    first == "watch" -> params["v"]
    first == "embed" || first == "v" -> segments.getOrNull(1)
    else -> null
  }

  if (videoId == null || !KIDS_VIDEO_ID.matches(videoId)) {
    // Not a video: the feed, the search, the channel page, the playlist and
    // every other route are all refused here.
    return false
  }

  if (params.containsKey("list")) {
    // A playlist context would pull unapproved videos into the page.
    return false
  }

  return approvedVideoIds.contains(videoId) || (previewVideoId.isNotEmpty() && previewVideoId == videoId)
}

/**
 * The state the check runs against. The webview client reads it on every
 * navigation, so a change only has to flip the values.
 */
object NouKidsPolicy {
  @Volatile var enabled: Boolean = true
  @Volatile var approvedVideoIds: Set<String> = emptySet()
  @Volatile var previewVideoId: String = ""

  fun update(enabled: Boolean, approvedVideoIds: Set<String>, previewVideoId: String) {
    this.enabled = enabled
    this.approvedVideoIds = approvedVideoIds
    this.previewVideoId = previewVideoId
  }

  fun isAllowed(url: String): Boolean {
    if (!enabled) {
      return true
    }
    return isKidsUrlAllowed(url, approvedVideoIds, previewVideoId)
  }
}
