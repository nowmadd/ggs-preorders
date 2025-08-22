"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      expand
      theme="system"
      toastOptions={{ duration: 3500 }}
    />
  );
}
