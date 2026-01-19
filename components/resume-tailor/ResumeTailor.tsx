"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  Download,
  RefreshCw,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ATSScoreComparison } from "./ATSScoreComparison";
import { TailorResults } from "./TailorResults";
import { ResumeTailorSettings } from "./ResumeTailorSettings";

type TailorState =
  | "input" // User entering information
  | "tailoring" // AI processing
  | "results" // Showing results
  | "settings"; // Advanced settings

type TailorData = {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeFile: File | null;
  resumeFileName: string;
  resumeText: string;
  tailoredResume: string;
  originalATSScore: number | null;
  improvedATSScore: number | null;
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

type ProgressStage = "analyzing" | "tailoring" | "ats-checking" | "generating";

export function ResumeTailor() {
  const [state, setState] = useState<TailorState>("input");
  const [showSettings, setShowSettings] = useState(false);
  const [progressStage, setProgressStage] = useState<ProgressStage>("analyzing");
  const [progress, setProgress] = useState(0);

  const [data, setData] = useState<TailorData>({
    jobTitle: "",
    companyName: "",
    jobDescription: "",
    resumeFile: null,
    resumeFileName: "",
    resumeText: "",
    tailoredResume: "",
    originalATSScore: null,
    improvedATSScore: null,
    matchedKeywords: [],
    missingKeywords: [],
    recommendations: [],
    uploadedToDrive: false,
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const updateData = (updates: Partial<TailorData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.match(/\.(pdf|docx)$/i)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/resume-parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to parse resume");
      }

      const result = await response.json();
      const resumeText = result.text || "";

      if (!resumeText.trim()) {
        throw new Error("Could not extract text from resume. Please ensure the file is not corrupted.");
      }

      updateData({
        resumeFile: file,
        resumeFileName: file.name,
        resumeText,
      });

      toast.success("Resume uploaded and parsed successfully");
    } catch (error) {
      console.error("Error parsing resume:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to parse resume. Please try again."
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleTailor = async () => {
    if (!data.jobTitle.trim() || !data.companyName.trim() || !data.jobDescription.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!data.resumeFile || !data.resumeText) {
      toast.error("Please upload your resume");
      return;
    }

    setState("tailoring");
    setProgress(0);
    setProgressStage("analyzing");

    try {
      // Step 1: Check original ATS score
      setProgressStage("analyzing");
      setProgress(20);
      toast.info("Analyzing original resume...");

      const originalATSResponse = await fetch("/api/ats-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: data.jobTitle,
          jobDescription: data.jobDescription,
          tailoredResumeText: data.resumeText,
        }),
      });

      if (!originalATSResponse.ok) {
        throw new Error("Failed to analyze original resume");
      }

      const originalATSData = await originalATSResponse.json();
      updateData({ originalATSScore: originalATSData.ats_score || 0 });

      // Step 2: Tailor resume
      setProgressStage("tailoring");
      setProgress(40);
      toast.info("Tailoring resume with AI...");

      const tailorResponse = await fetch("/api/resume-tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: data.jobTitle,
          jobDescription: data.jobDescription,
          resumeText: data.resumeText,
        }),
      });

      if (!tailorResponse.ok) {
        const errorData = await tailorResponse.json();
        throw new Error(errorData.error || "Failed to tailor resume");
      }

      const tailorResult = await tailorResponse.json();
      const formattedResume = formatTailoredResume(
        tailorResult.profile_title,
        tailorResult.professional_summary,
        tailorResult.tailored_experience,
        data.resumeText
      );

      updateData({ tailoredResume: formattedResume });

      // Step 3: Check improved ATS score
      setProgressStage("ats-checking");
      setProgress(70);
      toast.info("Checking improved ATS score...");

      const improvedATSResponse = await fetch("/api/ats-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: data.jobTitle,
          jobDescription: data.jobDescription,
          tailoredResumeText: formattedResume,
        }),
      });

      if (!improvedATSResponse.ok) {
        throw new Error("Failed to check improved ATS score");
      }

      const improvedATSData = await improvedATSResponse.json();
      updateData({
        improvedATSScore: improvedATSData.ats_score || 0,
        matchedKeywords: improvedATSData.matched_keywords || [],
        missingKeywords: improvedATSData.missing_keywords || [],
        recommendations: improvedATSData.recommendations || [],
      });

      // Step 4: Generate file (optional, can be done later)
      setProgressStage("generating");
      setProgress(90);

      setProgress(100);
      setState("results");
      toast.success("Resume tailored successfully!");
    } catch (error) {
      console.error("Error tailoring resume:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to tailor resume. Please try again."
      );
      setState("input");
    }
  };

  const formatTailoredResume = (
    profileTitle: string,
    professionalSummary: string,
    tailoredExperience: any[],
    originalResume: string
  ): string => {
    let resume = `${profileTitle}\n\n`;
    resume += `PROFESSIONAL SUMMARY\n${professionalSummary}\n\n`;
    resume += `EXPERIENCE\n`;

    tailoredExperience.forEach((exp) => {
      resume += `${exp.jobTitle} | ${exp.company}\n`;
      exp.bullets?.forEach((bullet: string) => {
        resume += `• ${bullet}\n`;
      });
      resume += `\n`;
    });

    return resume;
  };

  const handleRetailor = () => {
    setState("input");
    updateData({
      tailoredResume: "",
      originalATSScore: null,
      improvedATSScore: null,
      matchedKeywords: [],
      missingKeywords: [],
      recommendations: [],
    });
  };

  const handleDownload = async () => {
    if (!data.generatedFile) {
      toast.info("Generating resume file...");
      await handleGenerateFile();
      return;
    }

    try {
      if (data.generatedFile.downloadUrl.startsWith("data:")) {
        const response = await fetch("/api/resume-download", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.generatedFile.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        window.open(data.generatedFile.downloadUrl, "_blank");
      }
      toast.success("Resume downloaded successfully");
    } catch (error) {
      console.error("Error downloading resume:", error);
      toast.error("Failed to download resume");
    }
  };

  const handleGenerateFile = async () => {
    if (!data.tailoredResume) {
      toast.error("No tailored resume available");
      return;
    }

    try {
      const response = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tailoredResumeText: data.tailoredResume,
          templateId: "modern",
          fileFormat: "pdf",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate resume");
      }

      const result = await response.json();
      updateData({ generatedFile: result });
      toast.success("Resume file generated successfully");
    } catch (error) {
      console.error("Error generating file:", error);
      toast.error("Failed to generate resume file");
    }
  };

  if (showSettings) {
    return (
      <ResumeTailorSettings
        onClose={() => setShowSettings(false)}
        onSave={() => {
          setShowSettings(false);
          toast.success("Settings saved");
        }}
      />
    );
  }

  if (state === "tailoring") {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                  <Sparkles className="h-8 w-8 text-primary absolute -top-2 -right-2 animate-pulse" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Tailoring Your Resume</h2>
                <p className="text-muted-foreground">
                  {progressStage === "analyzing" && "Analyzing your original resume..."}
                  {progressStage === "tailoring" && "Optimizing content with AI..."}
                  {progressStage === "ats-checking" && "Checking ATS compatibility..."}
                  {progressStage === "generating" && "Finalizing improvements..."}
                </p>
              </div>
              <div className="max-w-md mx-auto">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "results") {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Resume Tailored</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={handleRetailor}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-tailor
            </Button>
          </div>
        </div>

        <ATSScoreComparison
          originalScore={data.originalATSScore}
          improvedScore={data.improvedATSScore}
        />

        <TailorResults
          data={data}
          onDownload={handleDownload}
          onGenerateFile={handleGenerateFile}
          updateData={updateData}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Resume Tailor</h1>
        <Button variant="outline" onClick={() => setShowSettings(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tailor Your Resume</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Enter job details and upload your resume. We'll optimize it for ATS and the role.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                placeholder="e.g., Senior Software Engineer"
                value={data.jobTitle}
                onChange={(e) => updateData({ jobTitle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="e.g., Tech Corp Inc."
                value={data.companyName}
                onChange={(e) => updateData({ companyName: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="jobDescription">Job Description *</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the job description here..."
              value={data.jobDescription}
              onChange={(e) => updateData({ jobDescription: e.target.value })}
              className="mt-1 min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {data.jobDescription.length} characters
            </p>
          </div>

          <Separator />

          <div>
            <Label>Resume File *</Label>
            {!data.resumeFile ? (
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors mt-2",
                  isDragging ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50",
                  isParsing && "opacity-50 pointer-events-none"
                )}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                    <p className="text-lg font-medium">Parsing resume...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">Drag and drop your resume here</p>
                    <p className="text-sm text-muted-foreground mb-4">or</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-4">
                      Accepted: PDF, DOCX (Max 5MB)
                    </p>
                  </>
                )}
              </div>
            ) : (
              <Card className="mt-2 border-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{data.resumeFileName}</h3>
                        <Badge variant="outline">Ready</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {data.resumeText ? "Content extracted" : "Ready to process"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        updateData({
                          resumeFile: null,
                          resumeFileName: "",
                          resumeText: "",
                        });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          <Button
            onClick={handleTailor}
            disabled={
              !data.jobTitle.trim() ||
              !data.companyName.trim() ||
              !data.jobDescription.trim() ||
              !data.resumeFile ||
              !data.resumeText
            }
            className="w-full"
            size="lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Tailor Resume
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
