import { NextRequest, NextResponse } from "next/server";
import { tailorResumeWithStructure } from "@/lib/resume/pipeline";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get("file") as File;
    const jobTitle = formData.get("jobTitle") as string;
    const jobDescription = formData.get("jobDescription") as string;

    if (!file || !jobTitle || !jobDescription) {
      return NextResponse.json(
        { error: "Missing required fields: file, jobTitle, jobDescription" },
        { status: 400 }
      );
    }

    // Run structure-preserving tailoring pipeline
    const result = await tailorResumeWithStructure({
      file,
      jobTitle,
      jobDescription,
    });

    // Convert buffer to base64 for response
    const base64File = result.fileBuffer.toString("base64");
    const dataUrl = `data:${result.mimeType};base64,${base64File}`;

    return NextResponse.json({
      tailoredText: result.tailoredText,
      fileName: `tailored-resume.${result.fileExtension}`,
      fileType: result.fileExtension,
      fileSize: result.fileBuffer.length,
      downloadUrl: dataUrl,
      mimeType: result.mimeType,
    });
  } catch (error) {
    console.error("Structure-preserving tailor error:", error);
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
