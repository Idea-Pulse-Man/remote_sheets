import type { ResumeStructure } from "../structure/types";
import type { ResumeContent } from "../../resumeTemplates/types";
import { renderToBuffer } from "@react-pdf/renderer";
import { generatePDFDocument } from "../../fileGenerators/pdfGenerator";
import { TEMPLATE_CONFIGS } from "../../resumeTemplates/types";

/**
 * Rebuild PDF from structure and tailored content
 * Since PDFs can't be directly edited, we use the PDF generator
 * which creates a clean PDF with the tailored content
 * 
 * Note: For better structure preservation, consider converting DOCX to PDF
 * using a service like LibreOffice or CloudConvert in production
 */
export async function rebuildPDFFromStructure(
  structure: ResumeStructure,
  tailoredContent: ResumeContent
): Promise<Buffer> {
  // Generate PDF using the existing PDF generator
  // Uses modern template config for clean output
  const templateConfig = TEMPLATE_CONFIGS.modern;
  const pdfDoc = generatePDFDocument(tailoredContent, templateConfig);
  const pdfBuffer = await renderToBuffer(pdfDoc);
  
  return Buffer.from(pdfBuffer);
}
