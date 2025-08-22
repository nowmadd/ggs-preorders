"use client";

import { toast } from "sonner";

type Opts = { description?: string };

export const notify = {
  success: (msg: string, opts?: Opts) =>
    toast.success(msg, { description: opts?.description }),
  error: (msg: string, opts?: Opts) =>
    toast.error(msg, { description: opts?.description }),
  info: (msg: string, opts?: Opts) =>
    toast.message(msg, { description: opts?.description }),
  promise<T>(
    p: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) {
    return toast.promise(p, {
      loading: msgs.loading,
      success: msgs.success,
      error: msgs.error,
    });
  },
};
