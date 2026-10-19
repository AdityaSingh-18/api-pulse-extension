export function shouldReportHttpStatus(status: number): boolean {
  return status >= 400 && status !== 401;
}