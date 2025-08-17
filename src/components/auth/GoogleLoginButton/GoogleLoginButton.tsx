"use client";

import * as React from "react";
import { signIn } from "next-auth/react";

type Props = {
  callbackUrl?: string;
  label?: string;
  className?: string;
};

export default function LoginButton({
  callbackUrl = "/",
  label = "Login",
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className={`flex items-center justify-center gap-2  px-3 py-2 text-sm hover:bg-gray-50 ${className}`}
    >
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <div>
      <img
        src="/google-icon.svg"
        alt=""
        width={18}
        height={18}
        className="shrink-0"
      />
    </div>
  );
}
