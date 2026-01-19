import { NextRequest, NextResponse } from "next/server";
import { tailorResumeWithStructure } from "@/lib/resume/pipeline";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get("file") as File;
    const jobTitle = formData.get("jobTitle") as string;
    const jobDescription = formData.get("jobDescription") as string;

    // Validate required fields with explicit checks
    if (!file) {
      return NextResponse.json(
        { error: "Missing required field: file" },
        { status: 400 }
      );
    }
    if (!jobTitle || !jobTitle.trim()) {
      return NextResponse.json(
        { error: "Missing required field: jobTitle" },
        { status: 400 }
      );
    }
    if (!jobDescription || !jobDescription.trim()) {
      return NextResponse.json(
        { error: "Missing required field: jobDescription" },
        { status: 400 }
      );
    }

    // Run structure-preserving tailoring pipeline
    // This returns structured data WITHOUT generating files
    const result = await tailorResumeWithStructure({
      file,
      jobTitle,
      jobDescription,
    });

    // Return structured resume data for preview
    // Files will be generated after user accepts the preview
    return NextResponse.json({
      tailoredText: result.tailoredText,
      tailoredContent: result.tailoredContent,
      structure: result.structure,
    });
  } catch (error) {
    console.error("Structure-preserving tailor error:", error);
    
    // Always return JSON error, never binary data
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during resume tailoring",
      },
      { status: 500 }
    );
  }
}
