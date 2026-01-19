import mammoth from "mammoth";
import type { ResumeStructure, ResumeSection, SectionType } from "./types";
import { inferStructureFromText } from "./infer";

/**
 * Parse DOCX file and extract structure with formatting preservation
 */
export async function parseDOCXStructure(buffer: Buffer): Promise<{
  structure: ResumeStructure;
  text: string;
}> {
  try {
    // Extract text with formatting information
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    // Use text-based inference (structure preserved from original)
    const structure = inferStructureFromText(text);

    return {
      structure: {
        ...structure,
        originalFormat: {
          fileType: "docx",
        },
      },
      text,
    };
  } catch (error) {
    throw new Error(`Failed to parse DOCX structure: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const sections: ResumeSection[] = [];
  
  let currentSection: ResumeSection | null = null;
  let sectionOrder = 0;
  let headerContent: string[] = [];
  let contactInfo: string[] = [];

  const sectionPatterns: Record<string, SectionType> = {
    "professional summary": "summary",
    "summary": "summary",
    "executive summary": "summary",
    "objective": "summary",
    "experience": "experience",
    "work experience": "experience",
    "employment": "experience",
    "professional experience": "experience",
    "work history": "experience",
    "skills": "skills",
    "technical skills": "skills",
    "core competencies": "skills",
    "education": "education",
    "academic background": "education",
    "certifications": "certifications",
    "certificates": "certifications",
    "licenses": "certifications",
  };

  let isInHeader = true;
  let foundFirstSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    let detectedSection: SectionType | null = null;
    for (const [pattern, sectionType] of Object.entries(sectionPatterns)) {
      if (upperLine.includes(pattern.toUpperCase()) && upperLine.length < 50) {
        detectedSection = sectionType;
        break;
      }
    }

    if (detectedSection) {
      if (currentSection) {
        sections.push(currentSection);
      }

      foundFirstSection = true;
      isInHeader = false;
      currentSection = {
        type: detectedSection,
        title: line,
        content: [],
        order: sectionOrder++,
        metadata: {
          isHeading: true,
        },
      };
    } else if (foundFirstSection && currentSection) {
      const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
      if (!currentSection.metadata) {
        currentSection.metadata = {};
      }
      if (isBullet) {
        currentSection.metadata.isBulletList = true;
        currentSection.content.push(line.replace(/^[•\-\*]\s*/, ""));
      } else {
        currentSection.content.push(line);
      }
    } else if (isInHeader) {
      if (line.includes("@") || line.includes("email") || line.includes("phone") || line.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
        contactInfo.push(line);
      } else {
        headerContent.push(line);
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return {
    header: {
      title: headerContent[0] || "",
      contactInfo: contactInfo.length > 0 ? contactInfo : undefined,
    },
    sections,
  };
}
