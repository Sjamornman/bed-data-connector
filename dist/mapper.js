"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toWardPayload = toWardPayload;
function toInt(value, name, rowIndex) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
        throw new Error(`Invalid ${name} at row ${rowIndex + 1}: ${String(value)}`);
    }
    return Math.floor(n);
}
function toWardPayload(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("HIS query returned empty rows.");
    }
    return rows.map((row, idx) => {
        if (!row.ward_id || !row.ward_name) {
            throw new Error(`Missing ward_id or ward_name at row ${idx + 1}`);
        }
        return {
            ward_id: String(row.ward_id),
            ward_name: String(row.ward_name),
            bed_actual: toInt(row.bed_actual, "bed_actual", idx),
            patient_actual: toInt(row.patient_actual, "patient_actual", idx)
        };
    });
}
