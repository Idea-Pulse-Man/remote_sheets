import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = file.name.split(".").pop()?.toLowerCase();
    let text = "";

    if (fileType === "pdf") {
      try {
        const pdfjs = await import("pdfjs-dist");
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: any) => item.str)
            .join(" ");
          text += pageText + "\n";
        }
      } catch (error) {
        console.error("PDF parsing error:", error);
        return NextResponse.json(
          { error: "PDF parsing requires pdfjs-dist package. Please install it or use DOCX format." },
          { status: 400 }
        );
      }
    } else if (fileType === "docx") {
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } catch (error) {
        console.error("DOCX parsing error:", error);
        return NextResponse.json(
          { error: "DOCX parsing requires mammoth package. Please install it: npm install mammoth" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF or DOCX." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file. The file may be empty or corrupted." },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    console.error("Resume parse API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unexpected error occurred while parsing the file",
      },
      { status: 500 }
    );
  }
}
