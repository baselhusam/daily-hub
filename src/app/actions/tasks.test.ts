import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteMock, createMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      delete: deleteMock,
      create: createMock,
    },
    project: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/revalidate", () => ({
  revalidateApp: vi.fn(),
}));

import { createTask, deleteTask } from "@/app/actions/tasks";

describe("task actions", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    createMock.mockReset();
  });

  it("returns validation errors for createTask", async () => {
    const formData = new FormData();
    formData.set("title", "");

    const result = await createTask(formData);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("maps deleteTask failures through failAction", async () => {
    deleteMock.mockRejectedValueOnce(new Error("Record not found"));

    const result = await deleteTask("missing");
    expect(result).toEqual({
      success: false,
      error: "Record not found",
    });
  });
});
