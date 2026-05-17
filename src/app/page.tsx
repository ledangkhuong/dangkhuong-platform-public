import type { Metadata } from "next";
import HomePage from "./HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return <HomePage />;
}
