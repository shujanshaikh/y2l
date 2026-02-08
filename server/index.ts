import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";

// Validate YouTube URL
function isValidYouTubeUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return (
            (u.hostname === "www.youtube.com" ||
                u.hostname === "youtube.com" ||
                u.hostname === "youtu.be" ||
                u.hostname === "m.youtube.com") &&
            url.length < 200
        );
    } catch {
        return false;
    }
}

// Validate Instagram URL
function isValidInstagramUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return (
            (u.hostname === "instagram.com" ||
                u.hostname === "www.instagram.com") &&
            (u.pathname.startsWith("/reel/") || u.pathname.startsWith("/p/")) &&
            url.length < 200
        );
    } catch {
        return false;
    }
}

const urlBody = t.Object({ url: t.String() });

const app = new Elysia()
    .use(cors({ exposeHeaders: ["Content-Disposition"] }))
    .get("/", () => ({ status: "ok", message: "y2l server running" }))

    // Get video info
    .post(
        "/api/info",
        async ({ body, set }) => {
            try {
                const { url } = body;

                if (!url || !isValidYouTubeUrl(url)) {
                    set.status = 400;
                    return { error: "Invalid YouTube URL" };
                }

                const proc = Bun.spawn(
                    ["yt-dlp", "--dump-json", "--no-playlist", "--js-runtimes", "nodejs:bun", url],
                    { stdout: "pipe", stderr: "pipe" },
                );

                const output = await new Response(proc.stdout).text();
                const exitCode = await proc.exited;

                if (exitCode !== 0) {
                    const errText = await new Response(proc.stderr).text();
                    console.error("yt-dlp info error:", errText);
                    set.status = 500;
                    return { error: "Failed to fetch video info" };
                }

                const data = JSON.parse(output);

                return {
                    title: data.title,
                    duration: data.duration ?? 0,
                    thumbnail: data.thumbnail ?? "",
                    author: data.uploader ?? data.channel ?? "",
                };
            } catch (err: any) {
                console.error("Info error:", err.message);
                set.status = 500;
                return { error: "Failed to fetch video info" };
            }
        },
        { body: urlBody },
    )

    // Download video as MP4
    .post(
        "/api/download/video",
        async ({ body, set }) => {
            try {
                const { url } = body;

                if (!url || !isValidYouTubeUrl(url)) {
                    set.status = 400;
                    return { error: "Invalid YouTube URL" };
                }

                // Get title first
                const infoProc = Bun.spawn(
                    ["yt-dlp", "--print", "title", "--no-playlist", "--js-runtimes", "nodejs:bun", url],
                    { stdout: "pipe", stderr: "pipe" },
                );
                const title = (
                    await new Response(infoProc.stdout).text()
                ).trim();
                await infoProc.exited;

                const safeName = (title || "video")
                    .replace(/[^\w\s-]/g, "")
                    .trim()
                    .slice(0, 100);

                // Stream video to stdout
                const proc = Bun.spawn(
                    [
                        "yt-dlp",
                        "-f",
                        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                        "--merge-output-format",
                        "mp4",
                        "--no-playlist",
                        "--js-runtimes",
                        "nodejs:bun",
                        "-o",
                        "-",
                        url,
                    ],
                    { stdout: "pipe", stderr: "pipe" },
                );

                return new Response(proc.stdout as ReadableStream, {
                    headers: {
                        "Content-Type": "video/mp4",
                        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}.mp4"`,
                    },
                });
            } catch (err: any) {
                console.error("Download video error:", err.message);
                set.status = 500;
                return { error: "Failed to download video" };
            }
        },
        { body: urlBody },
    )

    // Download audio
    .post(
        "/api/download/audio",
        async ({ body, set }) => {
            try {
                const { url } = body;

                if (!url || !isValidYouTubeUrl(url)) {
                    set.status = 400;
                    return { error: "Invalid YouTube URL" };
                }

                // Get title first
                const infoProc = Bun.spawn(
                    ["yt-dlp", "--print", "title", "--no-playlist", "--js-runtimes", "nodejs:bun", url],
                    { stdout: "pipe", stderr: "pipe" },
                );
                const title = (
                    await new Response(infoProc.stdout).text()
                ).trim();
                await infoProc.exited;

                const safeName = (title || "audio")
                    .replace(/[^\w\s-]/g, "")
                    .trim()
                    .slice(0, 100);

                // Stream best audio to stdout
                const proc = Bun.spawn(
                    [
                        "yt-dlp",
                        "-f",
                        "bestaudio",
                        "--no-playlist",
                        "--js-runtimes",
                        "nodejs:bun",
                        "-o",
                        "-",
                        url,
                    ],
                    { stdout: "pipe", stderr: "pipe" },
                );

                return new Response(proc.stdout as ReadableStream, {
                    headers: {
                        "Content-Type": "audio/webm",
                        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}.webm"`,
                    },
                });
            } catch (err: any) {
                console.error("Download audio error:", err.message);
                set.status = 500;
                return { error: "Failed to download audio" };
            }
        },
        { body: urlBody },
    )

    // Get Instagram reel info
    .post(
        "/api/instagram/info",
        async ({ body, set }) => {
            try {
                const { url } = body;

                if (!url || !isValidInstagramUrl(url)) {
                    set.status = 400;
                    return { error: "Invalid Instagram URL" };
                }

                const proc = Bun.spawn(
                    ["yt-dlp", "--dump-json", "--no-playlist", "--js-runtimes", "nodejs:bun", url],
                    { stdout: "pipe", stderr: "pipe" },
                );

                const output = await new Response(proc.stdout).text();
                const exitCode = await proc.exited;

                if (exitCode !== 0) {
                    const errText = await new Response(proc.stderr).text();
                    console.error("yt-dlp instagram info error:", errText);
                    set.status = 500;
                    return { error: "Failed to fetch reel info" };
                }

                const data = JSON.parse(output);

                return {
                    title:
                        data.title ??
                        data.description?.slice(0, 100) ??
                        "Instagram Reel",
                    duration: data.duration ?? 0,
                    thumbnail: data.thumbnail ?? "",
                    author: data.uploader ?? data.channel ?? "",
                };
            } catch (err: any) {
                console.error("Instagram info error:", err.message);
                set.status = 500;
                return { error: "Failed to fetch reel info" };
            }
        },
        { body: urlBody },
    )

    // Download Instagram reel as MP4
    .post(
        "/api/instagram/download",
        async ({ body, set }) => {
            try {
                const { url } = body;

                if (!url || !isValidInstagramUrl(url)) {
                    set.status = 400;
                    return { error: "Invalid Instagram URL" };
                }

                // Get title first
                const infoProc = Bun.spawn(
                    ["yt-dlp", "--print", "title", "--no-playlist", "--js-runtimes", "nodejs:bun", url],
                    { stdout: "pipe", stderr: "pipe" },
                );
                const title = (
                    await new Response(infoProc.stdout).text()
                ).trim();
                await infoProc.exited;

                const safeName = (title || "reel")
                    .replace(/[^\w\s-]/g, "")
                    .trim()
                    .slice(0, 100);

                const proc = Bun.spawn(
                    [
                        "yt-dlp",
                        "-f",
                        "best[ext=mp4]/best",
                        "--no-playlist",
                        "--js-runtimes",
                        "nodejs:bun",
                        "-o",
                        "-",
                        url,
                    ],
                    { stdout: "pipe", stderr: "pipe" },
                );

                return new Response(proc.stdout as ReadableStream, {
                    headers: {
                        "Content-Type": "video/mp4",
                        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}.mp4"`,
                    },
                });
            } catch (err: any) {
                console.error("Instagram download error:", err.message);
                set.status = 500;
                return { error: "Failed to download reel" };
            }
        },
        { body: urlBody },
    )
    .listen({ port: Number(Bun.env.PORT ?? 3000), hostname: "0.0.0.0" });

console.log(` y2l is running at ${app.server?.hostname}:${app.server?.port}`);
