import { describe, expect, it } from "vitest";
import {
  createDailyTaskSchema,
  createProjectSchema,
  createTaskSchema,
} from "@/lib/validations";

describe("validations", () => {
  it("requires a project name", () => {
    const result = createProjectSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid hex color", () => {
    const result = createProjectSchema.safeParse({
      name: "Alpha",
      color: "#2383E2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid logo URL", () => {
    const result = createProjectSchema.safeParse({
      name: "Alpha",
      logoUrl: "ftp://example.com/logo.png",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid task dates", () => {
    const result = createTaskSchema.safeParse({
      title: "Ship",
      dueDate: "01-01-99",
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one weekday for habits", () => {
    const result = createDailyTaskSchema.safeParse({
      title: "Write",
      weekdays: [],
    });
    expect(result.success).toBe(false);
  });
});
