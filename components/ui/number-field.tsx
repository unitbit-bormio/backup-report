"use client"

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field"
import { Minus, Plus } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"

type NumberFieldProps = {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  "aria-label"?: string
}

/** Campo numerico: meno, valore, più, uniti in un button group. */
function NumberField({ value, onValueChange, min = 0, max, step = 1, className, ...props }: NumberFieldProps) {
  return (
    <NumberFieldPrimitive.Root
      data-slot="number-field"
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onValueChange(Math.round(v ?? min))}
    >
      <NumberFieldPrimitive.Group render={<ButtonGroup className={cn("w-full", className)} />}>
        <NumberFieldPrimitive.Decrement
          aria-label="Diminuisci"
          render={<Button variant="outline" size="icon" className="bg-card" />}
        >
          <Minus />
        </NumberFieldPrimitive.Decrement>
        <NumberFieldPrimitive.Input
          aria-label={props["aria-label"]}
          render={<Input className="bg-card px-1 text-center tabular-nums" />}
        />
        <NumberFieldPrimitive.Increment
          aria-label="Aumenta"
          render={<Button variant="outline" size="icon" className="bg-card" />}
        >
          <Plus />
        </NumberFieldPrimitive.Increment>
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  )
}

export { NumberField }
