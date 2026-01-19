import { NextRequest, NextResponse } from "next/server";
import { generateResumeFiles } from "@/lib/resume/pipeline";
import type { ResumeContent } from "@/lib/resumeTemplates/types";
import type { ResumeStructure } from "@/lib/resume/structure/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { tailoredContent, structure } = body as {
      tailoredContent: ResumeContent;
      structure: ResumeStructure;
    };

    // Validate required fields
    if (!tailoredContent) {
      return NextResponse.json(
        { error: "Missing required field: tailoredContent" },
        { status: 400 }
      );
    }
    if (!structure) {
      return NextResponse.json(
        { error: "Missing required field: structure" },
        { status: 400 }
      );
    }
    if (!tailoredContent.profileTitle || !tailoredContent.profileTitle.trim()) {
      return NextResponse.json(
        { error: "Invalid tailoredContent: profileTitle is required" },
        { status: 400 }
      );
    }
    if (!structure.sections || !Array.isArray(structure.sections)) {
      return NextResponse.json(
        { error: "Invalid structure: sections array is required" },
        { status: 400 }
      );
    }

    // Generate files from structured resume data
    const { docxBuffer, pdfBuffer } = await generateResumeFiles(structure, tailoredContent);

    // Validate buffers
    if (!docxBuffer || docxBuffer.length === 0) {
      throw new Error("DOCX generation failed: empty buffer");
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("PDF generation failed: empty buffer");
    }

    // Convert buffers to base64 for response
    const docxBase64 = docxBuffer.toString("base64");
    const pdfBase64 = pdfBuffer.toString("base64");

    const docxDataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBase64}`;
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

    return NextResponse.json({
      files: {
        docx: {
          fileName: "tailored-resume.docx",
          fileType: "docx",
          fileSize: docxBuffer.length,
          downloadUrl: docxDataUrl,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        pdf: {
          fileName: "tailored-resume.pdf",
          fileType: "pdf",
          fileSize: pdfBuffer.length,
          downloadUrl: pdfDataUrl,
          mimeType: "application/pdf",
        },
      },
    });
  } catch (error) {
    console.error("Resume file generation error:", error);
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during file generation",
      },
      { status: 500 }
    );
  }
}
