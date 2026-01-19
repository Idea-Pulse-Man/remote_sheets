import type { ResumeStructure, ResumeSection, SectionType } from "./types";

/**
 * Infer resume structure from plain text
 * Identifies sections, headings, and content organization
 */
export function inferStructureFromText(text: string): ResumeStructure {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const sections: ResumeSection[] = [];
  
  let currentSection: ResumeSection | null = null;
  let sectionOrder = 0;
  let headerContent: string[] = [];
  let contactInfo: string[] = [];

  // Common section headers to detect
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

    // Check if this is a section header
    let detectedSection: SectionType | null = null;
    for (const [pattern, sectionType] of Object.entries(sectionPatterns)) {
      if (upperLine.includes(pattern.toUpperCase()) && upperLine.length < 50) {
        detectedSection = sectionType;
        break;
      }
    }

    if (detectedSection) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
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
      // Add content to current section
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
      // Header content (before first section)
      if (line.includes("@") || line.includes("email") || line.includes("phone") || line.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
        contactInfo.push(line);
      } else {
        headerContent.push(line);
      }
    }
  }

  // Add last section
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

/**
 * Map structure to structured content format
 */
export function structureToContent(structure: ResumeStructure): {
  profileTitle: string;
  contactInfo?: string;
  professionalSummary?: string;
  experience: Array<{ jobTitle: string; company: string; bullets: string[] }>;
  skills?: string[];
  education?: string[];
  certifications?: string[];
} {
  const result = {
    profileTitle: structure.header.title || "",
    contactInfo: structure.header.contactInfo?.join("\n"),
    experience: [] as Array<{ jobTitle: string; company: string; bullets: string[] }>,
    skills: [] as string[],
    education: [] as string[],
    certifications: [] as string[],
  };

  // Process sections
  for (const section of structure.sections) {
    if (section.type === "summary") {
      result.professionalSummary = section.content.join("\n");
    } else if (section.type === "experience") {
      // Parse experience entries
      let currentJob: { jobTitle: string; company: string; bullets: string[] } | null = null;
      
      for (const line of section.content) {
        // Check if line contains job title and company (usually separated by | or at company)
        if (line.includes("|") || line.match(/\s+at\s+/i)) {
          if (currentJob) {
            result.experience.push(currentJob);
          }
          const parts = line.split(/[|]|\s+at\s+/i).map((p) => p.trim());
          currentJob = {
            jobTitle: parts[0] || "",
            company: parts[1] || "",
            bullets: [],
          };
        } else if (currentJob) {
          currentJob.bullets.push(line);
        }
      }
      
      if (currentJob) {
        result.experience.push(currentJob);
      }
    } else if (section.type === "skills") {
      result.skills = section.content.flatMap((line) => {
        // Split by common delimiters
        return line
          .split(/[•,;|]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      });
    } else if (section.type === "education") {
      result.education = section.content;
    } else if (section.type === "certifications") {
      result.certifications = section.content;
    }
  }

  return result;
}
