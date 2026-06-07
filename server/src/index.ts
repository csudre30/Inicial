import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { config } from "./config";
import meetingsRouter from "./routes/meetings";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", meetingsRouter);

// Servir o frontend compilado (web/dist), quando existir.
if (fs.existsSync(config.webDist)) {
  app.use(express.static(config.webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(config.webDist, "index.html"));
  });
}

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ata.gov API ouvindo na porta ${config.port}`);
});
