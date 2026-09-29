"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { he } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            locale={he}
            dir="rtl"
            labels={{ labelNext: () => "חודש הבא", labelPrevious: () => "חודש קודם" }}
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-bold text-[#1b251c]",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 border-[#1b251c]/15 bg-white p-0 text-[#1b251c] hover:bg-[#dfe6bd]"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell:
                    "w-9 rounded-md text-[0.8rem] font-normal text-[#5d6958]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal text-[#1b251c] aria-selected:opacity-100 hover:bg-[#dfe6bd] hover:text-[#1b251c]"
                ),
                day_range_end: "day-range-end",
                day_selected:
                    "bg-[#1b251c] text-white font-bold hover:bg-[#1b251c] hover:text-white focus:bg-[#1b251c] focus:text-white",
                day_today: "border border-[#829044] bg-[#dfe6bd] font-bold text-[#1b251c]",
                day_outside:
                    "day-outside text-[#5d6958] opacity-50 aria-selected:bg-[#dfe6bd] aria-selected:opacity-30",
                day_disabled: "text-[#5d6958] opacity-50",
                day_range_middle:
                    "aria-selected:bg-[#dfe6bd] aria-selected:text-[#1b251c]",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                IconRight: () => <ChevronRight className="h-4 w-4" />,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
