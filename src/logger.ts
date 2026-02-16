function nowIso() {
  return new Date().toISOString();
}

export function info(message: string) {
  console.log(`[${nowIso()}] INFO  ${message}`);
}

export function warn(message: string) {
  console.warn(`[${nowIso()}] WARN  ${message}`);
}

export function error(message: string) {
  console.error(`[${nowIso()}] ERROR ${message}`);
}
