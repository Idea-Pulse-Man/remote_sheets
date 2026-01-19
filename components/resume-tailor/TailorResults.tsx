"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TailorResultsProps = {
  data: {
    tailoredResume: string;
    matchedKeywords: string[];
    missingKeywords: string[];
    recommendations: string[];
    generatedFile?: {
      fileName: string;
      fileType: string;
      fileSize: number;
      downloadUrl: string;
    };
    uploadedToDrive: boolean;
    googleDriveMetadata?: {
      fileId: string;
      fileUrl: string;
    };
  };
  onDownload: () => void;
  onGenerateFile: () => void;
  updateData: (updates: any) => void;
};

export function TailorResults({
  data,
  onDownload,
  onGenerateFile,
  updateData,
}: TailorResultsProps) {
  const [showFullResume, setShowFullResume] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleCopyResume = () => {
    navigator.clipboard.writeText(data.tailoredResume);
    toast.success("Resume copied to clipboard");
  };

  const handleUploadToDrive = async () => {
    if (!data.generatedFile) {
      toast.info("Generating file first...");
      await onGenerateFile();
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/google-drive/check-auth");
      const authData = await response.json();

      if (!authData.authenticated) {
        const authUrl = await fetch("/api/google-drive/auth").then((r) => r.json());
        window.location.href = authUrl.url;
        return;
      }

      const fileData = data.generatedFile.downloadUrl.startsWith("data:")
        ? data.generatedFile.downloadUrl.split(",")[1]
        : await fetch(data.generatedFile.downloadUrl).then((r) => r.blob());

      const uploadResponse = await fetch("/api/google-drive/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: typeof fileData === "string" ? fileData : await fileData.text(),
          fileName: data.generatedFile.fileName,
          mimeType: data.generatedFile.fileType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          jobId: null,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to Google Drive");
      }

      const uploadResult = await uploadResponse.json();
      updateData({
        uploadedToDrive: true,
        googleDriveMetadata: {
          fileId: uploadResult.fileId,
          fileUrl: uploadResult.fileUrl,
        },
      });

      toast.success("Resume uploaded to Google Drive");
    } catch (error) {
      console.error("Error uploading to Google Drive:", error);
      toast.error("Failed to upload to Google Drive");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tailored Resume</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyResume}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullResume(!showFullResume)}
              >
                {showFullResume ? "Show Summary" : "Show Full"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.tailoredResume}
            readOnly
            className={cn(
              "font-mono text-sm",
              !showFullResume && "max-h-64 overflow-y-auto"
            )}
            rows={showFullResume ? 30 : 10}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Matched Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.matchedKeywords.length > 0 ? (
                data.matchedKeywords.map((keyword, idx) => (
                  <Badge key={idx} variant="default" className="bg-green-500">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No keywords matched</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Missing Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.missingKeywords.length > 0 ? (
                data.missingKeywords.map((keyword, idx) => (
                  <Badge key={idx} variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">All keywords matched!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Download & Share</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={data.generatedFile ? onDownload : onGenerateFile}
              className="flex-1"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {data.generatedFile ? "Download Resume" : "Generate & Download"}
            </Button>
            <Button
              variant="outline"
              onClick={handleUploadToDrive}
              disabled={isUploading || data.uploadedToDrive}
              className="flex-1"
              size="lg"
            >
              {data.uploadedToDrive ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Uploaded to Drive
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload to Google Drive"}
                </>
              )}
            </Button>
          </div>

          {data.uploadedToDrive && data.googleDriveMetadata && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Successfully uploaded to Google Drive
                </p>
              </div>
              <a
                href={data.googleDriveMetadata.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 dark:text-green-300 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open in Google Drive
              </a>
            </div>
          )}

          {data.generatedFile && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>File:</strong> {data.generatedFile.fileName} ({data.generatedFile.fileType.toUpperCase()})
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
