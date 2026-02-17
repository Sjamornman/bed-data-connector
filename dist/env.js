"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnvFile = loadEnvFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function loadEnvFile() {
    const envPath = path_1.default.join(process.cwd(), ".env");
    if (!fs_1.default.existsSync(envPath)) {
        return;
    }
    const content = fs_1.default.readFileSync(envPath, "utf8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const idx = trimmed.indexOf("=");
        if (idx === -1) {
            continue;
        }
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
