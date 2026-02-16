import { loadEnvFile } from "./env";
import { loadConfig } from "./config";
import { HisClient } from "./his-client";
import { toWardPayload } from "./mapper";
import { postJson } from "./sender";
import { getHisQuery } from "./his-query";
import * as logger from "./logger";
import { RawWardRow } from "./types";

loadEnvFile();

const config = loadConfig();
const hisClient = new HisClient({
  dbType: config.hisDbType,
  db: config.hisDb
});
const hisQuery = getHisQuery(config.hisProfile);
const runOnce = process.argv.includes("--once");
let sending = false;
let draining = false;
let pendingRound = false;
let intervalHandle: NodeJS.Timeout | null = null;
let startupTimerHandle: NodeJS.Timeout | null = null;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function msUntilNextIntervalBoundary(
  intervalMinutes: number,
  offsetMinutes: number
): number {
  const now = new Date();
  const safeIntervalMinutes = Math.max(1, intervalMinutes);
  const normalizedOffset =
    ((Math.floor(offsetMinutes) % safeIntervalMinutes) + safeIntervalMinutes) %
    safeIntervalMinutes;
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const baseMinutes = currentTotalMinutes - normalizedOffset;
  const nextTotalMinutes =
    Math.floor(baseMinutes / safeIntervalMinutes) * safeIntervalMinutes +
    safeIntervalMinutes +
    normalizedOffset;
  const next = new Date(now);
  next.setHours(0, 0, 0, 0);
  next.setMinutes(nextTotalMinutes, 0, 0);
  return next.getTime() - now.getTime();
}

async function sendCurrentSnapshot() {
  sending = true;
  try {
    logger.info(`Start round for hcode=${config.hcode}`);

    const rows = await hisClient.fetchWardRows<RawWardRow>(hisQuery);
    const ward = toWardPayload(rows);

    const payload = {
      hcode: config.hcode,
      ward,
      latitude: config.latitude,
      longitude: config.longitude
    };

    let attempt = 0;
    let lastError: unknown = null;
    const maxAttempts = Math.max(1, config.retryCount + 1);

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const result = await postJson<Record<string, unknown>>(
          config.apiReceiveUrl,
          payload,
          config.requestTimeoutMs,
          {
            Authorization: `Bearer ${config.hcodeToken}`
          }
        );

        if (!result.ok) {
          throw new Error(
            `API ${result.status}: ${typeof result.data === "string" ? result.data : JSON.stringify(result.data)}`
          );
        }

        logger.info(
          `Success hcode=${config.hcode}, wards=${ward.length}, response=${JSON.stringify(result.data)}`
        );
        return;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${msg}`);
        if (attempt < maxAttempts) {
          await sleep(config.retryDelayMs);
        }
      }
    }

    throw lastError ?? new Error("Unknown send error");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Round failed for hcode=${config.hcode}: ${msg}`);
  } finally {
    sending = false;
  }
}

function requestSend(trigger: string) {
  if (sending || draining) {
    if (!pendingRound) {
      logger.warn(`Round in progress. Queue pending round (trigger=${trigger}).`);
    }
    pendingRound = true;
    return;
  }

  draining = true;
  void (async () => {
    try {
      do {
        pendingRound = false;
        await sendCurrentSnapshot();
        if (pendingRound) {
          logger.info("Run queued pending round immediately.");
        }
      } while (pendingRound);
    } finally {
      draining = false;
    }
  })();
}

function startScheduler() {
  const safeIntervalMinutes = Math.max(1, config.sendIntervalMinutes);
  const safeOffsetMinutes = Math.max(0, config.sendOffsetMinutes);
  const intervalMs = safeIntervalMinutes * 60 * 1000;
  const firstDelayMs = msUntilNextIntervalBoundary(
    safeIntervalMinutes,
    safeOffsetMinutes
  );

  logger.info(
    `Connector started. his=${config.hisName}, profile=${config.hisProfile}, dbType=${config.hisDbType}, hcode=${config.hcode}, interval=${config.sendIntervalMinutes}m, offset=${safeOffsetMinutes}m, target=${config.apiReceiveUrl}`
  );
  requestSend("startup-immediate");
  logger.info(
    `First scheduled send in ${Math.ceil(firstDelayMs / 1000)}s (aligned to ${safeIntervalMinutes}-minute boundary + ${safeOffsetMinutes}m)`
  );

  startupTimerHandle = setTimeout(() => {
    requestSend("startup-schedule");
    intervalHandle = setInterval(() => {
      requestSend("interval");
    }, intervalMs);
  }, firstDelayMs);
}

async function shutdown() {
  logger.info("Stopping connector...");
  if (startupTimerHandle) {
    clearTimeout(startupTimerHandle);
    startupTimerHandle = null;
  }
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  await hisClient.close();
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

if (runOnce) {
  void sendCurrentSnapshot()
    .finally(async () => {
      await hisClient.close();
    })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  startScheduler();
}
