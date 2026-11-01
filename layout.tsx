import type { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "ApexOptions",
  description: "ApexOptions demo trading development environment"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
