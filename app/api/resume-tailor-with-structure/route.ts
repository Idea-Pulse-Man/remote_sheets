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

    // Validate buffers before encoding
    if (!result.docxBuffer || result.docxBuffer.length === 0) {
      throw new Error("DOCX generation failed: empty buffer");
    }

    if (!result.pdfBuffer || result.pdfBuffer.length === 0) {
      throw new Error("PDF generation failed: empty buffer");
    }

    // Convert buffers to base64 for response
    const docxBase64 = result.docxBuffer.toString("base64");
    const pdfBase64 = result.pdfBuffer.toString("base64");

    const docxDataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBase64}`;
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

    return NextResponse.json({
      tailoredText: result.tailoredText,
      files: {
        docx: {
          fileName: "tailored-resume.docx",
          fileType: "docx",
          fileSize: result.docxBuffer.length,
          downloadUrl: docxDataUrl,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        pdf: {
          fileName: "tailored-resume.pdf",
          fileType: "pdf",
          fileSize: result.pdfBuffer.length,
          downloadUrl: pdfDataUrl,
          mimeType: "application/pdf",
        },
      },
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
