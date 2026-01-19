import type { ResumeStructure } from "../structure/types";
import type { ResumeContent } from "../../resumeTemplates/types";
import { buildDOCXFromStructure } from "./docxBuilder";
import { rebuildPDFFromStructure } from "./pdfRebuilder";
import { Packer } from "docx";

export type RebuildOptions = {
  outputFormat: "docx" | "pdf";
};

/**
 * Rebuild resume preserving original structure with tailored content
 */
export async function rebuildResume(
  structure: ResumeStructure,
  tailoredContent: ResumeContent,
  options: RebuildOptions = { outputFormat: "pdf" }
): Promise<{ buffer: Buffer; mimeType: string; fileExtension: string }> {
  // Validate inputs
  if (!structure || !tailoredContent) {
    throw new Error("Missing required parameters: structure and tailoredContent");
  }

  if (options.outputFormat === "docx") {
    const docx = buildDOCXFromStructure(structure, tailoredContent);
    const buffer = await Packer.toBuffer(docx);
    
    // Validate DOCX buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("DOCX generation failed: empty buffer");
    }
    
    return {
      buffer,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileExtension: "docx",
    };
  } else {
    // PDF: Generate from tailored content
    const buffer = await rebuildPDFFromStructure(structure, tailoredContent);
    
    // Validate PDF buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("PDF generation failed: empty buffer");
    }
    
    return {
      buffer,
      mimeType: "application/pdf",
      fileExtension: "pdf",
    };
  }
}
