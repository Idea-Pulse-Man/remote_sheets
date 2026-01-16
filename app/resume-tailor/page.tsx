"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import JobsLayout from "../jobs-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepProgress } from "@/components/resume-tailor/StepProgress";
import { StepJDInput } from "@/components/resume-tailor/StepJDInput";
import { StepResumeUpload } from "@/components/resume-tailor/StepResumeUpload";
import { StepTailorResume } from "@/components/resume-tailor/StepTailorResume";
import { StepATSCheck } from "@/components/resume-tailor/StepATSCheck";
import { StepTemplateSelect } from "@/components/resume-tailor/StepTemplateSelect";
import { StepGenerate } from "@/components/resume-tailor/StepGenerate";
import { StepUploadDownload } from "@/components/resume-tailor/StepUploadDownload";
import { StepSaveConfirm } from "@/components/resume-tailor/StepSaveConfirm";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ResumeTailorData = {
  // Step 1
  jobTitle: string;
  companyName: string;
  jdInputMethod: "paste" | "url";
  jobDescription: string;
  jdConfirmed: boolean;

  // Step 2
  resumeFile: File | null;
  resumeFileName: string;
  resumeFileSize: string;
  resumeText: string;

  // Step 3
  tailoredResume: string;
  isTailored: boolean;
  manualEditMode: boolean;

  // Step 4
  atsScore: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  weakKeywords?: string[];
  recommendations?: string[];
  atsKeywords?: {
    technical_skills: string[];
    tools_and_technologies: string[];
    job_responsibilities: string[];
    industry_terms: string[];
  };

  // Step 5
  selectedTemplate: string | null;
  fileFormat: "pdf" | "docx";

  // Step 6
  resumeGenerated: boolean;
  generatedFile?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    downloadUrl: string;
  };

  // Step 7
  uploadedToDrive: boolean;
  googleDriveMetadata?: {
    fileId: string;
    fileUrl: string;
    uploadedAt: string;
  };
  jobId?: string | number;

  // Step 8
  savedToJob: boolean;
};

const TOTAL_STEPS = 8;

export default function ResumeTailorPage() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<ResumeTailorData>({
    jobTitle: "",
    companyName: "",
    jdInputMethod: "paste",
    jobDescription: "",
    jdConfirmed: false,
    resumeFile: null,
    resumeFileName: "",
    resumeFileSize: "",
    resumeText: "",
    tailoredResume: "",
    isTailored: false,
    manualEditMode: false,
    atsScore: null,
    matchedKeywords: [],
    missingKeywords: [],
    weakKeywords: [],
    recommendations: [],
    selectedTemplate: null,
    fileFormat: "pdf",
    resumeGenerated: false,
    uploadedToDrive: false,
    savedToJob: false,
    jobId: undefined,
  });

  // Extract jobId from URL params if available
  useEffect(() => {
    const jobIdParam = searchParams?.get("jobId");
    if (jobIdParam && !data.jobId) {
      updateData({ jobId: jobIdParam });
    }
  }, [searchParams]);

  const updateData = (updates: Partial<ResumeTailorData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return data.jdConfirmed;
      case 2:
        return data.resumeFile !== null;
      case 3:
        return data.isTailored && data.atsScore !== null;
      case 4:
        return true; // ATS check is read-only, can always proceed
      case 5:
        return data.selectedTemplate !== null;
      case 6:
        return data.resumeGenerated;
      case 7:
        return true; // Upload is optional
      case 8:
        return true; // Final step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNext() && currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepJDInput data={data} updateData={updateData} />;
      case 2:
        return <StepResumeUpload data={data} updateData={updateData} />;
      case 3:
        return (
          <StepTailorResume
            data={{
              jobTitle: data.jobTitle,
              jobDescription: data.jobDescription,
              resumeFileName: data.resumeFileName,
              resumeText: data.resumeText,
              tailoredResume: data.tailoredResume,
              isTailored: data.isTailored,
              atsKeywords: data.atsKeywords,
              atsScore: data.atsScore,
            }}
            updateData={updateData}
          />
        );
      case 4:
        return (
          <StepATSCheck
            data={{
              jobTitle: data.jobTitle,
              jobDescription: data.jobDescription,
              tailoredResume: data.tailoredResume,
              atsScore: data.atsScore,
              matchedKeywords: data.matchedKeywords,
              missingKeywords: data.missingKeywords,
              weakKeywords: data.weakKeywords,
              recommendations: data.recommendations,
            }}
            updateData={updateData}
          />
        );
      case 5:
        return <StepTemplateSelect data={data} updateData={updateData} />;
      case 6:
        return (
          <StepGenerate
            data={{
              jobTitle: data.jobTitle,
              companyName: data.companyName,
              resumeFileName: data.resumeFileName,
              tailoredResume: data.tailoredResume,
              selectedTemplate: data.selectedTemplate,
              fileFormat: data.fileFormat,
              resumeGenerated: data.resumeGenerated,
            }}
            updateData={updateData}
          />
        );
      case 7:
        return (
          <StepUploadDownload
            data={{
              generatedFile: data.generatedFile,
              uploadedToDrive: data.uploadedToDrive,
              googleDriveMetadata: data.googleDriveMetadata,
              jobId: data.jobId,
            }}
            updateData={updateData}
          />
        );
      case 8:
        return <StepSaveConfirm data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  return (
    <JobsLayout>
      <div className="w-full mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Resume Tailor</h1>

        <StepProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Step {currentStep} of {TOTAL_STEPS}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < TOTAL_STEPS ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset or navigate away
                    window.location.href = "/";
                  }}
                >
                  Finish
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </JobsLayout>
  );
}
