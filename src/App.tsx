import {
  Fragment,
  memo,
  type ReactNode,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type GalleryVideo = {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  prompt: string;
  tags: string[];
  createdAt?: string;
  description?: string;
};

type SortOrder = "newest" | "oldest";
type LoadState = "loading" | "ready" | "empty" | "error";

const UNTAGGED_FILTER = "__untagged__";
const cameoPattern = /@[A-Za-z0-9_]+(?:[.-][A-Za-z0-9_]+)*/g;

class VideoDataError extends Error {
  constructor(
    public readonly index: number,
    message: string,
  ) {
    super(`videos.json[${index}]: ${message}`);
  }
}

function isHttpsUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\//i.test(value);
}

function normalizeVideo(raw: unknown, index: number): GalleryVideo {
  if (!raw || typeof raw !== "object") {
    throw new VideoDataError(index, "動画項目は object である必要があります");
  }

  const item = raw as Record<string, unknown>;

  if (typeof item.id !== "string" || item.id.trim().length === 0) {
    throw new VideoDataError(index, "id は必須の文字列です");
  }
  if (!isHttpsUrl(item.videoUrl)) {
    throw new VideoDataError(index, "videoUrl は https:// で始まる絶対URLです");
  }
  if (!isHttpsUrl(item.thumbnailUrl)) {
    throw new VideoDataError(index, "thumbnailUrl は https:// で始まる絶対URLです");
  }
  if (typeof item.prompt !== "string") {
    throw new VideoDataError(index, "prompt は文字列である必要があります");
  }
  if (!Array.isArray(item.tags)) {
    throw new VideoDataError(index, "tags は文字列配列です");
  }

  const videoUrl = item.videoUrl;
  const thumbnailUrl = item.thumbnailUrl;

  return {
    id: item.id,
    videoUrl,
    thumbnailUrl,
    prompt: item.prompt,
    tags: item.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ja")),
    createdAt:
      typeof item.createdAt === "string" && item.createdAt.trim()
        ? item.createdAt
        : undefined,
    description:
      typeof item.description === "string" && item.description.trim()
        ? item.description
        : undefined,
  };
}

function createdAtTime(video: GalleryVideo) {
  if (!video.createdAt) return null;
  const time = Date.parse(video.createdAt);
  return Number.isFinite(time) ? time : null;
}

function compareByCreatedAt(a: GalleryVideo, b: GalleryVideo, sortOrder: SortOrder) {
  const aTime = createdAtTime(a);
  const bTime = createdAtTime(b);

  if (aTime !== null && bTime !== null && aTime !== bTime) {
    return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
  }

  if (aTime !== null && bTime === null) return -1;
  if (aTime === null && bTime !== null) return 1;

  return a.id.localeCompare(b.id, "en");
}

function sortVideos(videos: GalleryVideo[], sortOrder: SortOrder) {
  return [...videos].sort((a, b) => compareByCreatedAt(a, b, sortOrder));
}

