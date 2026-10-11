import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteMock,
  createMock,
  findUniqueMock,
  updateMock,
  logDeleteManyMock,
  logUpsertMock,
} = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  createMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  logDeleteManyMock: vi.fn(),
  logUpsertMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      delete: deleteMock,
      create: createMock,
      findUnique: findUniqueMock,
      update: updateMock,
    },
    project: {
      findUnique: vi.fn(),
    },
    completionLog: {
      deleteMany: logDeleteManyMock,
      upsert: logUpsertMock,
    },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

vi.mock("@/lib/project-activity", () => ({
  touchProjects: vi.fn(),
}));

vi.mock("@/lib/revalidate", () => ({
  revalidateApp: vi.fn(),
}));

import { createTask, deleteTask, toggleTask } from "@/app/actions/tasks";

describe("task actions", () => {
  beforeEach(() => {
    for (const mock of [
      deleteMock,
      createMock,
      findUniqueMock,
      updateMock,
      logDeleteManyMock,
      logUpsertMock,
    ]) {
      mock.mockReset();
    }
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

  it("clears every completion log when a task is reopened on a later day", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "t1",
      status: "DONE",
      projectId: null,
      completedAt: new Date(2026, 9, 5, 14, 0),
      estimatedMinutes: null,
    });

    const result = await toggleTask("t1");

    expect(result).toEqual({ success: true });
    expect(logDeleteManyMock).toHaveBeenCalledWith({
      where: { entityType: "TASK", entityId: "t1" },
    });
  });
});
