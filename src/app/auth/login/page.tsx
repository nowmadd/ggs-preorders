"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search?.get("callbackUrl") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErr("");
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });
    if (res?.ok) router.push("callbackUrl"); // or wherever
    else setErr("Invalid email or password");
  };

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Log in</h1>
      {err && <p className="p-2 rounded bg-red-50 text-red-700">{err}</p>}
      {/* <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button className="w-full bg-blue-600 text-white rounded p-2">
          Log in
        </button>
      </form>
      <div className="text-center">or</div> */}
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full border rounded p-2 hover:bg-gray-50"
      >
        Continue with Google
      </button>
    </div>
  );
}
