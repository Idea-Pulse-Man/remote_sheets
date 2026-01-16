import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";

export type ATSKeywords = {
  technical_skills: string[];
  tools_and_technologies: string[];
  job_responsibilities: string[];
  industry_terms: string[];
};

export type TailoredExperience = {
  job_title: string;
  company: string;
  bullets: string[];
};

export type TailorResumeResponse = {
  ats_keywords: ATSKeywords;
  profile_title: string;
  professional_summary: string;
  tailored_experience: TailoredExperience[];
};

export type TailorResumeInput = {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
};

const SYSTEM_PROMPT = `You are an ATS-optimized resume tailoring engine.

Your role is to tailor an existing resume to a specific Job Description
while remaining strictly truthful and ATS-safe.

You MUST:
- Use ONLY information already present or clearly implied in the resume
- Never invent experience, skills, companies, tools, or metrics
- Use ATS-safe plain text only
- Focus on hard skills, tools, and responsibilities
- Optimize keyword alignment with the Job Description

You MUST NOT:
- Clean or rewrite the job description
- Add new roles or responsibilities
- Use first-person language
- Use emojis, icons, tables, markdown, or formatting symbols
- Provide explanations or commentary

You MUST return VALID JSON ONLY.
No extra text.
`;

function createUserPrompt(input: TailorResumeInput): string {
  return `Job Title: ${input.jobTitle}

Job Description:
${input.jobDescription}

Original Resume Text:
${input.resumeText}

====================
TASKS
====================

1. Extract ATS keywords from the Job Description and categorize them into:
   - technical_skills
   - tools_and_technologies
   - job_responsibilities
   - industry_terms

2. Generate ATS-optimized resume content tailored to the Job Description:
   - Profile title (6–12 words, exact or near-exact job title preferred)
   - Professional summary (2–3 concise sentences, keyword-dense)
   - Tailored experience bullets:
       - Rewrite ONLY existing experience
       - Use action verbs
       - Include metrics ONLY if already implied
       - 3–5 bullets per role
       - Plain text, ATS-safe

====================
OUTPUT FORMAT (JSON ONLY)
====================

{
  "ats_keywords": {
    "technical_skills": [],
    "tools_and_technologies": [],
    "job_responsibilities": [],
    "industry_terms": []
  },
  "profile_title": "",
  "professional_summary": "",
  "tailored_experience": [
    {
      "job_title": "",
      "company": "",
      "bullets": [
        "",
        "",
        "",
        ""
      ]
    }
  ]
}
`;
}

function validateResponse(data: any): data is TailorResumeResponse {
  if (!data || typeof data !== "object") return false;

  // Validate ats_keywords
  if (!data.ats_keywords || typeof data.ats_keywords !== "object") return false;
  const requiredKeywordFields = [
    "technical_skills",
    "tools_and_technologies",
    "job_responsibilities",
    "industry_terms",
  ];
  for (const field of requiredKeywordFields) {
    if (!Array.isArray(data.ats_keywords[field])) return false;
  }

  // Validate profile_title
  if (typeof data.profile_title !== "string" || !data.profile_title.trim())
    return false;

  // Validate professional_summary
  if (
    typeof data.professional_summary !== "string" ||
    !data.professional_summary.trim()
  )
    return false;

  // Validate tailored_experience
  if (!Array.isArray(data.tailored_experience)) return false;
  for (const exp of data.tailored_experience) {
    if (typeof exp.job_title !== "string" || !exp.job_title.trim()) return false;
    if (typeof exp.company !== "string" || !exp.company.trim()) return false;
    if (!Array.isArray(exp.bullets)) return false;
    for (const bullet of exp.bullets) {
      if (typeof bullet !== "string" || !bullet.trim()) return false;
    }
  }

  return true;
}

/**
 * Parse proxy configuration from environment variable
 * Format: host:port:username:password
 */
function getProxyAgent() {
  const proxyConfig = process.env.OPENAI_PROXY;
  if (!proxyConfig) {
    return undefined;
  }

  try {
    // Remove quotes and trim whitespace
    const cleanedConfig = proxyConfig.replace(/^["']|["']$/g, "").trim();
    
    // Parse proxy format: host:port:username:password
    const parts = cleanedConfig.split(":");
    if (parts.length >= 4) {
      const [host, port, username, ...passwordParts] = parts;
      // Join password parts in case password contains colons
      const password = passwordParts.join(":");
      const proxyUrl = `http://${username}:${password}@${host}:${port}`;
      return new HttpsProxyAgent(proxyUrl);
    }
  } catch (error) {
    console.error("Failed to parse proxy configuration:", error);
  }

  return undefined;
}

export async function tailorResumeWithOpenAI(
  input: TailorResumeInput
): Promise<TailorResumeResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  // Support custom base URL for proxy/alternative endpoints
  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  
  // Configure proxy agent if proxy is set
  const httpAgent = getProxyAgent();

  const openai = new OpenAI({
    apiKey: apiKey,
    ...(baseURL && { baseURL }),
    ...(httpAgent && { httpAgent }),
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: createUserPrompt(input) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent, factual output
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
    }

    if (!validateResponse(parsedData)) {
      throw new Error("OpenAI response validation failed");
    }

    return parsedData;
  } catch (error: any) {
    // Handle specific OpenAI API errors
    if (error?.status === 403 || error?.message?.includes("403")) {
      if (error?.message?.includes("Country") || error?.message?.includes("region") || error?.message?.includes("territory")) {
        throw new Error(
          "OpenAI API is not available in your region. Please use a VPN or contact your administrator to configure an alternative endpoint."
        );
      }
      throw new Error("OpenAI API access forbidden. Please check your API key and account status.");
    }
    
    if (error?.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your environment variables.");
    }
    
    if (error?.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later.");
    }
    
    if (error instanceof Error) {
      // Check if it's already a formatted error message
      if (error.message.startsWith("OpenAI API error:")) {
        throw error;
      }
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
}
