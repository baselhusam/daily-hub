import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteManyMock, upsertMock } = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    completionLog: {
      deleteMany: deleteManyMock,
      upsert: upsertMock,
    },
  },
}));

vi.mock("@/lib/revalidate", () => ({
  revalidateApp: vi.fn(),
}));

import { toggleDailyTask } from "@/app/actions/daily-tasks";

describe("toggleDailyTask", () => {
  beforeEach(() => {
    deleteManyMock.mockReset();
    upsertMock.mockReset();
  });

  it("unchecks a habit by deleting today's log", async () => {
    deleteManyMock.mockResolvedValueOnce({ count: 1 });

    expect(await toggleDailyTask("h1")).toEqual({ success: true });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("checks a habit with an upsert, so a concurrent toggle cannot collide", async () => {
    deleteManyMock.mockResolvedValueOnce({ count: 0 });

    expect(await toggleDailyTask("h1")).toEqual({ success: true });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ entityType: "DAILY_TASK", entityId: "h1" }),
        update: {},
      })
    );
  });
});
