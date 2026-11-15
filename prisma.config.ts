import dotenv from "dotenv";

// Prioritize .env.local (Next.js convention), fallback to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma",
});
