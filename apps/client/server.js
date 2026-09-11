// Render の Web Service でビルド済みの apps/client/dist を配信するための
// 依存パッケージ無しの軽量静的サーバー。SPAのため、存在しないパスは
// index.html へフォールバックする。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const port = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

if (!fs.existsSync(distDir)) {
  console.error(
    `[astral-archive] dist ディレクトリが見つかりません: ${distDir}\n` +
      `先に "npm run build" を実行してビルド出力を生成してください。`
  );
  process.exit(1);
}

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    let filePath = path.join(distDir, decodeURIComponent(requestUrl.pathname));

    // ディレクトリトラバーサル対策：dist配下からの逸脱を拒否する
    if (!filePath.startsWith(distDir)) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }

    fs.stat(filePath, (statErr, stats) => {
      if (statErr || !stats.isFile()) {
        // 見つからないパスはSPAとしてindex.htmlへフォールバックする
        filePath = path.join(distDir, "index.html");
      }

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Internal server error");
          return;
        }
        const contentType = MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      });
    });
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
  }
});

server.listen(port, () => {
  console.log(`[astral-archive] listening on port ${port}`);
});
