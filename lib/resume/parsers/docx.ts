export interface DOCXParseResult {
  text: string;
}

/**
 * Parse DOCX file and extract text content
 * Uses mammoth for reliable Word document parsing
 */
export async function parseDOCX(buffer: ArrayBuffer | Buffer): Promise<DOCXParseResult> {
  try {
    // Dynamic import to avoid bundling issues
    const mammoth = await import("mammoth");
    
    const arrayBuffer = buffer instanceof Buffer ? buffer.buffer : buffer;
    
    const result = await mammoth.default.extractRawText({ arrayBuffer });
    const text = result.value.trim();

    if (!text) {
      throw new Error("Document appears to be empty or contains no extractable text");
    }

    // Clean up excessive whitespace while preserving structure
    const cleanedText = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    return { text: cleanedText };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("empty")) {
        throw error;
      }
      if (error.message.includes("not a valid")) {
        throw new Error("Invalid DOCX file. The file may be corrupted or not a valid Word document.");
      }
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
    throw new Error("DOCX parsing failed: Unknown error");
  }
}
