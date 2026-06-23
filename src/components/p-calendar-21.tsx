"use client";

import {
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
  startOfDay,
} from "date-fns";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type PresetCalendarProps = {
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  className?: string;
  disabled?: { after: Date }[];
};

const presetLabels = {
  today: "Hoy",
  yesterday: "Ayer",
  last7Days: "Últimos 7 días",
  last30Days: "Últimos 30 días",
  monthToDate: "Mes actual",
  lastMonth: "Mes anterior",
  yearToDate: "Año actual",
  lastYear: "Año anterior",
};

export default function PresetCalendar({
  selected,
  onSelect,
  month,
  onMonthChange,
  className,
  disabled,
}: PresetCalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [internalMonth, setInternalMonth] = useState(today);

  const activeMonth = month ?? internalMonth;
  const setActiveMonth = onMonthChange ?? setInternalMonth;

  const applyRange = (range: DateRange) => {
    onSelect?.(range);
    setActiveMonth(range.to ?? range.from ?? today);
  };

  const presets = useMemo(
    () => ({
      today: {
        from: today,
        to: today,
      },
      yesterday: {
        from: subDays(today, 1),
        to: subDays(today, 1),
      },
      last7Days: {
        from: subDays(today, 6),
        to: today,
      },
      last30Days: {
        from: subDays(today, 29),
        to: today,
      },
      monthToDate: {
        from: startOfMonth(today),
        to: today,
      },
      lastMonth: {
        from: startOfMonth(subMonths(today, 1)),
        to: endOfMonth(subMonths(today, 1)),
      },
      yearToDate: {
        from: startOfYear(today),
        to: today,
      },
      lastYear: {
        from: startOfYear(subYears(today, 1)),
        to: endOfYear(subYears(today, 1)),
      },
    }),
    [today],
  );

  const presetButtons = [
    { key: "today", label: presetLabels.today },
    { key: "yesterday", label: presetLabels.yesterday },
    { key: "last7Days", label: presetLabels.last7Days },
    { key: "last30Days", label: presetLabels.last30Days },
    { key: "monthToDate", label: presetLabels.monthToDate },
    { key: "lastMonth", label: presetLabels.lastMonth },
    { key: "yearToDate", label: presetLabels.yearToDate },
    { key: "lastYear", label: presetLabels.lastYear },
  ] as const;

  return (
    <div className={cn("flex max-sm:flex-col", className)}>
      <div className="relative py-1 ps-1 max-sm:order-1 max-sm:border-t">
        <div className="flex h-full flex-col sm:border-e sm:pe-3">
          {presetButtons.map((preset) => (
            <Button
              key={preset.key}
              className="w-full justify-start"
              onClick={() => applyRange(presets[preset.key])}
              size="sm"
              variant="ghost"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
      <Calendar
        className="max-sm:pb-3 sm:ps-5"
        disabled={disabled}
        mode="range"
        month={activeMonth}
        onMonthChange={setActiveMonth}
        onSelect={(newDate) => {
          if (newDate) {
            onSelect?.(newDate);
          }
        }}
        selected={selected}
      />
    </div>
  );
}
