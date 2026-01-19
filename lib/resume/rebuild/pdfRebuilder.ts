import type { ResumeStructure } from "../structure/types";
import type { ResumeContent } from "../../resumeTemplates/types";
import { renderToBuffer } from "@react-pdf/renderer";
import { generatePDFDocument } from "../../fileGenerators/pdfGenerator";
import { TEMPLATE_CONFIGS } from "../../resumeTemplates/types";

/**
 * Rebuild PDF from structure and tailored content
 * 
 * Note: This generates PDF directly from content using the PDF generator.
 * For production, consider converting the DOCX to PDF using a service
 * (LibreOffice, CloudConvert) for better structure preservation.
 * 
 * The DOCX buffer should already exist before calling this function.
 */
export async function rebuildPDFFromStructure(
  structure: ResumeStructure,
  tailoredContent: ResumeContent
): Promise<Buffer> {
  // Validate required parameters
  if (!structure) {
    throw new Error("Missing required parameter: structure");
  }
  if (!tailoredContent) {
    throw new Error("Missing required parameter: tailoredContent");
  }
  if (!tailoredContent.profileTitle || !tailoredContent.profileTitle.trim()) {
    throw new Error("Invalid tailoredContent: profileTitle is required");
  }
  if (!structure.sections || !Array.isArray(structure.sections)) {
    throw new Error("Invalid structure: sections array is required");
  }

  // Generate PDF using the existing PDF generator
  const templateConfig = TEMPLATE_CONFIGS.modern;
  const pdfDoc = generatePDFDocument(tailoredContent, templateConfig);
  const pdfBuffer = await renderToBuffer(pdfDoc);
  
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("PDF generation failed: empty buffer");
  }
  
  return Buffer.from(pdfBuffer);
}
