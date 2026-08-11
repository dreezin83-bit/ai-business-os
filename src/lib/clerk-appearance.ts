/**
 * Shared Clerk appearance for sign-in / sign-up.
 *
 * Clerk components render inside a shadow DOM, so Tailwind utility classes
 * cannot style them — we use `variables` (CSS custom properties) and
 * `elements` (inline style objects) instead. Palette mirrors the app's
 * dark slate/blue theme (see src/app/globals.css and sidebar branding).
 */
export const clerkAppearance = {
  variables: {
    colorBackground: "#020617", // slate-950
    colorForeground: "#e2e8f0", // slate-200
    colorInputBackground: "#0f172a", // slate-900
    colorInputText: "#f8fafc", // slate-50
    colorPrimary: "#3b82f6", // blue-500
    colorText: "#e2e8f0", // slate-200
    colorTextSecondary: "#94a3b8", // slate-400
    colorDanger: "#ef4444",
    colorBorder: "#1e293b", // slate-800
    borderRadius: "0.75rem",
    fontFamily:
      "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSmoothing: "antialiased",
  },
  elements: {
    card: {
      backgroundColor: "#0f172a",
      border: "1px solid #1e293b",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      borderRadius: "1rem",
    },
    headerTitle: {
      color: "#f8fafc",
      fontWeight: "600",
      letterSpacing: "-0.02em",
    },
    headerSubtitle: {
      color: "#94a3b8",
    },
    formButtonPrimary: {
      backgroundColor: "#2563eb",
      backgroundImage: "linear-gradient(135deg, #3b82f6, #2563eb)",
      borderRadius: "0.625rem",
      fontWeight: "600",
      color: "#ffffff",
    },
    formFieldInput: {
      backgroundColor: "#020617",
      borderColor: "#334155",
      color: "#f8fafc",
      borderRadius: "0.625rem",
    },
    formFieldLabel: {
      color: "#cbd5e1",
      fontWeight: "500",
    },
    socialButtonsBlockButton: {
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      color: "#e2e8f0",
      borderRadius: "0.625rem",
    },
    footerActionText: {
      color: "#94a3b8",
    },
    footerActionLink: {
      color: "#60a5fa",
      fontWeight: "600",
    },
    dividerLine: {
      backgroundColor: "#334155",
    },
    dividerText: {
      color: "#64748b",
    },
    identityPreviewText: {
      color: "#e2e8f0",
    },
    identityPreviewEditButton: {
      color: "#60a5fa",
    },
  },
};