function matchesSearchQuery(video: GalleryVideo, searchValue: string) {
  const queries = searchValue
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (queries.length === 0) return true;

  const searchableText = [video.prompt, video.description, ...video.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return queries.every((query) => searchableText.includes(query));
}

function matchesTag(video: GalleryVideo, activeTag: string) {
  if (!activeTag) return true;
  if (activeTag === UNTAGGED_FILTER) return video.tags.length === 0;
  return video.tags.includes(activeTag);
}

function videoPath(videoId: string) {
  return `/video/${encodeURIComponent(videoId)}`;
}

function getVideoIdFromPath() {
  const match = window.location.pathname.match(/^\/video\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function pushUrlForVideo(videoId: string) {
  window.history.pushState({}, "", videoPath(videoId));
}

function pushGalleryUrl() {
  window.history.pushState({}, "", "/");
}

function Icon({
  children,
  className = "h-5 w-5",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ThumbnailCard = memo(function ThumbnailCard({
  video,
  isActive,
  onOpen,
}: {
  video: GalleryVideo;
  isActive: boolean;
  onOpen: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative aspect-[9/16] overflow-hidden rounded-2xl border-2 bg-white/5 text-left shadow-2xl transition-all duration-300 focus:outline-none focus-visible:border-blue-200 ${
        isActive
          ? "scale-[1.02] border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.30)]"
          : "border-transparent hover:border-white/20"
      }`}
    >
      {!imageFailed ? (
        <img
          src={video.thumbnailUrl}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover opacity-65 transition-opacity duration-500 group-hover:opacity-100"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black text-xs text-white/35">
          No thumbnail
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute bottom-0 left-0 right-0 translate-y-1 p-3 transition-transform duration-300 group-hover:translate-y-0">
        <p className="line-clamp-3 text-xs font-medium leading-tight text-white/90">
          {video.prompt}
        </p>
      </div>
    </button>
  );
});

function TagButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors focus:outline-none focus-visible:border-blue-200 ${
        active
          ? "border-blue-300/60 bg-blue-500/20 text-blue-100"
          : "border-white/10 bg-white/5 text-white/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    currentVideoIdRef.current = currentVideoId;
  }, [currentVideoId]);

  useEffect(() => {
    let cancelled = false;

    fetch("/videos.json", { cache: "no-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`videos.json を読み込めませんでした (${response.status})`);
        }
        return response.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(data)) {
          throw new Error("videos.json は配列である必要があります");
        }

        const normalized = data.map(normalizeVideo);

        setVideos(normalized);
        setLoadState(normalized.length > 0 ? "ready" : "empty");

        const pathVideoId = getVideoIdFromPath();
        if (pathVideoId && normalized.some((video) => video.id === pathVideoId)) {
          setCurrentVideoId(pathVideoId);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "不明なエラーです");
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isComposing) {
      setActiveSearchQuery(searchQuery);
    }
  }, [isComposing, searchQuery]);

  const sortedVideos = useMemo(
    () => sortVideos(videos, sortOrder),
    [sortOrder, videos],
  );

  const filteredVideos = useMemo(
    () =>
      sortedVideos.filter(
        (video) =>
          matchesSearchQuery(video, activeSearchQuery) &&
          matchesTag(video, activeTag),
      ),
    [activeSearchQuery, activeTag, sortedVideos],
  );

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const video of videos) {
      for (const tag of video.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    return Array.from(counts.entries()).sort(([a, aCount], [b, bCount]) => {
      if (bCount !== aCount) return bCount - aCount;
      return a.localeCompare(b, "ja");
    });
  }, [videos]);

  const untaggedCount = useMemo(
    () => videos.filter((video) => video.tags.length === 0).length,
    [videos],
  );

  const currentVideo = useMemo(() => {
    if (!currentVideoId) return null;
    return sortedVideos.find((video) => video.id === currentVideoId) ?? null;
  }, [currentVideoId, sortedVideos]);

  const playableVideos = filteredVideos.length > 0 ? filteredVideos : sortedVideos;
  const currentPlayableIndex = currentVideo
    ? playableVideos.findIndex((video) => video.id === currentVideo.id)
    : -1;
  const isPlayerOpen = currentVideo !== null;
  const isSearchActive = activeSearchQuery.trim().length > 0 || activeTag.length > 0;
  const activeTagLabel = activeTag === UNTAGGED_FILTER ? "未分類" : activeTag;

  const openGallery = useCallback(() => {
    setCurrentVideoId(null);
    setShowControls(false);
    pushGalleryUrl();
  }, []);

  const openVideo = useCallback((videoId: string) => {
    setCurrentVideoId(videoId);
    pushUrlForVideo(videoId);
  }, []);

  const openTagGallery = useCallback(
    (tag: string) => {
      setSearchQuery("");
      setActiveSearchQuery("");
      setActiveTag(tag);
      openGallery();
    },
    [openGallery],
  );

  const openSearchGallery = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setActiveSearchQuery(query);
      setActiveTag("");
      openGallery();
    },
    [openGallery],
  );

  const jumpToPlayableIndex = useCallback(
    (index: number) => {
      if (playableVideos.length === 0) return;
      const nextIndex = ((index % playableVideos.length) + playableVideos.length) %
        playableVideos.length;
      openVideo(playableVideos[nextIndex].id);
    },
    [openVideo, playableVideos],
  );

  const goToNext = useCallback(() => {
    const baseIndex = currentPlayableIndex === -1 ? 0 : currentPlayableIndex;
    jumpToPlayableIndex(baseIndex + 1);
  }, [currentPlayableIndex, jumpToPlayableIndex]);

  const goToPrev = useCallback(() => {
    const baseIndex = currentPlayableIndex === -1 ? 0 : currentPlayableIndex;
    jumpToPlayableIndex(baseIndex - 1);
  }, [currentPlayableIndex, jumpToPlayableIndex]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const togglePlayback = useCallback(() => {
    const id = currentVideoIdRef.current;
    const activeEl = id ? videoRefs.current[id] : null;
    if (!activeEl) return;

    if (activeEl.paused) {
      activeEl.play().catch(() => {});
    } else {
      activeEl.pause();
    }
  }, []);

  const randomVideo = useCallback(() => {
    if (playableVideos.length === 0) return;
    const randomIndex = Math.floor(Math.random() * playableVideos.length);
    jumpToPlayableIndex(randomIndex);
  }, [jumpToPlayableIndex, playableVideos.length]);

  const handleCopyPrompt = useCallback(async () => {
    if (!currentVideo?.prompt) return;
    try {
      await navigator.clipboard.writeText(currentVideo.prompt);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  }, [currentVideo?.prompt]);

  const renderPromptText = useCallback(
    (prompt: string) => {
      const parts: ReactNode[] = [];
      let lastIndex = 0;

      for (const match of prompt.matchAll(cameoPattern)) {
        const cameo = match[0];
        const index = match.index ?? 0;

        if (index > lastIndex) {
          parts.push(prompt.slice(lastIndex, index));
        }

        parts.push(
          <button
            key={`${cameo}-${index}`}
            type="button"
            onClick={() => openSearchGallery(cameo)}
            className="pointer-events-auto rounded px-1 text-blue-200 transition-colors hover:bg-blue-500/20 hover:text-blue-100 focus:outline-none focus-visible:bg-blue-500/25"
            title={`"${cameo}" の検索結果を表示`}
          >
            {cameo}
          </button>,
        );

        lastIndex = index + cameo.length;
      }

      if (lastIndex < prompt.length) {
        parts.push(prompt.slice(lastIndex));
      }

      return parts.length > 0 ? parts : prompt;
    },
    [openSearchGallery],
  );

  useEffect(() => {
    const handlePopState = () => {
      const pathVideoId = getVideoIdFromPath();
      if (pathVideoId && videos.some((video) => video.id === pathVideoId)) {
        setCurrentVideoId(pathVideoId);
      } else {
        setCurrentVideoId(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [videos]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTextInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;

      if (event.key === "?" && !isTextInput) {
        event.preventDefault();
        setShowShortcuts((visible) => !visible);
        return;
      }

      if (event.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (isTextInput && searchQuery) {
          setSearchQuery("");
          setActiveSearchQuery("");
          return;
        }
        if (isPlayerOpen) {
          openGallery();
          return;
        }
      }

      if (isTextInput) return;

      if (event.key === "/") {
        event.preventDefault();
        openGallery();
        requestAnimationFrame(() => searchInputRef.current?.focus());
        return;
      }

      if (event.key.toLowerCase() === "m") {
        setIsMuted((muted) => !muted);
        return;
      }

      if (event.key.toLowerCase() === "f") {
        toggleFullscreen();
        return;
      }

      if (event.key.toLowerCase() === "r") {
        randomVideo();
        return;
      }

      if (!isPlayerOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        goToNext();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        goToPrev();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        window.history.back();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        window.history.forward();
      } else if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    goToNext,
    goToPrev,
    isPlayerOpen,
    openGallery,
    randomVideo,
    searchQuery,
    showShortcuts,
    toggleFullscreen,
    togglePlayback,
  ]);

  useEffect(() => {
    const activeId = currentVideo?.id;
    for (const [id, element] of Object.entries(videoRefs.current)) {
      if (!element) continue;
      if (id === activeId && isPlayerOpen) {
        element.muted = isMuted;
        element.play().catch(() => {});
      } else {
        element.pause();
        element.muted = true;
        element.currentTime = 0;
      }
    }
  }, [currentVideo?.id, isMuted, isPlayerOpen]);

  useEffect(() => {
    let animationFrameId = 0;

    const tick = () => {
      const activeId = currentVideoIdRef.current;
      const activeEl = activeId ? videoRefs.current[activeId] : null;
      if (activeEl && progressRef.current && activeEl.duration) {
        progressRef.current.style.width = `${(activeEl.currentTime / activeEl.duration) * 100}%`;
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;
    const threshold = 50;

    if (isPlayerOpen && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const renderVideos = useMemo(() => {
    if (!currentVideo) return [];
    const prev =
      currentPlayableIndex > 0 ? playableVideos[currentPlayableIndex - 1] : null;
    const next =
      currentPlayableIndex !== -1 && currentPlayableIndex < playableVideos.length - 1
        ? playableVideos[currentPlayableIndex + 1]
        : null;
    return [prev, currentVideo, next].filter(Boolean) as GalleryVideo[];
  }, [currentPlayableIndex, currentVideo, playableVideos]);

  if (loadState === "loading") {
    return (
      <main className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-2xl font-light uppercase tracking-widest text-white/70">
          Loading
        </div>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="flex h-screen items-center justify-center bg-black p-8 text-white">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
          <h1 className="text-xl font-semibold">Gallery data error</h1>
          <p className="mt-4 text-sm leading-6 text-white/65">{loadError}</p>
        </section>
      </main>
    );
  }

  if (loadState === "empty") {
    return (
      <main className="flex h-screen items-center justify-center bg-black p-8 text-white">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-2xl">
          <h1 className="text-xl font-semibold">Sora Gallery</h1>
          <p className="mt-4 text-sm leading-6 text-white/60">
            public/videos.json に公開対象の動画を追加してください。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      className="relative h-screen w-full overflow-hidden bg-black text-white"
      onMouseMove={(event) => {
        const isNearBottom = event.clientY > window.innerHeight * 0.58;
        const isNearLeft = event.clientX < window.innerWidth * 0.28;
        setShowControls(isPlayerOpen && (isNearBottom || isNearLeft));
      }}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <section
        hidden={!isPlayerOpen}
        className={`absolute inset-0 bg-black transition-opacity duration-150 ${
          isPlayerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isPlayerOpen}
      >
        {renderVideos.map((video) => {
          const isActive = video.id === currentVideo?.id;
          return (
            <div
              key={video.id}
              className={`absolute inset-0 bg-black transition-opacity duration-100 ${
                isActive ? "z-10 opacity-100" : "z-0 opacity-0"
              }`}
            >
              <video
                ref={(element) => {
                  videoRefs.current[video.id] = element;
                }}
                src={video.videoUrl}
                className="h-full w-full object-contain"
                loop
                muted={!isActive || isMuted}
                playsInline
                preload="auto"
              />
            </div>
          );
        })}

        <div
          className={`absolute left-5 top-8 z-30 transition-opacity duration-300 md:left-8 md:top-12 ${
            showControls ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="flex min-w-[54px] flex-col items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-4 shadow-2xl backdrop-blur-3xl md:py-6">
            <button
              type="button"
              onClick={goToPrev}
              className="toolbar-button"
              title="Previous"
            >
              <Icon>
                <path d="m18 15-6-6-6 6" />
              </Icon>
            </button>
            <div className="flex w-12 flex-col items-center gap-1">
              <span className="font-mono text-[16px] font-medium text-white">
                {currentPlayableIndex === -1 ? 1 : currentPlayableIndex + 1}
              </span>
              <div className="h-px w-4 bg-white/40" />
              <span className="text-center font-mono text-[10px] font-light text-white/50">
                {playableVideos.length}
              </span>
            </div>
            <button
              type="button"
              onClick={goToNext}
              className="toolbar-button"
              title="Next"
            >
              <Icon>
                <path d="m6 9 6 6 6-6" />
              </Icon>
            </button>
            <div className="my-1 h-px w-6 bg-white/10" />
            <button
              type="button"
              onClick={openGallery}
              className="toolbar-button"
              title="Gallery"
            >
              <Icon>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </Icon>
            </button>
            <button
              type="button"
              onClick={randomVideo}
              className="toolbar-button"
              title="Random"
            >
              <Icon>
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </Icon>
            </button>
            <button
              type="button"
              onClick={() => setIsMuted((muted) => !muted)}
              className="toolbar-button"
              title={isMuted ? "Unmute" : "Mute"}
              aria-pressed={!isMuted}
            >
              {isMuted ? (
                <Icon>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </Icon>
              ) : (
                <Icon>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M19 5a9 9 0 0 1 0 14" />
                </Icon>
              )}
            </button>
          </div>
        </div>

        {currentVideo && (
          <div
            className={`pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-6 pt-32 transition-opacity duration-300 md:p-10 md:pb-6 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="max-w-2xl">
              {currentVideo.description && (
                <p className="mb-3 text-sm leading-6 text-white/70">
                  {currentVideo.description}
                </p>
              )}
              <div className="group/prompt relative mb-2 flex items-start gap-2.5 text-base font-light leading-relaxed text-white drop-shadow-2xl">
                <div className="pointer-events-auto max-h-40 flex-1 overflow-y-auto pr-1 text-sm leading-6 md:text-base">
                  {renderPromptText(currentVideo.prompt)}
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="pointer-events-auto flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 p-1.5 text-white/45 transition-all hover:scale-105 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:border-white/40"
                  title={isCopied ? "コピーしました" : "プロンプトをコピー"}
                >
                  {isCopied ? (
                    <Icon className="h-3.5 w-3.5 text-emerald-300">
                      <polyline points="20 6 9 17 4 12" />
                    </Icon>
                  ) : (
                    <Icon className="h-3.5 w-3.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </Icon>
                  )}
                </button>
              </div>
              {currentVideo.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {currentVideo.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => openTagGallery(tag)}
                      className="pointer-events-auto rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/75 backdrop-blur-md transition-colors hover:border-blue-300/50 hover:bg-blue-500/25 hover:text-blue-100 focus:outline-none focus-visible:border-blue-200"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className={`absolute bottom-0 left-0 right-0 z-40 h-[2px] bg-white/10 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div ref={progressRef} className="h-full bg-white/35" />
        </div>
      </section>

      <section
        hidden={isPlayerOpen}
        className={`fixed inset-0 z-50 transition-opacity duration-150 ${
          isPlayerOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
        <div className="absolute inset-0 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-5 pb-40 pt-20 md:px-12 md:pt-28">
            <div className="mb-8 flex items-start justify-between gap-5 md:mb-10">
              <div className="flex min-w-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveSearchQuery("");
                    setActiveTag("");
                    pushGalleryUrl();
                  }}
                  className="w-fit text-left text-2xl font-light uppercase tracking-widest text-white/55 transition-colors hover:text-white/85 focus:outline-none focus-visible:text-white"
                >
                  Sora Gallery
                </button>
                {isSearchActive && (
                  <p className="font-mono text-xs text-blue-300">
                    Showing {filteredVideos.length} of {videos.length}
                    {activeSearchQuery && ` results for "${activeSearchQuery}"`}
                    {activeTag && ` tagged "${activeTagLabel}"`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() =>
                    setSortOrder((order) => (order === "newest" ? "oldest" : "newest"))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                  title={
                    sortOrder === "newest"
                      ? "現在: 新しい順。クリックで古い順に切り替え"
                      : "現在: 古い順。クリックで新しい順に切り替え"
                  }
                >
                  {sortOrder === "newest" ? (
                    <Icon className="h-4 w-4">
                      <path d="M11 5h8" />
                      <path d="M11 12h6" />
                      <path d="M11 19h4" />
                      <path d="M5 5v14" />
                      <path d="m2 16 3 3 3-3" />
                    </Icon>
                  ) : (
                    <Icon className="h-4 w-4">
                      <path d="M11 5h4" />
                      <path d="M11 12h6" />
                      <path d="M11 19h8" />
                      <path d="M5 19V5" />
                      <path d="m2 8 3-3 3 3" />
                    </Icon>
                  )}
                </button>
              </div>
            </div>

            {(tagCounts.length > 0 || untaggedCount > 0) && (
              <div className="mb-8 flex flex-wrap gap-2">
                <TagButton
                  active={activeTag === ""}
                  onClick={() => setActiveTag("")}
                >
                  All <span className="ml-1 opacity-60">{videos.length}</span>
                </TagButton>
                {untaggedCount > 0 && (
                  <TagButton
                    active={activeTag === UNTAGGED_FILTER}
                    onClick={() => setActiveTag(UNTAGGED_FILTER)}
                  >
                    未分類 <span className="ml-1 opacity-60">{untaggedCount}</span>
                  </TagButton>
                )}
                {tagCounts.map(([tag, count]) => (
                  <TagButton
                    key={tag}
                    active={activeTag === tag}
                    onClick={() => setActiveTag(tag)}
                  >
                    {tag} <span className="ml-1 opacity-60">{count}</span>
                  </TagButton>
                ))}
              </div>
            )}

            {filteredVideos.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-white/60">
                条件に一致する動画がありません。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-10 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
                {filteredVideos.map((video) => (
                  <ThumbnailCard
                    key={video.id}
                    video={video}
                    isActive={video.id === currentVideoId}
                    onOpen={() => openVideo(video.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[70] flex h-44 items-end justify-center pb-8"
          onMouseEnter={() => searchInputRef.current?.focus()}
        >
          <div className="pointer-events-auto w-full max-w-md px-6">
            <div className="group/search relative">
              <div className="absolute -inset-0.5 rounded-2xl bg-blue-400/25 opacity-0 blur-md transition duration-500 group-focus-within/search:opacity-100" />
              <div className="relative flex w-full items-center overflow-hidden rounded-2xl border border-white/12 bg-black/80 shadow-2xl backdrop-blur-3xl">
                <div className="shrink-0 pl-5 text-white/35">
                  <Icon className="h-4 w-4">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </Icon>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search prompts, comments, tags..."
                  value={searchQuery}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    const composing = isComposing || event.nativeEvent.isComposing;
                    if (event.key === "Enter" && !composing) {
                      event.preventDefault();
                      setActiveSearchQuery(event.currentTarget.value);
                    }
                  }}
                  className="h-14 min-w-0 flex-1 border-none bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/25"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveSearchQuery("");
                    }}
                    className="shrink-0 px-3 text-white/30 transition-colors hover:text-white focus:outline-none focus-visible:text-white"
                    title="検索をクリア"
                  >
                    <Icon className="h-4 w-4">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </Icon>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showShortcuts && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-6 text-center text-lg font-semibold text-white">
              ショートカット
            </h2>
            <div className="space-y-3 text-sm">
              {[
                ["/", "検索欄へフォーカス"],
                ["↑ / ↓", "再生画面で前後動画"],
                ["← / →", "履歴を戻る / 進む"],
                ["Space", "再生 / 一時停止"],
                ["M", "ミュート"],
                ["F", "フルスクリーン"],
                ["R", "ランダム"],
                ["Esc", "戻る / 閉じる"],
                ["?", "このパネル"],
              ].map(([key, desc]) => (
                <Fragment key={key}>
                  <div className="flex items-center justify-between gap-4">
                    <kbd className="min-w-[78px] rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-center font-mono text-xs text-white">
                      {key}
                    </kbd>
                    <span className="text-right text-white/70">{desc}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
