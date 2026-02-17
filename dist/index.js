"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const config_1 = require("./config");
const his_client_1 = require("./his-client");
const mapper_1 = require("./mapper");
const sender_1 = require("./sender");
const his_query_1 = require("./his-query");
const logger = __importStar(require("./logger"));
(0, env_1.loadEnvFile)();
const config = (0, config_1.loadConfig)();
const hisClient = new his_client_1.HisClient({
    dbType: config.hisDbType,
    db: config.hisDb
});
const hisQuery = (0, his_query_1.getHisQuery)(config.hisProfile);
const runOnce = process.argv.includes("--once");
let sending = false;
let draining = false;
let pendingRound = false;
let intervalHandle = null;
let startupTimerHandle = null;
function summarizeTarget(url) {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function msUntilNextIntervalBoundary(intervalMinutes, offsetMinutes) {
    const now = new Date();
    const safeIntervalMinutes = Math.max(1, intervalMinutes);
    const normalizedOffset = ((Math.floor(offsetMinutes) % safeIntervalMinutes) + safeIntervalMinutes) %
        safeIntervalMinutes;
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const baseMinutes = currentTotalMinutes - normalizedOffset;
    const nextTotalMinutes = Math.floor(baseMinutes / safeIntervalMinutes) * safeIntervalMinutes +
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
        const rows = await hisClient.fetchWardRows(hisQuery);
        const ward = (0, mapper_1.toWardPayload)(rows);
        const payload = {
            hcode: config.hcode,
            ward,
            latitude: config.latitude,
            longitude: config.longitude
        };
        let attempt = 0;
        let lastError = null;
        const maxAttempts = Math.max(1, config.retryCount + 1);
        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                const result = await (0, sender_1.postJson)(config.apiReceiveUrl, payload, config.requestTimeoutMs, {
                    Authorization: `Bearer ${config.hcodeToken}`
                });
                if (!result.ok) {
                    throw new Error(`API ${result.status}`);
                }
                logger.info(`Success hcode=${config.hcode}, wards=${ward.length}, status=${result.status}`);
                return;
            }
            catch (error) {
                lastError = error;
                const msg = error instanceof Error ? error.message : String(error);
                logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${msg}`);
                if (attempt < maxAttempts) {
                    await sleep(config.retryDelayMs);
                }
            }
        }
        throw lastError ?? new Error("Unknown send error");
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Round failed for hcode=${config.hcode}: ${msg}`);
    }
    finally {
        sending = false;
    }
}
function requestSend(trigger) {
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
        }
        finally {
            draining = false;
        }
    })();
}
function startScheduler() {
    const safeIntervalMinutes = Math.max(1, config.sendIntervalMinutes);
    const safeOffsetMinutes = Math.max(0, config.sendOffsetMinutes);
    const intervalMs = safeIntervalMinutes * 60 * 1000;
    const firstDelayMs = msUntilNextIntervalBoundary(safeIntervalMinutes, safeOffsetMinutes);
    logger.info(`Connector started. his=${config.hisName}, profile=${config.hisProfile}, dbType=${config.hisDbType}, hcode=${config.hcode}, interval=${config.sendIntervalMinutes}m, offset=${safeOffsetMinutes}m, target=${summarizeTarget(config.apiReceiveUrl)}`);
    requestSend("startup-immediate");
    logger.info(`First scheduled send in ${Math.ceil(firstDelayMs / 1000)}s (aligned to ${safeIntervalMinutes}-minute boundary + ${safeOffsetMinutes}m)`);
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
}
else {
    startScheduler();
}
