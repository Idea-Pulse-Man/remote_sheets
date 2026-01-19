export interface PDFParseResult {
  text: string;
  pageCount: number;
}

/**
 * Parse PDF file and extract text content
 * Uses pdfjs-dist legacy build for Node.js compatibility
 * 
 * Requires DOMMatrix polyfill from canvas package for Node.js environment
 */
export async function parsePDF(buffer: ArrayBuffer | Buffer): Promise<PDFParseResult> {
  if (!buffer || (buffer instanceof Buffer && buffer.length === 0) || (buffer instanceof ArrayBuffer && buffer.byteLength === 0)) {
    throw new Error("Invalid buffer: buffer is empty or undefined");
  }

  try {
    // Polyfill DOMMatrix for Node.js before importing pdfjs
    // pdfjs-dist requires DOMMatrix which doesn't exist in Node.js
    if (typeof globalThis.DOMMatrix === "undefined") {
      const { DOMMatrix } = await import("canvas");
      (globalThis as any).DOMMatrix = DOMMatrix;
    }

    // Import pdfjs-dist legacy build (Node.js compatible)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
    
    // Disable worker for Node.js environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = null;

    // Convert Buffer to ArrayBuffer if needed
    const arrayBuffer = buffer instanceof Buffer 
      ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      : buffer;
    
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      verbosity: 0,
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
      if (error.message.includes("Invalid PDF") || error.message.includes("invalid")) {
        throw new Error("Invalid PDF file. The file may be corrupted or not a valid PDF.");
      }
      if (error.message.includes("Password") || error.message.includes("password")) {
        throw new Error("PDF is password-protected. Please remove the password and try again.");
      }
      if (error.message.includes("DOMMatrix")) {
        throw new Error("PDF parsing configuration error. Please ensure canvas package is installed.");
      }
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
    throw new Error("PDF parsing failed: Unknown error");
  }
}
