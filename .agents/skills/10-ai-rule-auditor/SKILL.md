---
name: ai-rule-auditor
description: >-
  Bounded AI integration guidelines for OCR text normalization, field mapping assistance,
  reviewer explanations, and statutory document comparison using Vercel AI SDK, Gemini, or Claude.
  Use when designing prompts, implementing AI-assisted text cleanup, generating violation summaries,
  or comparing regulatory amendment texts.
---

# AI Rule Auditor (Bounded LLM Assistant)

This skill defines the precise boundary, permissible tasks, and strict prohibitions for Large Language Model (LLM) components in **SIH PS26034**.

---

## 1. The Core Architectural Boundary

> [!CRITICAL]
> **THE LLM IS NOT THE LEGAL COMPLIANCE AUTHORITY.**
> An LLM must **NEVER**:
> 1. Make the final `PASS` or `FAIL` compliance decision.
> 2. Override, modify, or silence a deterministic rule verdict.
> 3. Autonomous modify or insert compliance rules into the database.
> 4. Invent, hallucinate, or extrapolate legal requirements not explicitly configured.
> 5. Fabricate evidence, bounding boxes, or observations.
> 6. Hide uncertainty or present guesses as legal certainties.

---

## 2. Permissible LLM Responsibilities

Large Language Models (via Vercel AI SDK, Gemini, Claude, or OpenAI) may be utilized strictly for:

1. **OCR Text Normalization**:
   Cleaning up noisy OCR artifacts (e.g., converting `M.R.P. Rs: 15O/-` to `MRP: 150.00`, fixing broken spacing or common character substitutions).
2. **Declaration Mapping Suggestions**:
   Proposing candidate field matches for unstructured text snippets (e.g., identifying whether an extracted address string corresponds to manufacturer, packer, or importer).
3. **Reviewer Explanations**:
   Generating natural-language explanations of a deterministic violation to assist field officers in understanding the legal rationale and citing the relevant statutory section.
4. **Inspection Summaries**:
   Synthesizing executive summaries of inspection batches for senior directors and regulatory dashboards.
5. **Ambiguity & Discrepancy Detection**:
   Flagging when two extracted declarations appear contradictory (e.g., manufacture date claims year 2028 when current year is 2026).
6. **Regulatory Document Ingestion Assistance**:
   Assisting administrators in comparing newly published gazette amendment PDF documents with the existing configured rule database to propose draft rule updates for human review.

---

## 3. Strict Prompting & Structured Output Guardrails

When integrating LLM completions:
- Always use **Structured Outputs** (JSON Schema / Zod validation).
- Every output field must cite its source token, bounding box, or rule code.
- Explicitly instruct the model to return `"confidence": low` and `"requires_human_review": true` whenever text is ambiguous or degraded.
- Prompt Template Pattern:

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

export const NormalizationSchema = z.object({
  field_name: z.string(),
  raw_token: z.string(),
  suggested_normalized_value: z.string(),
  confidence: z.number().min(0).max(1),
  ambiguity_detected: z.boolean(),
  reasoning: z.string(),
  source_evidence_ref: z.string()
});

export async function normalizeOcrField(rawText: string, fieldType: string) {
  return await generateObject({
    model: 'gemini-1.5-flash',
    schema: NormalizationSchema,
    system: `You are an OCR normalization assistant for Indian Legal Metrology declarations.
Normalize OCR typos strictly based on provided text.
DO NOT invent values.
DO NOT determine legal compliance.
If text is unreadable or missing, set ambiguity_detected: true and confidence < 0.5.`,
    prompt: `Field Type: ${fieldType}\nRaw OCR Text: "${rawText}"`
  });
}
```

---

## 4. Handling Uncertainty: The REVIEW Directive

Whenever an LLM-assisted normalization, extraction, or semantic mapping encounters:
- Low visual clarity
- Multiple conflicting interpretations
- Unknown regional terminology
- Confidence score below $0.75$

The system **must immediately route the entity to the `REVIEW` queue**. The field inspector or human auditor will make the authoritative determination.
