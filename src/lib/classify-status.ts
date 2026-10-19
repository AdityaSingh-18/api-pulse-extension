export function shouldReportHttpStatus(
  status: number,
  ignoredStatusCodes: readonly number[] = [401],
): boolean {
  return (
    status >= 400 &&
    status <= 599 &&
    !ignoredStatusCodes.includes(status)
  );
}