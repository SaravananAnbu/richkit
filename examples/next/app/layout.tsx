import type { ReactNode } from "react";
import "richkit/styles.css";

export const metadata = { title: "richkit · Next.js example" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f3f4f6" }}>{children}</body>
    </html>
  );
}
