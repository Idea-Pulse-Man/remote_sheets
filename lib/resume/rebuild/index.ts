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
  if (options.outputFormat === "docx") {
    const docx = buildDOCXFromStructure(structure, tailoredContent);
    const buffer = await Packer.toBuffer(docx);
    
    return {
      buffer,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileExtension: "docx",
    };
  } else {
    // PDF: Build DOCX first, then convert
    const buffer = await rebuildPDFFromStructure(structure, tailoredContent);
    
    return {
      buffer,
      mimeType: "application/pdf",
      fileExtension: "pdf",
    };
  }
}
