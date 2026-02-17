"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
exports.warn = warn;
exports.error = error;
function nowIso() {
    return new Date().toISOString();
}
function info(message) {
    console.log(`[${nowIso()}] INFO  ${message}`);
}
function warn(message) {
    console.warn(`[${nowIso()}] WARN  ${message}`);
}
function error(message) {
    console.error(`[${nowIso()}] ERROR ${message}`);
}
