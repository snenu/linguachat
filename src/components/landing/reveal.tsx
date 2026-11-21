"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/** Calls back once when the element scrolls into view (immediately if IntersectionObserver is missing). */
export function useInView<T extends Element>(options: IntersectionObserverInit = { threshold: 0.2 }) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const { threshold, rootMargin } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);
  return [ref, inView] as const;
}

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  return (
    <Tag ref={ref} data-shown={inView} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}
