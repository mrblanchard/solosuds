"use client";

import { useState, useMemo } from "react";
import Picker, { PickerValue } from "react-mobile-picker";
import { CalendarDays } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(month: string, year: number) {
  const monthIndex = MONTHS.indexOf(month);
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseDateString(value: string): PickerValue {
  if (value) {
    const [y, m, d] = value.split("-").map(Number);
    if (y && m && d) {
      return { month: MONTHS[m - 1], day: String(d), year: String(y) };
    }
  }
  const today = new Date();
  return {
    month: MONTHS[today.getMonth()],
    day: String(today.getDate()),
    year: String(today.getFullYear()),
  };
}

function toDateString(pickerVal: PickerValue): string {
  const monthIndex = MONTHS.indexOf(pickerVal.month as string);
  const day = String(pickerVal.day).padStart(2, "0");
  const month = String(monthIndex + 1).padStart(2, "0");
  return `${pickerVal.year}-${month}-${day}`;
}

interface DateWheelPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateWheelPicker({
  value,
  onChange,
  placeholder = "Select date",
}: DateWheelPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerVal, setPickerVal] = useState<PickerValue>(() =>
    parseDateString(value)
  );

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 120 }, (_, i) => String(currentYear - i)),
    [currentYear]
  );

  const daysInMonth = getDaysInMonth(
    pickerVal.month as string,
    Number(pickerVal.year)
  );
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
    [daysInMonth]
  );

  function handleChange(newVal: PickerValue) {
    const newMonthDays = getDaysInMonth(
      newVal.month as string,
      Number(newVal.year)
    );
    const clampedDay = Math.min(Number(newVal.day), newMonthDays);
    setPickerVal({ ...newVal, day: String(clampedDay) });
  }

  function handleOpen() {
    setPickerVal(parseDateString(value));
    setOpen(true);
  }

  function handleDone() {
    onChange(toDateString(pickerVal));
    setOpen(false);
  }

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : placeholder;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {displayValue}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <button
                type="button"
                className="text-sm text-gray-500"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <span className="text-sm font-semibold text-gray-900">
                Select Date
              </span>
              <button
                type="button"
                className="text-sm font-semibold text-indigo-600"
                onClick={handleDone}
              >
                Done
              </button>
            </div>

            {/* Picker */}
            <div className="px-2 py-3">
              <Picker
                value={pickerVal}
                onChange={handleChange}
                height={220}
                itemHeight={44}
                wheelMode="natural"
                className="w-full"
              >
                <Picker.Column name="month">
                  {MONTHS.map((m) => (
                    <Picker.Item key={m} value={m}>
                      {({ selected }) => (
                        <div
                          className={`text-center transition-all ${
                            selected
                              ? "text-base font-semibold text-indigo-600"
                              : "text-sm text-gray-400"
                          }`}
                        >
                          {m}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>

                <Picker.Column name="day">
                  {days.map((d) => (
                    <Picker.Item key={d} value={d}>
                      {({ selected }) => (
                        <div
                          className={`text-center transition-all ${
                            selected
                              ? "text-base font-semibold text-indigo-600"
                              : "text-sm text-gray-400"
                          }`}
                        >
                          {d}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>

                <Picker.Column name="year">
                  {years.map((y) => (
                    <Picker.Item key={y} value={y}>
                      {({ selected }) => (
                        <div
                          className={`text-center transition-all ${
                            selected
                              ? "text-base font-semibold text-indigo-600"
                              : "text-sm text-gray-400"
                          }`}
                        >
                          {y}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>
              </Picker>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
