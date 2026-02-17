"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postJson = postJson;
async function postJson(url, body, timeoutMs, headers = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        const text = await response.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        }
        catch {
            data = text;
        }
        return {
            ok: response.ok,
            status: response.status,
            data
        };
    }
    finally {
        clearTimeout(timer);
    }
}
