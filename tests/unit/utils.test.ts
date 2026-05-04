import { describe, expect, it } from "vitest";
import { generateSlug } from "../../lib/utils/slug";
import { getHeatmapColor } from "../../lib/utils/heatmap";
import { generateTimeSlots } from "../../lib/utils/dates";
import { createSessionSchema } from "../../lib/validators/session";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

describe("generateSlug", () => {
  it("matches expected slug pattern", () => {
    const slug = generateSlug("Team Sync");
    expect(slug).toMatch(/^[a-z0-9-]+-[a-z2-9]{6}$/);
  });

  it("strips special characters from the title part", () => {
    const slug = generateSlug("My !!! Big ### Session @ 2026");
    const titlePart = slug.slice(0, slug.lastIndexOf("-"));

    expect(titlePart).toBe("my-big-session-2026");
    expect(titlePart).not.toMatch(/[^a-z0-9-]/);
  });

  it("truncates title to 40 chars before appending suffix", () => {
    const longTitle =
      "This is an intentionally very long title that should be truncated";
    const slug = generateSlug(longTitle);
    const titlePart = slug.slice(0, slug.lastIndexOf("-"));
    const expected = longTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    expect(titlePart).toHaveLength(40);
    expect(titlePart).toBe(expected);
  });

  it("produces different slugs for repeated calls with same title", () => {
    const first = generateSlug("Weekly Planning");
    const second = generateSlug("Weekly Planning");

    expect(first).not.toBe(second);
  });
});

