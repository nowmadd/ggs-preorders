"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type Side = "right" | "left" | "top" | "bottom";

type ShowOptions = {
  title?: ReactNode;
  description?: ReactNode;
  content: ReactNode;
  side?: Side;
  contentClassName?: string;
};

type Ctx = {
  open: boolean;
  show: (opts: ShowOptions) => void;
  hide: () => void;
  setContent: (node: ReactNode) => void;
};

const GlobalSheetContext = createContext<Ctx | null>(null);

export function useGlobalSheet() {
  const ctx = useContext(GlobalSheetContext);
  if (!ctx)
    throw new Error("useGlobalSheet must be used within GlobalSheetProvider");
  return ctx;
}

export function GlobalSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<Side>("right");
  const [title, setTitle] = useState<ReactNode>(null);
  const [desc, setDesc] = useState<ReactNode>(null);
  const [content, setContent] = useState<ReactNode>(null);
  const [contentClassName, setContentClassName] = useState<string | undefined>(
    undefined
  );

  const show: Ctx["show"] = ({
    title,
    description,
    content,
    side = "right",
    contentClassName,
  }) => {
    setTitle(title ?? null);
    setDesc(description ?? null);
    setContent(content);
    setSide(side);
    setContentClassName(contentClassName);
    setOpen(true);
  };

  const hide = () => setOpen(false);

  return (
    <GlobalSheetContext.Provider value={{ open, show, hide, setContent }}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={side} className={contentClassName}>
          <SheetHeader>
            <SheetTitle>
              {title ?? <VisuallyHidden>Panel</VisuallyHidden>}
            </SheetTitle>
            {desc ? <SheetDescription>{desc}</SheetDescription> : null}
          </SheetHeader>

          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
      {children}
    </GlobalSheetContext.Provider>
  );
}
