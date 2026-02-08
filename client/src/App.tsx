import { useState, useCallback, useEffect } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface VideoInfo {
    title: string;
    duration: number;
    thumbnail: string;
    author: string;
}

type Status =
    | { type: "idle" }
    | { type: "fetching" }
    | { type: "downloading"; format: string }
    | { type: "success"; message: string }
    | { type: "error"; message: string };

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function ArrowIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

function VideoIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 3H3v18h18V3z" />
            <path d="M10 9l5 3-5 3V9z" />
        </svg>
    );
}

function AudioIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
        </svg>
    );
}

function SunIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
    const stored = localStorage.getItem("y2l-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
}

type Platform = "youtube" | "instagram";

function App() {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    const [platform, setPlatform] = useState<Platform>("youtube");
    const [url, setUrl] = useState("");
    const [info, setInfo] = useState<VideoInfo | null>(null);
    const [status, setStatus] = useState<Status>({ type: "idle" });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("y2l-theme", theme);
    }, [theme]);

    const toggleTheme = () =>
        setTheme((t) => (t === "dark" ? "light" : "dark"));

    const switchPlatform = (p: Platform) => {
        setPlatform(p);
        setUrl("");
        setInfo(null);
        setStatus({ type: "idle" });
    };

    const fetchInfo = useCallback(async (videoUrl: string) => {
        setStatus({ type: "fetching" });
        setInfo(null);
        try {
            const endpoint = videoUrl.includes("instagram.com")
                ? "/api/instagram/info"
                : "/api/info";
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: videoUrl }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to fetch info");
            }
            const data: VideoInfo = await res.json();
            setInfo(data);
            setStatus({ type: "idle" });
        } catch (err: any) {
            setStatus({ type: "error", message: err.message });
        }
    }, []);

    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLInputElement>) => {
            const pasted = e.clipboardData.getData("text");
            if (pasted && pasted.includes("instagram.com")) {
                setPlatform("instagram");
                setTimeout(() => fetchInfo(pasted), 50);
            } else if (
                pasted &&
                (pasted.includes("youtube.com") || pasted.includes("youtu.be"))
            ) {
                setPlatform("youtube");
                setTimeout(() => fetchInfo(pasted), 50);
            }
        },
        [fetchInfo],
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && url.trim()) {
            fetchInfo(url.trim());
        }
    };

    const download = async (format: "video" | "audio") => {
        if (!url.trim()) return;

        const label = format === "video" ? "MP4" : "Audio";
        setStatus({ type: "downloading", format: label });

        try {
            const downloadUrl =
                platform === "instagram"
                    ? `${API_BASE}/api/instagram/download`
                    : `${API_BASE}/api/download/${format}`;
            const res = await fetch(downloadUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim() }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Download failed");
            }

            const disposition = res.headers.get("Content-Disposition");
            let filename = `download.${format === "video" ? "mp4" : "webm"}`;
            if (disposition) {
                const match = disposition.match(/filename="?(.+?)"?$/);
                if (match) filename = decodeURIComponent(match[1]);
            }

            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);

            setStatus({ type: "success", message: `${label} downloaded` });
        } catch (err: any) {
            setStatus({ type: "error", message: err.message });
        }
    };

    const isLoading =
        status.type === "fetching" || status.type === "downloading";

    return (
        <div className="app">
            <button
                className="theme-toggle"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label="Toggle theme"
            >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>

            <header className="header">
                <div className="logo">
                    <span className="logo-y">y</span>
                    <span className="logo-2">2</span>
                    <span className="logo-d">l</span>
                </div>
                <p className="tagline">
                    youtube <span className="tagline-dot">/</span> to{" "}
                    <span className="tagline-dot">/</span> local
                </p>
            </header>

            <div className="main-card">
                <div className="card-inner">
                    <div className="platform-toggle">
                        <button
                            className={`platform-tab ${platform === "youtube" ? "platform-tab--active" : ""}`}
                            onClick={() => switchPlatform("youtube")}
                            disabled={isLoading}
                        >
                            YouTube
                        </button>
                        <button
                            className={`platform-tab ${platform === "instagram" ? "platform-tab--active" : ""}`}
                            onClick={() => switchPlatform("instagram")}
                            disabled={isLoading}
                        >
                            Instagram
                        </button>
                    </div>

                    <div className="input-wrapper">
                        <span className="section-label">
                            {platform === "instagram"
                                ? "reel url"
                                : "video url"}
                        </span>
                        <div className="input-row">
                            <input
                                type="text"
                                className="url-input"
                                placeholder={
                                    platform === "instagram"
                                        ? "https://instagram.com/reel/..."
                                        : "https://youtube.com/watch?v=..."
                                }
                                value={url}
                                onChange={handleInputChange}
                                onPaste={handlePaste}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                autoFocus
                                spellCheck={false}
                            />
                            <button
                                className="fetch-btn"
                                onClick={() =>
                                    url.trim() && fetchInfo(url.trim())
                                }
                                disabled={!url.trim() || isLoading}
                                title="Fetch info"
                            >
                                <ArrowIcon />
                            </button>
                        </div>
                    </div>

                    {info && (
                        <>
                            <div className="divider" />
                            <div className="preview">
                                <div className="preview-thumb-wrap">
                                    <img
                                        className="preview-thumb"
                                        src={info.thumbnail}
                                        alt={info.title}
                                    />
                                    <span className="preview-duration-badge">
                                        {formatDuration(info.duration)}
                                    </span>
                                </div>
                                <div className="preview-info">
                                    <div className="preview-title">
                                        {info.title}
                                    </div>
                                    <div className="preview-author">
                                        <span>{info.author}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="actions">
                        {platform === "instagram" ? (
                            <button
                                className="dl-btn dl-btn--video dl-btn--full"
                                onClick={() => download("video")}
                                disabled={!url.trim() || isLoading}
                            >
                                <span className="dl-btn-icon">
                                    <VideoIcon />
                                </span>
                                Download Reel
                            </button>
                        ) : (
                            <div className="actions-row">
                                <button
                                    className="dl-btn dl-btn--video"
                                    onClick={() => download("video")}
                                    disabled={!url.trim() || isLoading}
                                >
                                    <span className="dl-btn-icon">
                                        <VideoIcon />
                                    </span>
                                    MP4
                                </button>
                                <button
                                    className="dl-btn dl-btn--audio"
                                    onClick={() => download("audio")}
                                    disabled={!url.trim() || isLoading}
                                >
                                    <span className="dl-btn-icon">
                                        <AudioIcon />
                                    </span>
                                    Audio
                                </button>
                            </div>
                        )}
                    </div>

                    {status.type === "fetching" && (
                        <div className="status-bar status-bar--loading">
                            <div className="spinner" />
                            fetching video info...
                        </div>
                    )}

                    {status.type === "downloading" && (
                        <div className="status-bar status-bar--loading">
                            <div className="spinner" />
                            downloading {status.format.toLowerCase()}...
                        </div>
                    )}

                    {status.type === "success" && (
                        <div className="status-bar status-bar--success">
                            {status.message}
                        </div>
                    )}

                    {status.type === "error" && (
                        <div className="status-bar status-bar--error">
                            {status.message}
                        </div>
                    )}
                </div>
            </div>

            <footer className="footer">
                <div className="footer-hint">
                    paste a link <span className="kbd">enter</span> to fetch
                </div>
            </footer>
        </div>
    );
}

export default App;
