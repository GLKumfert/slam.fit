const DAYS = 6;
const TIME_ROWS = 8;
const ROLE_PILLS = 4;
const SIDEBAR_ROWS = 4;

export default function GridSkeleton() {
  return (
    <div className="flex gap-4 w-full">
      {/* Main grid area */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Role filter bar skeleton */}
        <div className="flex items-center gap-2">
          {Array.from({ length: ROLE_PILLS }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse h-7 rounded-full bg-[#dadada]"
              style={{ width: i === 0 ? 48 : 72 + i * 8 }}
            />
          ))}
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Sticky time-label column */}
          <div className="flex flex-col gap-px mr-1 shrink-0">
            {/* Corner spacer aligned with day header row */}
            <div className="h-8" />
            {Array.from({ length: TIME_ROWS }).map((_, i) => (
              <div key={i} className="flex items-center h-8">
                <div className="animate-pulse h-3 w-[60px] rounded bg-[#dadada]" />
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex gap-px flex-1">
            {Array.from({ length: DAYS }).map((_, col) => (
              <div key={col} className="flex flex-col gap-px flex-1 min-w-[48px]">
                {/* Sticky day header */}
                <div className="h-8 flex items-center justify-center">
                  <div className="animate-pulse h-4 w-[80px] rounded bg-[#c8c8c8]" />
                </div>

                {/* Cell rows */}
                {Array.from({ length: TIME_ROWS }).map((_, row) => (
                  <div
                    key={row}
                    className="animate-pulse h-8 min-w-[48px] rounded-sm bg-[#dadada]"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Participant sidebar skeleton */}
      <div className="w-52 shrink-0 flex flex-col gap-1 pt-10">
        {/* Header label */}
        <div className="animate-pulse h-4 w-28 rounded bg-[#c8c8c8] mb-2" />

        {Array.from({ length: SIDEBAR_ROWS }).map((_, i) => (
          <div
            key={i}
            className="border border-gray-100 rounded px-3 py-2 flex flex-col gap-1.5"
          >
            {/* Name line */}
            <div
              className="animate-pulse h-3 rounded bg-[#dadada]"
              style={{ width: `${60 + (i % 3) * 15}%` }}
            />
            {/* Role badge placeholders */}
            <div className="flex gap-1">
              <div className="animate-pulse h-4 w-14 rounded-full bg-[#dadada]" />
              {i % 2 === 0 && (
                <div className="animate-pulse h-4 w-10 rounded-full bg-[#dadada]" />
              )}
            </div>
            {/* Coverage bar */}
            <div className="animate-pulse h-1.5 w-full rounded-full bg-[#dadada]" />
          </div>
        ))}
      </div>
    </div>
  );
}
