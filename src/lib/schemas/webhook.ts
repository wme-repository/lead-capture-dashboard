import { z } from "zod";

export const StandardLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  pagina_captura: z.string().optional(),
  pesquisa: z.string().optional(),
  grupo: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  lp: z.string().optional(),
});

export const QuestionnaireLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  answers: z.record(z.string(), z.unknown()),
  score: z.number().int().min(0),
  grade: z.enum(["A", "B", "C", "D"]),
});

export type StandardLead = z.infer<typeof StandardLeadSchema>;
export type QuestionnaireLead = z.infer<typeof QuestionnaireLeadSchema>;
