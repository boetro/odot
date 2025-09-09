import { useState, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { SmallButton } from "./small-button";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { parseDate } from "chrono-node";
import { Calendar } from "./ui/calendar";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const durationOptions = [
  // 15 minute increments for under 1 hour
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  // 30 minute increments for 1-4 hours
  { value: "90", label: "1 hour 30 minutes" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2 hours 30 minutes" },
  { value: "180", label: "3 hours" },
  { value: "210", label: "3 hours 30 minutes" },
  { value: "240", label: "4 hours" },
  // 1 hour increments for 4+ hours
  { value: "300", label: "5 hours" },
  { value: "360", label: "6 hours" },
  { value: "420", label: "7 hours" },
  { value: "480", label: "8 hours" },
  { value: "540", label: "9 hours" },
  { value: "600", label: "10 hours" },
  { value: "660", label: "11 hours" },
  { value: "720", label: "12 hours" },
  { value: "780", label: "13 hours" },
  { value: "840", label: "14 hours" },
  { value: "900", label: "15 hours" },
  { value: "960", label: "16 hours" },
  { value: "1020", label: "17 hours" },
  { value: "1080", label: "18 hours" },
  { value: "1140", label: "19 hours" },
  { value: "1200", label: "20 hours" },
  { value: "1260", label: "21 hours" },
  { value: "1320", label: "22 hours" },
  { value: "1380", label: "23 hours" },
];

export default function DateDropdown({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  duration,
  setDuration,
  onClose,
  variant = "small",
}: {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string | undefined;
  setSelectedTime: (time: string | undefined) => void;
  duration: string;
  setDuration: (duration: string) => void;
  onClose?: () => void;
  variant?: "small" | "large";
}) {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [value, setValue] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<Date | undefined>(selectedDate);

  useEffect(() => {
    if (selectedDate) {
      setValue(formatDate(selectedDate));
    } else {
      setValue(undefined);
    }
  }, [selectedDate]);

  // Debounced date parsing function
  const debouncedDateParse = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (inputValue: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const parsedDate = parseDate(inputValue);
          if (parsedDate) {
            // Only set the date part, preserve any existing time
            const dateOnly = new Date(parsedDate);
            dateOnly.setHours(0, 0, 0, 0);
            setSelectedDate(dateOnly);
            setMonth(dateOnly);
          } else {
            setSelectedDate(undefined);
          }
        }, 500); // 500ms debounce
      };
    })(),
    [setSelectedDate],
  );

  const combinedDateTime = (() => {
    if (!selectedDate) return undefined;

    let dateStr;

    if (variant === "large") {
      // For large variant, use more succinct format
      dateStr = selectedDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });

      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const timeStr = new Date().setHours(hours, minutes, 0, 0);
        const formattedTime = new Date(timeStr).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        });

        if (duration) {
          const durationMinutes = parseInt(duration);
          const endTime = new Date();
          endTime.setHours(hours, minutes + durationMinutes, 0, 0);
          const formattedEndTime = endTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
          });
          dateStr += `, ${formattedTime} - ${formattedEndTime}`;
        } else {
          dateStr += `, ${formattedTime}`;
        }
      } else if (duration) {
        dateStr += ` - ${
          durationOptions.find((opt) => opt.value === duration)?.label ||
          `${duration} minutes`
        }`;
      }
    } else {
      // For small variant, use original format
      dateStr = selectedDate.toLocaleDateString();

      if (selectedTime) {
        const combined = new Date(selectedDate);
        const [hours, minutes] = selectedTime.split(":").map(Number);
        combined.setHours(hours, minutes, 0, 0);
        dateStr = combined.toLocaleString();
      }

      if (duration) {
        dateStr += ` - ${
          durationOptions.find((opt) => opt.value === duration)?.label ||
          `${duration} minutes`
        }`;
      }
    }
    return dateStr;
  })();

  return (
    <Popover
      modal={true}
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen && onClose) {
          onClose();
        }
      }}
    >
      <PopoverTrigger asChild>
        {variant === "small" ? (
          <SmallButton
            className={combinedDateTime ? "[&>svg]:text-primary" : ""}
          >
            <CalendarIcon />
            {combinedDateTime || "Date"}
          </SmallButton>
        ) : (
          <button
            className={cn(
              "flex flex-row gap-4 items-center hover:bg-muted rounded-md p-1",
              combinedDateTime ? "" : "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4" />
            <span>{combinedDateTime ? combinedDateTime : "Assign a date"}</span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col p-3 overflow-y-auto gap-3"
        align="start"
      >
        <div className="flex flex-col gap-3">
          <Label htmlFor="date" className="px-1">
            Date
          </Label>
          <div className="relative flex gap-2">
            <Input
              id="date"
              value={value}
              placeholder="Tomorrow or next week"
              className="bg-background pr-10"
              onChange={(e) => {
                setValue(e.target.value);
                debouncedDateParse(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setOpen(true);
                }
              }}
            />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date-picker"
                  variant="ghost"
                  className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                >
                  <CalendarIcon className="size-3.5" />
                  <span className="sr-only">Select date</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="end"
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  captionLayout="dropdown"
                  month={month}
                  onMonthChange={setMonth}
                  onSelect={(date) => {
                    if (date) {
                      // Set only the date part, don't affect time
                      const dateOnly = new Date(date);
                      dateOnly.setHours(0, 0, 0, 0);
                      setSelectedDate(dateOnly);
                      setValue(formatDate(dateOnly));
                    } else {
                      setSelectedDate(undefined);
                      setValue(undefined);
                    }
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3">
          <Label htmlFor="date" className="px-1">
            Time
          </Label>
          <Input
            type="time"
            value={selectedTime || ""}
            onChange={(e) => {
              setSelectedTime(e.target.value || undefined);
            }}
          />
        </div>
        <Separator />
        <div className="flex flex-col gap-3">
          <Label htmlFor="date" className="px-1">
            Duration
          </Label>
          <div className="relative">
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {durationOptions.map((durationOpt) => (
                  <SelectItem key={durationOpt.value} value={durationOpt.value}>
                    {durationOpt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {duration && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-8 size-6 -translate-y-1/2"
                onClick={() => setDuration("")}
                type="button"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear selection</span>
              </Button>
            )}
          </div>
        </div>

        {selectedDate && (
          <>
            <Separator />
            <div className="text-muted-foreground px-1 text-sm">
              Your todo is scheduled for{" "}
              <span className="font-medium">{formatDate(selectedDate)}</span>
              {selectedTime && (
                <span>
                  {" "}
                  at <span className="font-medium">{selectedTime}</span>
                </span>
              )}
              {duration && (
                <span>
                  {" "}
                  for{" "}
                  <span className="font-medium">
                    {durationOptions.find((opt) => opt.value === duration)
                      ?.label || `${duration} minutes`}
                  </span>
                </span>
              )}
              .
            </div>
          </>
        )}
        {combinedDateTime && (
          <>
            <Separator />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setCalendarOpen(false);
                setValue(undefined);
                setSelectedDate(undefined);
                setSelectedTime(undefined);
                setMonth(undefined);
                setDuration("");
              }}
            >
              Clear
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
