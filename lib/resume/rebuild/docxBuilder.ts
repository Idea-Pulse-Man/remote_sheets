import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopType,
  TabStopPosition,
  SectionType,
} from "docx";
import type { ResumeStructure } from "../structure/types";
import type { ResumeContent } from "../../resumeTemplates/types";

/**
 * Build DOCX document preserving original structure with tailored content
 */
export function buildDOCXFromStructure(
  structure: ResumeStructure,
  tailoredContent: ResumeContent
): Document {
  const children: Paragraph[] = [];

  // Header section
  if (tailoredContent.profileTitle) {
    children.push(
      new Paragraph({
        text: tailoredContent.profileTitle,
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
      })
    );
  }

  if (tailoredContent.contactInfo) {
    children.push(
      new Paragraph({
        text: tailoredContent.contactInfo,
        spacing: { after: 300 },
      })
    );
  }

  // Map tailored content to original structure order
  const sectionMap = new Map<SectionType, any>();
  
  // Summary
  if (tailoredContent.professionalSummary) {
    sectionMap.set("summary", tailoredContent.professionalSummary);
  }
  
  // Experience
  if (tailoredContent.experience && tailoredContent.experience.length > 0) {
    sectionMap.set("experience", tailoredContent.experience);
  }
  
  // Skills
  if (tailoredContent.skills && tailoredContent.skills.length > 0) {
    sectionMap.set("skills", tailoredContent.skills);
  }
  
  // Education
  if (tailoredContent.education && tailoredContent.education.length > 0) {
    sectionMap.set("education", tailoredContent.education);
  }
  
  // Certifications
  if (tailoredContent.certifications && tailoredContent.certifications.length > 0) {
    sectionMap.set("certifications", tailoredContent.certifications);
  }

  // Rebuild sections in original order with tailored content
  for (const section of structure.sections) {
    const tailoredData = sectionMap.get(section.type);
    
    if (!tailoredData) {
      continue; // Skip sections that don't exist in tailored content
    }

    // Add section header
    if (section.title) {
      children.push(
        new Paragraph({
          text: section.title.toUpperCase(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        })
      );
    }

    // Add section content based on type
    if (section.type === "summary") {
      children.push(
        new Paragraph({
          text: tailoredData,
          spacing: { after: 200 },
        })
      );
    } else if (section.type === "experience") {
      // Experience entries
      tailoredData.forEach((exp: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.jobTitle || "",
                bold: true,
                size: 24,
              }),
              new TextRun({
                text: " | ",
                size: 24,
              }),
              new TextRun({
                text: exp.company || "",
                italics: true,
                size: 24,
              }),
            ],
            spacing: { after: 100 },
          })
        );

        // Bullets
        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet: string) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "• ",
                    bold: true,
                  }),
                  new TextRun({
                    text: bullet,
                  }),
                ],
                spacing: { after: 100 },
                indent: { left: 400 },
              })
            );
          });
        }

        children.push(
          new Paragraph({
            text: "",
            spacing: { after: 200 },
          })
        );
      });
    } else if (section.type === "skills") {
      children.push(
        new Paragraph({
          text: Array.isArray(tailoredData) ? tailoredData.join(" • ") : tailoredData,
          spacing: { after: 200 },
        })
      );
    } else if (section.type === "education" || section.type === "certifications") {
      const entries = Array.isArray(tailoredData) ? tailoredData : [tailoredData];
      entries.forEach((entry: string) => {
        children.push(
          new Paragraph({
            text: entry,
            spacing: { after: 100 },
          })
        );
      });
      children.push(
        new Paragraph({
          text: "",
          spacing: { after: 200 },
        })
      );
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: children,
      },
    ],
  });
}
