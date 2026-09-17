// 古い再生要求は、動画・画面・音設定が変わった後に状態を変更しない。
export async function requestVideoPlayback(
  element: Pick<HTMLVideoElement, "play" | "muted" | "defaultMuted">,
  isCurrent: () => boolean,
) {
  try {
    await element.play();
    return isCurrent() ? "played" : "cancelled";
  } catch (error) {
    if (!isCurrent()) return "cancelled";
    if (!(error instanceof DOMException) || error.name !== "NotAllowedError" || element.muted) {
      return error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "blocked";
    }
    element.muted = true;
    element.defaultMuted = true;
    try {
      await element.play();
      return isCurrent() ? "muted-fallback" : "cancelled";
    } catch {
      return isCurrent() ? "muted-blocked" : "cancelled";
    }
  }
}
