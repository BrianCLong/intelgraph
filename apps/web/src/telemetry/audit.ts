export function recordAudit(action:string, details:any){ try { console.info("[audit]", action, details); } catch {} }
