export const EXPORT_COMPRESSION = process.env.EXPORT_COMPRESSION !== "false";
export const EXPORT_SENSITIVE = process.env.ENABLE_SENSITIVE_EXPORTS === "true";

export function exportToSplunk(payload: any) {
  if (EXPORT_SENSITIVE) {
    // send full payload
  }
  // compression flag would be used here
}
