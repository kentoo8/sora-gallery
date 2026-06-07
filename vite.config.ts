import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), mockLikesApi()],
});

type LikeAction = "like" | "unlike";
type DevRequest = {
  method?: string;
  setEncoding(encoding: string): void;
  on(event: "data", listener: (chunk: string) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
};
type DevResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
};

const likes = new Map<string, number>();

function mockLikesApi(): Plugin {
  return {
    name: "mock-likes-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/likes", async (request, response) => {
        const devRequest = request as unknown as DevRequest;
        const devResponse = response as unknown as DevResponse;

        try {
          if (devRequest.method === "GET") {
            sendJson(devResponse, 200, {
              likes: Object.fromEntries(likes),
            });
            return;
          }

          if (devRequest.method === "POST") {
            const body = await readJsonBody(devRequest);
            const videoId = normalizeVideoId(body?.video_id);
            const action = normalizeLikeAction(body?.action);

            if (!videoId) {
              sendJson(devResponse, 400, { error: "Invalid video_id parameter" });
              return;
            }

            if (!action) {
              sendJson(devResponse, 400, { error: "Invalid action parameter" });
              return;
            }

            const currentCount = likes.get(videoId) ?? 0;
            const newCount =
              action === "like" ? currentCount + 1 : Math.max(0, currentCount - 1);
            likes.set(videoId, newCount);

            sendJson(devResponse, 200, {
              success: true,
              action,
              video_id: videoId,
              new_count: newCount,
            });
            return;
          }

          sendJson(devResponse, 405, { error: "Method not allowed" });
        } catch (error) {
          sendJson(devResponse, 500, {
            error: error instanceof Error ? error.message : "Mock likes API error",
          });
        }
      });
    },
  };
}

function normalizeVideoId(videoId: unknown) {
  if (typeof videoId !== "string") return null;
  const trimmed = videoId.trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(trimmed) ? trimmed : null;
}

function normalizeLikeAction(action: unknown): LikeAction | null {
  if (action === undefined || action === "like") return "like";
  if (action === "unlike") return "unlike";
  return null;
}

function readJsonBody(request: DevRequest): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    let source = "";

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      source += chunk;
    });
    request.on("end", () => {
      try {
        const parsed = source ? JSON.parse(source) : null;
        resolve(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null);
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response: DevResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}
