import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  get nexconnAppKey() {
    return required("NEXCONN_APP_KEY");
  },
  get nexconnAppSecret() {
    return required("NEXCONN_APP_SECRET");
  },
  get nexconnApiBase() {
    return process.env.NEXCONN_API_BASE || "https://api.sg-light-api.com";
  },
  get idPrefix() {
    return (process.env.NEXCONN_ID_PREFIX || "lgc").replace(/[^a-zA-Z0-9]/g, "");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get geminiKey() {
    return process.env.GEMINI_API_KEY || "";
  },
  get geminiModels(): string[] {
    return [process.env.GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODEL].filter((m): m is string => !!m);
  },
};
