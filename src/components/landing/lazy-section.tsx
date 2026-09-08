"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * LazySection — mounts its children only once the containing element scrolls
 * near the viewport (IntersectionObserver). Used on the landing page to keep
 * below-the-fold interactive islands (ROI calculator, bento grid, pricing,
 * FAQ accordion) out of the initial eager JS bundle: a dynamic import inside
 * the children is only fetched once this section becomes visible.
 *
 * Renders a zero/low-chrome placeholder (with an optional min-height) until
 * mount, so the layout does not collapse.
 */
export default function LazySection({
  children,
  minHeight,
  rootMargin = "250px",
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      style={minHeight ? { minHeight } : undefined}
      className="w-full"
    >
      {visible ? children : null}
    </div>
  );
}
