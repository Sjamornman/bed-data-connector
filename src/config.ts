import { ConnectorConfig } from "./types";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

function numberWithDefault(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric env ${name}: ${raw}`);
  }
  return value;
}

function optionalNumber(name: string): number | null {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric env ${name}: ${raw}`);
  }
  return value;
}

function dbType(name: string): "mysql" | "mariadb" | "postgres" {
  const value = required(name).toLowerCase();
  if (value === "mysql" || value === "mariadb" || value === "postgres") {
    return value;
  }
  throw new Error(`Invalid ${name}: ${value}. Allowed: mysql, mariadb, postgres`);
}

function hisProfile(name: string): "hosxp_v3" | "hosxp_v4" {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") {
    const hisName = (process.env.HIS_NAME ?? "").toLowerCase();
    if (hisName.includes("v4")) {
      return "hosxp_v4";
    }
    return "hosxp_v3";
  }

  const value = raw.toLowerCase().trim();
  if (value === "hosxp_v3" || value === "hosxp_v4") {
    return value;
  }
  throw new Error(`Invalid ${name}: ${value}. Allowed: hosxp_v3, hosxp_v4`);
}

export function loadConfig(): ConnectorConfig {
  return {
    apiReceiveUrl: required("API_RECEIVE_URL"),
    hcode: required("HCODE"),
    hcodeToken: required("HCODE_TOKEN"),
    hisName: required("HIS_NAME"),
    hisDbType: dbType("HIS_DB_TYPE"),
    hisProfile: hisProfile("HIS_PROFILE"),
    hisDb: {
      host: required("HIS_DB_HOST"),
      port: numberWithDefault("HIS_DB_PORT", 3306),
      user: required("HIS_DB_USER"),
      password: process.env.HIS_DB_PASSWORD ?? "",
      database: required("HIS_DB_NAME")
    },
    sendIntervalMinutes: numberWithDefault("SEND_INTERVAL_MINUTES", 30),
    sendOffsetMinutes: numberWithDefault("SEND_OFFSET_MINUTES", 5),
    requestTimeoutMs: numberWithDefault("REQUEST_TIMEOUT_MS", 20000),
    retryCount: numberWithDefault("RETRY_COUNT", 2),
    retryDelayMs: numberWithDefault("RETRY_DELAY_MS", 3000),
    latitude: optionalNumber("LATITUDE"),
    longitude: optionalNumber("LONGITUDE")
  };
}
