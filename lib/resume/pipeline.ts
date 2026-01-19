import { parseResume } from "./parseResume";
import { parseDOCXStructure } from "./structure/docxParser";
import { inferStructureFromText } from "./structure/infer";
import { structureToContent } from "./structure/infer";
import { rebuildResume } from "./rebuild";
import { tailorResumeWithOpenAI } from "../resumeTailor";
import { applyScopedTailoring } from "./tailor/scopedTailor";
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
  // Files are generated only after preview acceptance
  docxBuffer?: Buffer;
  pdfBuffer?: Buffer;
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
  // Validate input parameters
  if (!input.file) {
    throw new Error("Missing required parameter: file");
  }
  if (!input.jobTitle || !input.jobTitle.trim()) {
    throw new Error("Missing required parameter: jobTitle");
  }
  if (!input.jobDescription || !input.jobDescription.trim()) {
    throw new Error("Missing required parameter: jobDescription");
  }

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

  // Validate AI response
  if (!tailoredResponse) {
    throw new Error("AI tailoring failed: no response received");
  }
  if (!tailoredResponse.profile_title || !tailoredResponse.profile_title.trim()) {
    throw new Error("AI tailoring failed: missing profile title in response");
  }

  // Step 4: Apply scoped tailoring - only improve allowed sections
  const tailoredContent = applyScopedTailoring(
    structure,
    tailoredResponse,
    originalContent
  );

  // Validate tailored content
  if (!tailoredContent.profileTitle || !tailoredContent.profileTitle.trim()) {
    throw new Error("Tailored content validation failed: profile title is required");
  }

  // Step 5: Format tailored text for ATS checking
  // Files are NOT generated here - only after preview acceptance
  const tailoredText = formatTailoredResumeText(tailoredContent);

  return {
    tailoredText,
    tailoredContent,
    structure,
    // Files will be generated after preview acceptance
  };
}

/**
 * Generate DOCX and PDF files from tailored resume content
 * Called after user accepts the preview
 */
export async function generateResumeFiles(
  structure: ResumeStructure,
  tailoredContent: ResumeContent
): Promise<{ docxBuffer: Buffer; pdfBuffer: Buffer }> {
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

  // DOCX is the source of truth - generate it first
  const docxResult = await rebuildResume(structure, tailoredContent, { outputFormat: "docx" });

  // Validate DOCX buffer
  if (!docxResult.buffer || docxResult.buffer.length === 0) {
    throw new Error("Failed to generate DOCX: buffer is empty");
  }

  // Generate PDF from the same tailored content
  const pdfResult = await rebuildResume(structure, tailoredContent, { outputFormat: "pdf" });

  // Validate PDF buffer
  if (!pdfResult.buffer || pdfResult.buffer.length === 0) {
    throw new Error("Failed to generate PDF: buffer is empty");
  }

  return {
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
