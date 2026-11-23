"use client";

import dynamic from "next/dynamic";

// Lo stato vive in localStorage: l'app viene resa solo nel browser.
const App = dynamic(() => import("@/components/App"), { ssr: false });

export default function Page() {
  return <App />;
}
