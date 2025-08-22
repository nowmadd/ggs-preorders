"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  format,
  parse,
  isValid,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
} from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type DatePickerFieldProps = {
  label?: string;
  id?: string;
  name?: string;
  value?: string | null; // yyyy-MM-dd
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string; // yyyy-MM-dd
  max?: string; // yyyy-MM-dd
  className?: string;
  error?: string;
  allowClear?: boolean;
};

// Safe parser -> Date | undefined
function parseYMD(s?: string | null) {
  if (!s) return undefined;
  const d = parse(s, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

export default function DatePicker({
  label,
  id,
  name,
  value,
  onChange,
  placeholder = "Pick a date",
  required,
  disabled,
  min,
  max,
  className,
  error,
  allowClear = true,
}: DatePickerFieldProps) {
  const dateObj = React.useMemo(() => parseYMD(value ?? undefined), [value]);
  const minDate = React.useMemo(() => parseYMD(min), [min]);
  const maxDate = React.useMemo(() => parseYMD(max), [max]);

  const disabledFn = React.useCallback(
    (d: Date) =>
      (minDate ? isBefore(endOfDay(d), startOfDay(minDate)) : false) ||
      (maxDate ? isAfter(startOfDay(d), endOfDay(maxDate)) : false),
    [minDate, maxDate]
  );

  return (
    <div className={cn("grid gap-2", className)}>
      {label ? (
        <Label htmlFor={id}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateObj && "text-muted-foreground"
            )}
            aria-invalid={!!error}
            id={id}
            name={name}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateObj ? format(dateObj, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateObj}
            onSelect={(d) =>
              onChange?.(d ? format(d, "yyyy-MM-dd") : undefined)
            }
            disabled={disabledFn}
            initialFocus
          />
          {allowClear && value ? (
            <div className="flex justify-end p-2 pt-0">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onChange?.(undefined)}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
