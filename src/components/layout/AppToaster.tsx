"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * In alto al centro su mobile (a destra copriva header e azioni),
 * in basso a destra su desktop.
 */
export default function AppToaster() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Toaster
      position={desktop ? "bottom-right" : "top-center"}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--line)",
        },
      }}
    />
  );
}