describe("getHeatmapColor", () => {
  it("returns Darkest Navy at 0", () => {
    expect(getHeatmapColor(0)).toBe("#1c2c35");
  });

  it("returns Neon Green at 1", () => {
    expect(getHeatmapColor(1)).toBe("#b3ce3c");
  });

  it("returns a color between teal and green at 0.5", () => {
    const color = getHeatmapColor(0.5);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("clamps values below 0", () => {
    expect(getHeatmapColor(-1)).toBe(getHeatmapColor(0));
  });

  it("clamps values above 1", () => {
    expect(getHeatmapColor(2)).toBe(getHeatmapColor(1));
  });
});

describe("generateTimeSlots", () => {
  it("generates exactly 80 slots for Mon-Fri 9am-5pm, 30min in UTC", () => {
    const slots = generateTimeSlots({
      dates: [
        "2026-01-05",
        "2026-01-06",
        "2026-01-07",
        "2026-01-08",
        "2026-01-09",
      ],
      timeRange: { start: "09:00", end: "17:00" },
      granularity: 30,
      timezone: "UTC",
    });

    expect(slots).toHaveLength(80);
  });

  it("produces contiguous slots within each day (no gaps, no overlaps)", () => {
    const slots = generateTimeSlots({
      dates: [
        "2026-01-05",
        "2026-01-06",
        "2026-01-07",
        "2026-01-08",
        "2026-01-09",
      ],
      timeRange: { start: "09:00", end: "17:00" },
      granularity: 30,
      timezone: "UTC",
    });

    for (let i = 0; i < slots.length - 1; i++) {
      const currentDay = slots[i].startTime.toISOString().slice(0, 10);
      const nextDay = slots[i + 1].startTime.toISOString().slice(0, 10);

      if (currentDay === nextDay) {
        expect(slots[i].endTime.getTime()).toBe(slots[i + 1].startTime.getTime());
      }
    }
  });

  it("returns an empty array when start equals end time", () => {
    const slots = generateTimeSlots({
      dates: ["2026-01-05"],
      timeRange: { start: "09:00", end: "09:00" },
      granularity: 30,
      timezone: "UTC",
    });

    expect(slots).toEqual([]);
  });

  it("supports non-contiguous dates (Mon + Wed only)", () => {
    const slots = generateTimeSlots({
      dates: ["2026-01-05", "2026-01-07"],
      timeRange: { start: "09:00", end: "17:00" },
      granularity: 60,
      timezone: "UTC",
    });

    // 2 days × 8 hours × 1 slot/hr = 16
    expect(slots).toHaveLength(16);
  });

  it("keeps DST spring-forward slot count correct in America/New_York", () => {
    // 2026-03-08 is spring-forward day: 2:00 AM → 3:00 AM is skipped
    const slots = generateTimeSlots({
      dates: ["2026-03-08"],
      timeRange: { start: "01:00", end: "04:00" },
      granularity: 30,
      timezone: "America/New_York",
    });

    // 1:00-2:00 and 3:00-4:00 exist (4 slots); 2:00-3:00 is skipped.
    expect(slots).toHaveLength(4);
  });

  it("accepts 24:00 as end-of-day and generates the final slot correctly", () => {
    const slots = generateTimeSlots({
      dates: ["2026-01-05"],
      timeRange: { start: "23:00", end: "24:00" },
      granularity: 60,
      timezone: "UTC",
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].startTime.toISOString()).toBe("2026-01-05T23:00:00.000Z");
    expect(slots[0].endTime.toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });
});

describe("createSessionSchema", () => {
  const validInput = {
    title: "Sprint Planning",
    description: "Choose availability for sprint planning.",
    dates: ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09"],
    timeRange: { start: "09:00", end: "17:00" },
    granularity: 30 as const,
    timezone: "UTC",
    isPublic: true,
    roles: [{ name: "Engineering", color: "#3ba2bc" }],
  };

  it("accepts valid input", () => {
    const result = createSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("fails when title is missing", () => {
    const { title: _title, ...withoutTitle } = validInput;
    const result = createSessionSchema.safeParse(withoutTitle);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.format()).toLowerCase()).toContain("title");
    }
  });

  it("fails when dates array is empty", () => {
    const result = createSessionSchema.safeParse({ ...validInput, dates: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.toLowerCase().includes("at least one date"),
        ),
      ).toBe(true);
    }
  });

  it("fails when end time is before or equal to start time", () => {
    const result = createSessionSchema.safeParse({
      ...validInput,
      timeRange: { start: "17:00", end: "09:00" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.toLowerCase().includes("end time"),
        ),
      ).toBe(true);
    }
  });

  it("fails when roles array is empty", () => {
    const result = createSessionSchema.safeParse({ ...validInput, roles: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.toLowerCase().includes("at least one role"),
        ),
      ).toBe(true);
    }
  });

  it("fails when role color is not a valid hex string", () => {
    const result = createSessionSchema.safeParse({
      ...validInput,
      roles: [{ name: "Engineering", color: "blue" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.toLowerCase().includes("hex color"),
        ),
      ).toBe(true);
    }
  });

  it("accepts optional slotLabels", () => {
    const result = createSessionSchema.safeParse({
      ...validInput,
      slotLabels: [
        {
          name: "Morning Shift",
          description: "First half of the day",
          color: "#9ac5ef",
          timeRange: { start: "09:00", end: "13:00" },
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});

describe("groupSlotsByShift", () => {
  // Use inline types to avoid dependency on types.ts
  const shift1 = {
    id: "shift-1",
    name: "Game 1",
    color: null as string | null,
    sortOrder: 0,
    startTime: "2026-05-15T23:00:00.000Z",
    endTime: "2026-05-16T01:00:00.000Z",
  };
  const slots = [
    {
      id: "s1",
      startTime: "2026-05-15T23:00:00.000Z",
      endTime: "2026-05-15T23:30:00.000Z",
      labelId: "shift-1" as string | null,
    },
    {
      id: "s2",
      startTime: "2026-05-15T23:30:00.000Z",
      endTime: "2026-05-16T00:00:00.000Z",
      labelId: "shift-1" as string | null,
    },
    {
      id: "s3",
      startTime: "2026-05-16T00:30:00.000Z",
      endTime: "2026-05-16T01:00:00.000Z",
      labelId: null as string | null,
    },
  ];

  it("groups consecutive slots by label", async () => {
    const { groupSlotsByShift } = await import("../../lib/utils/shifts");
    const groups = groupSlotsByShift(slots, [shift1]);
    expect(groups).toHaveLength(2);
    expect(groups[0].label?.id).toBe("shift-1");
    expect(groups[0].slots).toHaveLength(2);
    expect(groups[1].label).toBeNull();
    expect(groups[1].slots).toHaveLength(1);
  });
});
