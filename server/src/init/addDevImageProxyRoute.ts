import type e from "express";
import { IS_DEV } from "./utils";

export const addDevImageProxyRoute = (app: e.Express): void => {
  if (!IS_DEV) {
    return;
  }
  app.get("/dev-proxy/image", async (req, res) => {
    const rawUrl =
      Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    if (typeof rawUrl !== "string" || !rawUrl) {
      res.status(400).send("Missing url");
      return;
    }

    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      res.status(400).send("Invalid url");
      return;
    }

    if (!["http:", "https:"].includes(target.protocol)) {
      res.status(400).send("Unsupported protocol");
      return;
    }

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);
    const maxBytes = 10 * 1024 * 1024;

    try {
      const upstream = await fetch(target.href, {
        method: "GET",
        redirect: "follow",
        signal: ac.signal,
      });

      if (!upstream.ok) {
        res.status(502).send(`Upstream error: ${upstream.status}`);
        return;
      }

      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        res.status(415).send("Upstream resource is not an image");
        return;
      }

      const declaredLength = Number(
        upstream.headers.get("content-length") || "0",
      );
      if (declaredLength > maxBytes) {
        res.status(413).send("Image too large");
        return;
      }

      const data = await upstream.arrayBuffer();
      if (data.byteLength > maxBytes) {
        res.status(413).send("Image too large");
        return;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.status(200).send(Buffer.from(data));
    } catch {
      res.status(504).send("Proxy fetch failed");
    } finally {
      clearTimeout(timeout);
    }
  });
};
