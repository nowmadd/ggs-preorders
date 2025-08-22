"use client";
import { Provider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import { store } from "./lib/store/store";
import { GlobalSheetProvider } from "./components/GlobalSheetProvider/GlobalSheetProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlobalSheetProvider>
        <Provider store={store}>{children}</Provider>
      </GlobalSheetProvider>
    </SessionProvider>
  );
}
