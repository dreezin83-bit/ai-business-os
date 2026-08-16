"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import SubscribeModal from "@/components/subscribe-modal";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

/**
 * Small client island: a CTA button that opens the existing SubscribeModal
 * (the Paystack checkout entry). The landing page itself stays a server
 * component — this is the only client boundary a CTA needs.
 */
export default function SubscribeCta({
  children,
  className,
  variant = "default",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <SubscribeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
