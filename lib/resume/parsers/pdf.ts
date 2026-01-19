export interface PDFParseResult {
  text: string;
  pageCount: number;
}

/**
 * Parse PDF file and extract text content
 * Uses pdfjs-dist legacy build for Node.js compatibility
 */
export async function parsePDF(buffer: ArrayBuffer | Buffer): Promise<PDFParseResult> {
  try {
    // Dynamic import to avoid bundling issues in Next.js
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      useSystemFonts: true,
      verbosity: 0,
      // Disable worker for Node.js environment
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    let extractedText = "";

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => {
          if ("str" in item && typeof item.str === "string") {
            return item.str;
          }
          return "";
        })
        .filter((str: string) => str.length > 0)
        .join(" ")
        .trim();

      if (pageText) {
        extractedText += pageText + "\n\n";
      }
    }

    return {
      text: extractedText.trim(),
      pageCount,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Provide more helpful error messages
      if (error.message.includes("Invalid PDF")) {
        throw new Error("Invalid PDF file. The file may be corrupted or not a valid PDF.");
      }
      if (error.message.includes("Password")) {
        throw new Error("PDF is password-protected. Please remove the password and try again.");
      }
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
    throw new Error("PDF parsing failed: Unknown error");
  }
}
