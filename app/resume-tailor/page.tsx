import React, { Suspense } from "react";
import { ResumeTailorPageClient } from "@/components/resume-tailor/ResumeTailorPageClient";

export default function ResumeTailorPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ResumeTailorPageClient />
    </Suspense>
  );
}
