export function withSpan<T>(name:string, fn:()=>T){ const t0=performance.now(); const r=fn(); console.debug(`[span] ${name} ${(performance.now()-t0).toFixed(1)}ms`); return r; }
