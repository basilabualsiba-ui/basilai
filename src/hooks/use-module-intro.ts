import { useEffect, useState } from "react";

export function useModuleIntro(duration = 900) {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), duration);
    return () => window.clearTimeout(timer);
  }, [duration]);

  return showIntro;
}
