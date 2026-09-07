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

  it("accepts a valid colorSource and defaults to auto", () => {
    const withManual = createProjectSchema.safeParse({
      name: "Alpha",
      colorSource: "manual",
    });
    expect(withManual.success).toBe(true);
    if (withManual.success) expect(withManual.data.colorSource).toBe("manual");

    const withoutSource = createProjectSchema.safeParse({ name: "Alpha" });
    expect(withoutSource.success).toBe(true);
    if (withoutSource.success) expect(withoutSource.data.colorSource).toBe("auto");
  });

  it("rejects an invalid colorSource", () => {
    const result = createProjectSchema.safeParse({
      name: "Alpha",
      colorSource: "computed",
    });
    expect(result.success).toBe(false);
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
