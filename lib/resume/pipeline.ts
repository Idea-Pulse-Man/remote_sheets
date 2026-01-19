import { parseResume } from "./parseResume";
import { parseDOCXStructure } from "./structure/docxParser";
import { inferStructureFromText } from "./structure/infer";
import { structureToContent } from "./structure/infer";
import { rebuildResume } from "./rebuild";
import { tailorResumeWithOpenAI } from "../resumeTailor";
import { mapTailoredToStructure } from "./tailor/structureAware";
import type { ResumeStructure } from "./structure/types";
import type { ResumeContent } from "../resumeTemplates/types";

export interface TailorResumePipelineInput {
  file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer>; size: number; type?: string };
  jobTitle: string;
  jobDescription: string;
}

export interface TailorResumePipelineOutput {
  tailoredText: string;
  tailoredContent: ResumeContent;
  structure: ResumeStructure;
  docxBuffer: Buffer;
  pdfBuffer: Buffer;
}

/**
 * Complete structure-preserving resume tailoring pipeline
 * 
 * 1. Parse original resume (PDF or DOCX)
 * 2. Infer/extract structure
 * 3. Tailor content with AI
 * 4. Rebuild resume preserving structure
 * 5. Return tailored resume file
 */
export async function tailorResumeWithStructure(
  input: TailorResumePipelineInput
): Promise<TailorResumePipelineOutput> {
  // Step 1: Parse resume file
  const parseResult = await parseResume(input.file);
  const fileType = parseResult.fileType;

  // Step 2: Extract structure
  let structure: ResumeStructure;
  let originalContent: ResumeContent;

  if (fileType === "docx") {
    // DOCX: Parse structure directly
    const arrayBuffer = await input.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const docxStructure = await parseDOCXStructure(buffer);
    structure = docxStructure.structure;
    
    // Extract content from structure
    const contentFromStructure = structureToContent(structure);
    originalContent = {
      profileTitle: contentFromStructure.profileTitle,
      professionalSummary: contentFromStructure.professionalSummary || "",
      experience: contentFromStructure.experience,
      contactInfo: contentFromStructure.contactInfo,
      skills: contentFromStructure.skills,
      education: contentFromStructure.education,
      certifications: contentFromStructure.certifications,
    };
  } else {
    // PDF: Infer structure from text
    structure = inferStructureFromText(parseResult.text);
    const contentFromStructure = structureToContent(structure);
    originalContent = {
      profileTitle: contentFromStructure.profileTitle,
      professionalSummary: contentFromStructure.professionalSummary || "",
      experience: contentFromStructure.experience,
      contactInfo: contentFromStructure.contactInfo,
      skills: contentFromStructure.skills,
      education: contentFromStructure.education,
      certifications: contentFromStructure.certifications,
    };
    
    // Mark as PDF-originated
    structure.originalFormat = {
      fileType: "pdf",
    };
  }

  // Step 3: Tailor content with AI
  const tailoredResponse = await tailorResumeWithOpenAI({
    jobTitle: input.jobTitle,
    jobDescription: input.jobDescription,
    resumeText: parseResult.text,
  });

  // Step 4: Map tailored content to preserve structure
  const tailoredContent = mapTailoredToStructure(
    structure,
    tailoredResponse,
    originalContent
  );

  // Step 5: Rebuild resume with tailored content
  // DOCX is the source of truth - generate it first
  const docxResult = await rebuildResume(
    structure,
    tailoredContent,
    { outputFormat: "docx" }
  );

  // Validate DOCX buffer
  if (!docxResult.buffer || docxResult.buffer.length === 0) {
    throw new Error("Failed to generate DOCX: buffer is empty");
  }

  // Generate PDF from the same tailored content
  // Note: In production, consider converting DOCX to PDF using a service
  const pdfResult = await rebuildResume(
    structure,
    tailoredContent,
    { outputFormat: "pdf" }
  );

  // Validate PDF buffer
  if (!pdfResult.buffer || pdfResult.buffer.length === 0) {
    throw new Error("Failed to generate PDF: buffer is empty");
  }

  // Format tailored text for ATS checking
  const tailoredText = formatTailoredResumeText(tailoredContent);

  return {
    tailoredText,
    tailoredContent,
    structure,
    docxBuffer: docxResult.buffer,
    pdfBuffer: pdfResult.buffer,
  };
}

/**
 * Format tailored content back to plain text for ATS checking
 */
function formatTailoredResumeText(content: ResumeContent): string {
  let text = `${content.profileTitle}\n\n`;
  
  if (content.contactInfo) {
    text += `${content.contactInfo}\n\n`;
  }
  
  if (content.professionalSummary) {
    text += `PROFESSIONAL SUMMARY\n${content.professionalSummary}\n\n`;
  }
  
  if (content.experience && content.experience.length > 0) {
    text += `EXPERIENCE\n`;
    content.experience.forEach((exp) => {
      text += `${exp.jobTitle} | ${exp.company}\n`;
      exp.bullets.forEach((bullet) => {
        text += `• ${bullet}\n`;
      });
      text += `\n`;
    });
  }
  
  if (content.skills && content.skills.length > 0) {
    text += `TECHNICAL SKILLS\n${content.skills.join(" • ")}\n\n`;
  }
  
  if (content.education && content.education.length > 0) {
    text += `EDUCATION\n${content.education.join("\n")}\n\n`;
  }
  
  if (content.certifications && content.certifications.length > 0) {
    text += `CERTIFICATIONS\n${content.certifications.join("\n")}\n`;
  }
  
  return text.trim();
}
