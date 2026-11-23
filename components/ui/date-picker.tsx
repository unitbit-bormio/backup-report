"use client"

import * as React from "react"
import { CalendarCheck, CalendarIcon } from "lucide-react"
import { it } from "react-day-picker/locale"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type DatePickerProps = {
  /** Data nel formato AAAA-MM-GG, oppure stringa vuota. */
  value: string
  onValueChange: (value: string) => void
  className?: string
  "aria-label"?: string
}

const pad = (n: number) => String(n).padStart(2, "0")
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Selettore di data: pulsante che apre il calendario in un popover. */
function DatePicker({ value, onValueChange, className, ...props }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const date = value ? new Date(value + "T00:00") : undefined
  const [month, setMonth] = React.useState(date ?? new Date())

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        // A ogni apertura il calendario riparte dal mese della data scelta
        if (o) setMonth(date ?? new Date())
        setOpen(o)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label={props["aria-label"]}
            className={cn("w-full justify-between bg-card px-2.5 font-normal", !date && "text-muted-foreground", className)}
          />
        }
      >
        {date ? date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Scegli"}
        <CalendarIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          className="p-3 [--cell-size:--spacing(8)]"
          locale={it}
          selected={date}
          month={month}
          onMonthChange={setMonth}
          onSelect={(d) => {
            if (d) onValueChange(toIso(d))
            setOpen(false)
          }}
        />
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onValueChange(toIso(new Date()))
              setOpen(false)
            }}
          >
            <CalendarCheck /> Oggi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
