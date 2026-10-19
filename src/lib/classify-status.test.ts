import { describe, expect, it } from "vitest";
import { shouldReportHttpStatus } from "./classify-status";

describe("shouldReportHttpStatus", () => {
  it.each([200, 201, 204, 301, 302, 304, 401])(
    "does not report status %i by default",
    (status) => {
      expect(shouldReportHttpStatus(status)).toBe(false);
    }
  );

  it.each([400, 403, 404, 429, 500, 501, 502, 503, 504])(
    "reports status %i",
    (status) => {
      expect(shouldReportHttpStatus(status)).toBe(true);
    }
  );
});