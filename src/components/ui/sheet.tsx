"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Minimal shadcn-style Sheet built on Base UI Dialog.
 *
 * Right-side drawer by default. Used by CartSheet and any future
 * side-panel UIs. Mirrors the shadcn Sheet API surface (Sheet,
 * SheetContent, SheetHeader, SheetTitle, SheetClose).
 */

type SheetSide = "right" | "left" | "top" | "bottom"

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger {...props} />
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close {...props} />
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal {...props} />
}

function SheetBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm",
        "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        "transition-opacity duration-200",
        className,
      )}
      {...props}
    />
  )
}

const sideClasses: Record<SheetSide, string> = {
  right:
    "right-0 top-0 h-full w-full sm:max-w-md border-l data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
  left:
    "left-0 top-0 h-full w-full sm:max-w-md border-r data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  top:
    "top-0 left-0 right-0 w-full border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
  bottom:
    "bottom-0 left-0 right-0 w-full border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
}

interface SheetContentProps extends DialogPrimitive.Popup.Props {
  side?: SheetSide
  showClose?: boolean
}

function SheetContent({
  className,
  side = "right",
  showClose = true,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetBackdrop />
      <DialogPrimitive.Popup
        className={cn(
          "fixed z-50 flex flex-col bg-[#1a1a1a] text-white shadow-2xl",
          "border-white/10",
          "transition-transform duration-300 ease-out",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-4 rounded-md p-1.5",
              "text-white/60 hover:text-white hover:bg-white/10",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4A843]",
            )}
            aria-label="Đóng"
          >
            <XIcon className="h-4 w-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-white/10 px-5 py-4 pr-12",
        className,
      )}
      {...props}
    />
  )
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto border-t border-white/10 px-5 py-4",
        className,
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold text-white", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-white/60", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetBackdrop,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
