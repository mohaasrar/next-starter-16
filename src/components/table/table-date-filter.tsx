"use client";

import { format } from "date-fns";
import React, { useEffect } from "react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Column } from "@tanstack/react-table";
import { FILTER_MODES } from "@/lib/constants";
import type { FilterColumnsValue } from "@/types";

type DataTableDateFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>;
  label: string;
  placeholder?: string;
  className?: string;
};

export function DataTableDateFilter<TData, TValue>({
  placeholder,
  label,
  column,
  className,
}: DataTableDateFilterProps<TData, TValue>) {
  const value = (column?.getFilterValue() as FilterColumnsValue<DateRange>)
    ?.value;
  const [date, setDate] = React.useState<DateRange | undefined>(value);

  useEffect(() => {
    setDate(value);
  }, [value]);

  return (
    <div className="grid space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className={cn("grid gap-2", className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "h-7 w-[260px] justify-start text-left text-xs font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>{placeholder}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(dateRange) => {
                const { from, to } = dateRange ?? {};
                if (from && to) {
                  column?.setFilterValue({
                    value: dateRange,
                    mode: FILTER_MODES.BETWEEN,
                  });
                }
                setDate(dateRange);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

