import * as React from "react";
import { format, subDays, subWeeks, subMonths, subQuarters, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRangePreset {
  label: string;
  value: string;
  getRange: () => DateRange;
}

const today = new Date();

export const dateRangePresets: DateRangePreset[] = [
  {
    label: "Today",
    value: "today",
    getRange: () => ({ from: today, to: today }),
  },
  {
    label: "Yesterday",
    value: "yesterday",
    getRange: () => {
      const yesterday = subDays(today, 1);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    label: "Last 7 days",
    value: "last7days",
    getRange: () => ({ from: subDays(today, 6), to: today }),
  },
  {
    label: "Last 14 days",
    value: "last14days",
    getRange: () => ({ from: subDays(today, 13), to: today }),
  },
  {
    label: "Last 30 days",
    value: "last30days",
    getRange: () => ({ from: subDays(today, 29), to: today }),
  },
  {
    label: "This Week",
    value: "thisweek",
    getRange: () => ({ from: startOfWeek(today, { weekStartsOn: 1 }), to: today }),
  },
  {
    label: "Last Week",
    value: "lastweek",
    getRange: () => {
      const lastWeek = subWeeks(today, 1);
      return { 
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }), 
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }) 
      };
    },
  },
  {
    label: "This Month",
    value: "thismonth",
    getRange: () => ({ from: startOfMonth(today), to: today }),
  },
  {
    label: "Last Month",
    value: "lastmonth",
    getRange: () => {
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
  {
    label: "This Quarter",
    value: "thisquarter",
    getRange: () => ({ from: startOfQuarter(today), to: today }),
  },
  {
    label: "Last Quarter",
    value: "lastquarter",
    getRange: () => {
      const lastQuarter = subQuarters(today, 1);
      return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
    },
  },
  {
    label: "This Year",
    value: "thisyear",
    getRange: () => ({ from: startOfYear(today), to: today }),
  },
];

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  selectedPreset: string | null;
  onPresetChange: (preset: string | null) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  selectedPreset,
  onPresetChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handlePresetClick = (preset: DateRangePreset) => {
    onPresetChange(preset.value);
    onDateRangeChange(preset.getRange());
    setOpen(false);
  };

  const handleCustomRange = (range: DateRange | undefined) => {
    onPresetChange(null);
    onDateRangeChange(range);
  };

  const displayLabel = React.useMemo(() => {
    if (selectedPreset) {
      const preset = dateRangePresets.find(p => p.value === selectedPreset);
      return preset?.label || "Select Range";
    }
    if (dateRange?.from && dateRange?.to) {
      if (format(dateRange.from, "LLL dd, y") === format(dateRange.to, "LLL dd, y")) {
        return format(dateRange.from, "LLL dd, y");
      }
      return `${format(dateRange.from, "LLL dd")} - ${format(dateRange.to, "LLL dd, y")}`;
    }
    return "Select Range";
  }, [selectedPreset, dateRange]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Quick preset buttons */}
      <div className="hidden md:flex gap-1">
        {["last7days", "last30days", "thismonth", "lastquarter"].map((presetValue) => {
          const preset = dateRangePresets.find(p => p.value === presetValue)!;
          return (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                selectedPreset === preset.value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Date range popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal rounded-full",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{displayLabel}</span>
            <span className="sm:hidden">Range</span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col w-[280px]">
            {/* Presets - horizontal scrollable row */}
            <div className="border-b p-2">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1">Quick Select</p>
              <div className="flex flex-wrap gap-1">
                {dateRangePresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "px-2 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap",
                      selectedPreset === preset.value
                        ? "bg-foreground text-background"
                        : "bg-muted/60 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Calendar */}
            <div className="p-2">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Custom Range</p>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleCustomRange}
                numberOfMonths={1}
                className="pointer-events-auto text-xs"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
