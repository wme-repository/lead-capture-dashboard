"use client";

import { useState, useMemo } from "react";
import type {
  SurveyData, SurveyQuestionStats, SurveyQualityRow, SurveyLeadRow,
  SurveyAnswerStats,
} from "@/lib/dashboard-v2";

const SURVEY_QUESTION_LABELS: Record<string, string> = {
  nivel_concursos: "Nível no mundo dos concursos",
  estudou_tribunal: "Já estudou para concurso de Tribunal?",
  conhece_thallius: "Conhece o Prof. Thallius Moraes?",
  motivo_projeto: "Principal motivo para participar",
  idade: "Idade",
  renda: "Renda mensal",
  genero: "Gênero",
  escolaridade: "Escolaridade",
  situacao: "Situação atual",
  tempo_esquadrao: "Há quanto tempo conhece o Esquadrão?",
  expectativas: "Expectativas em relação ao projeto",
};
import {
  Search, Copy, Check, X, Eye, Filter, Download,
  ChevronDown, ChevronUp, AlertTriangle, TrendingUp,
  BarChart3, XCircle, Info, CheckCircle2, Inbox,
  ArrowUpRight, ArrowDownRight, Lightbulb, Target,
  Users, Award, Sparkles,
} from "lucide-react";
import { ComboChart } from "./combo-chart";
import { DonutChart } from "./donut-chart";
import { HorizontalBars } from "./horizontal-bars";

type Props = { survey: SurveyData };

// Fix broken UTF-8 replacement chars (U+FFFD) from data ingestion
const ENCODING_FIXES: Record<string, string> = {
  "N�o": "Não",
  "P�s-gradua��o": "Pós-graduação",
  "Aprova��o no TRT at� 2027": "Aprovação no TRT até 2027",
  "Passar no pr�ximo concurso": "Passar no próximo concurso",
  "Aprova��o r�pida": "Aprovação rápida",
  "Revis�o de conte�do": "Revisão de conteúdo",
  "Avan�ado": "Avançado",
  "Intermedi�rio": "Intermediário",
  "Jo�o Teste 2": "João Teste 2",
};
function fix(s: string | null | undefined): string {
  if (!s) return "";
  return ENCODING_FIXES[s] ?? s.replace(/�/g, "?");
}

// ── Theme constants (DashFacil dark) ─────────────────────────────
const BG = "#0d1117";
const CARD = "#161b22";
const BORDER = "#30363d";
const BORDER2 = "#21262d";
const TEXT = "#c9d1d9";
const MUTED = "#8b949e";
const ACCENT = "#58a6ff";
const GREEN = "#3fb950";
const RED = "#f85149";
const YELLOW = "#d29922";
const PURPLE = "#a371f7";

const GRADE_COLORS: Record<string, string> = { A: GREEN, B: ACCENT, C: YELLOW, D: RED, none: "#484f58" };

// Question groupings
const PROFILE_KEYS = ["idade", "genero", "escolaridade", "renda", "situacao"];
const MATURITY_KEYS = ["conhece_thallius", "tempo_esquadrao", "motivo_projeto", "expectativas", "estudou_tribunal", "nivel_concursos"];

function InsightIcon({ name, type }: { name: string; type: string }) {
  const cls = `shrink-0 mt-0.5 ${
    type === "danger" ? "text-red-500" :
    type === "warning" ? "text-amber-500" :
    type === "success" ? "text-green-500" : "text-blue-500"
  }`;
  switch (name) {
    case "AlertTriangle": return <AlertTriangle size={14} className={cls} />;
    case "TrendingUp": return <TrendingUp size={14} className={cls} />;
    case "BarChart3": return <BarChart3 size={14} className={cls} />;
    case "XCircle": return <XCircle size={14} className={cls} />;
    case "CheckCircle": return <CheckCircle2 size={14} className={cls} />;
    default: return <Info size={14} className={cls} />;
  }
}

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade || grade === "none") return <span style={{ color: "#484f58" }}>—</span>;
  const color = GRADE_COLORS[grade] ?? MUTED;
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold" style={{ background: `${color}22`, color }}>
      {grade}
    </span>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const bg = rec === "Usar na copy" ? `${GREEN}22` :
             rec === "Segmentar" ? `${ACCENT}22` :
             rec === "Nutrir" ? `${YELLOW}22` :
             rec === "Evitar priorizar" ? `${RED}22` :
             rec === "Revisar promessa" ? `${PURPLE}22` : `${MUTED}22`;
  const color = rec === "Usar na copy" ? GREEN :
                rec === "Segmentar" ? ACCENT :
                rec === "Nutrir" ? YELLOW :
                rec === "Evitar priorizar" ? RED :
                rec === "Revisar promessa" ? PURPLE : MUTED;
  return <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap" style={{ background: bg, color }}>{rec}</span>;
}

function SectionBlock({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: BG, border: `1px solid ${BORDER}` }}>
      <div className="mb-4 flex items-center gap-2 text-base font-semibold" style={{ color: TEXT }}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ChartCard({ title, children, subtitle }: { title: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
      <div className="mb-3">
        <div className="text-sm font-semibold" style={{ color: TEXT }}>{title}</div>
        {subtitle && <div className="text-[10px] mt-0.5" style={{ color: MUTED }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function QuestionChart({ q }: { q: SurveyQuestionStats }) {
  if (q.answers.length === 0) return <div className="text-xs py-4 text-center" style={{ color: MUTED }}>Sem respostas</div>;

  const useDonut = q.answers.length <= 5;
  const sorted = [...q.answers].sort((a, b) => b.count - a.count);
  const palette = [ACCENT, GREEN, YELLOW, PURPLE, RED, "#f78166", "#79c0ff", "#d2a8ff", "#56d364", "#e3b341"];

  if (useDonut) {
    return (
      <div className="flex flex-col gap-4">
        <DonutChart data={sorted.map((a, i) => ({ label: fix(a.value), value: a.count, color: palette[i % palette.length] }))} size={160} thickness={24} />
        <div className="space-y-1.5">
          {sorted.map((a, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: palette[i % palette.length] }} />
                <span className="truncate" style={{ color: TEXT }} title={fix(a.value)}>{fix(a.value)}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span style={{ color: MUTED }}>{a.pct}% ({a.count})</span>
                {a.avgScore != null && <span className="font-medium" style={{ color: PURPLE }}>⌀ {a.avgScore}</span>}
              </div>
            </div>
          ))}
        </div>
        {sorted[0]?.avgScore != null && (
          <div className="text-[11px] pt-1 border-t" style={{ borderColor: BORDER2, color: MUTED }}>
            Leadscore médio: <span className="font-medium" style={{ color: PURPLE }}>{sorted.reduce((s, a) => s + (a.avgScore ?? 0) * a.count, 0) / sorted.reduce((s, a) => s + (a.avgScore != null ? a.count : 0), 0) | 0}</span>
          </div>
        )}
      </div>
    );
  }

  // Horizontal bars for many options
  return (
    <div className="space-y-1.5">
      {sorted.slice(0, 10).map((a, i) => {
        const maxCount = sorted[0].count;
        return (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="truncate shrink-0 text-right" style={{ width: 140, color: TEXT }} title={fix(a.value)}>{fix(a.value)}</span>
            <div className="flex-1 h-5 rounded relative overflow-hidden" style={{ background: `${BORDER2}` }}>
              <div className="h-full rounded" style={{ width: `${(a.count / maxCount) * 100}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}88)`, transition: "width 300ms" }} />
            </div>
            <span className="shrink-0 w-16 text-right" style={{ color: MUTED }}>{a.pct}% ({a.count})</span>
            {a.avgScore != null && <span className="shrink-0 w-10 text-right font-medium" style={{ color: PURPLE }}>{a.avgScore}</span>}
          </div>
        );
      })}
      {sorted.length > 10 && <div className="text-[10px] text-center pt-1" style={{ color: MUTED }}>+{sorted.length - 10} respostas</div>}
    </div>
  );
}

export default function PesquisaTab({ survey }: Props) {
  const [selectedLead, setSelectedLead] = useState<SurveyLeadRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(0);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [qualityTab, setQualityTab] = useState<"best" | "worst">("best");
  const PAGE_SIZE = 10;

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const s = survey;

  if (s.totalResponses === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Inbox size={32} style={{ color: MUTED }} />
        <div className="text-sm font-medium" style={{ color: TEXT }}>Nenhuma resposta encontrada.</div>
        <div className="text-xs" style={{ color: MUTED }}>Não há dados de pesquisa para o período ou filtros selecionados.</div>
      </div>
    );
  }

  const profileQuestions = s.questions.filter(q => PROFILE_KEYS.includes(q.key));
  const maturityQuestions = s.questions.filter(q => MATURITY_KEYS.includes(q.key));
  const rendaQ = s.questions.find(q => q.key === "renda");
  const situacaoQ = s.questions.find(q => q.key === "situacao");
  const tribunalQ = s.questions.find(q => q.key === "estudou_tribunal");
  const nivelQ = s.questions.find(q => q.key === "nivel_concursos");
  const motivoQ = s.questions.find(q => q.key === "motivo_projeto");

  const tableLeads = s.leads.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(s.leads.length / PAGE_SIZE);

  const visibleInsights = showAllInsights ? s.insights : s.insights.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs" style={{ color: MUTED }}>Analise as respostas do questionário, perfil dos leads e qualidade por segmento.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
        {[
          { label: "Respostas totais", value: s.totalResponses.toLocaleString("pt-BR"), color: "" },
          { label: "Taxa de resposta", value: `${s.responseRate}%`, color: "" },
          { label: "Leads qualificados", value: s.qualifiedCount.toLocaleString("pt-BR"), sub: `${s.totalResponses > 0 ? Math.round((s.qualifiedCount / s.totalResponses) * 100) : 0}% do total`, color: "green" },
          { label: "Leadscore médio", value: s.avgScore != null ? s.avgScore.toString() : "—", color: "purple" },
          { label: "Leadscore mediano", value: s.medianScore != null ? s.medianScore.toString() : "—", color: "" },
          { label: "Faixa predominante", value: s.topGrade ?? "—", color: s.topGrade === "A" ? "green" : s.topGrade === "B" ? "blue" : s.topGrade === "C" ? "amber" : s.topGrade === "D" ? "red" : "" },
          { label: "% Faixa A", value: `${s.gradePcts.A}%`, sub: `${s.grades.A} leads`, color: "green" },
          { label: "% Faixa B", value: `${s.gradePcts.B}%`, sub: `${s.grades.B} leads`, color: "blue" },
          { label: "% Faixa C", value: `${s.gradePcts.C}%`, sub: `${s.grades.C} leads`, color: "amber" },
          { label: "% Faixa D", value: `${s.gradePcts.D}%`, sub: `${s.grades.D} leads`, color: "red" },
          { label: "Perfil com maior qualidade", value: s.bestProfile ? s.bestProfile.label : "—", sub: s.bestProfile ? `Leadscore médio: ${s.bestProfile.avgScore}` : undefined, color: "" },
          { label: "Pergunta mais decisiva", value: s.mostDecisiveQuestion ? s.mostDecisiveQuestion.label : "—", sub: s.mostDecisiveQuestion ? `Diferença média: ${s.mostDecisiveQuestion.spread} pts` : undefined, color: "" },
        ].map((c, i) => {
          const bgColor = c.color === "green" ? "rgba(63,185,80,0.08)" :
                         c.color === "blue" ? "rgba(88,166,255,0.08)" :
                         c.color === "amber" ? "rgba(210,153,34,0.08)" :
                         c.color === "red" ? "rgba(248,81,73,0.08)" :
                         c.color === "purple" ? "rgba(163,113,247,0.08)" : "";
          const textColor = c.color === "green" ? GREEN :
                           c.color === "blue" ? ACCENT :
                           c.color === "amber" ? YELLOW :
                           c.color === "red" ? RED :
                           c.color === "purple" ? PURPLE : TEXT;
          return (
            <div key={i} className="rounded-xl p-3" style={{ background: bgColor || CARD, border: `1px solid ${BORDER2}` }}>
              <div className="text-[11px] font-medium truncate" style={{ color: MUTED }} title={c.label}>{c.label}</div>
              <div className="mt-1 text-xl font-bold truncate" style={{ color: textColor }} title={fix(c.value)}>{fix(c.value)}</div>
              {c.sub && <div className="text-[10px] truncate" style={{ color: MUTED }}>{c.sub}</div>}
            </div>
          );
        })}
      </div>

      {/* Visão geral da pesquisa */}
      <SectionBlock title="Visão geral da pesquisa" icon={<BarChart3 size={16} style={{ color: ACCENT }} />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Distribuição por faixa */}
          <ChartCard title="Distribuição por faixa do lead">
            <DonutChart data={[
              { label: `Faixa A`, value: s.grades.A, color: GREEN },
              { label: `Faixa B`, value: s.grades.B, color: ACCENT },
              { label: `Faixa C`, value: s.grades.C, color: YELLOW },
              { label: `Faixa D`, value: s.grades.D, color: RED },
              { label: `Sem nota`, value: s.grades.none, color: "#484f58" },
            ].filter(d => d.value > 0)} size={160} thickness={24} />
            <div className="mt-3 flex items-center gap-3 text-[11px]" style={{ color: MUTED }}>
              <span>Leadscore médio por faixa:</span>
            </div>
            <div className="mt-1 flex gap-2">
              {(["A", "B", "C", "D"] as const).map(g => {
                const q = s.questions[0]; // use any question to get per-grade average
                return (
                  <span key={g} className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${GRADE_COLORS[g]}22`, color: GRADE_COLORS[g] }}>
                    {g}
                  </span>
                );
              })}
            </div>
          </ChartCard>

          {/* Leadscore ao longo do tempo */}
          <ChartCard title="Leadscore médio, volume de respostas e qualificados ao longo do tempo">
            {s.daily.every(d => d.responses === 0) ? (
              <div className="flex items-center justify-center py-10 text-xs" style={{ color: MUTED }}>Sem dados no período</div>
            ) : (
              <ComboChart
                data={s.daily.map(d => ({
                  label: d.label,
                  bar: d.responses,
                  lines: { score: d.avgScore ?? 0, qualified: d.qualifiedCount },
                }))}
                barLabel="Respostas"
                barColor={ACCENT}
                height={280}
                lines={[
                  { key: "score", color: PURPLE, label: "Leadscore médio" },
                  { key: "qualified", color: GREEN, label: "Leads qualificados" },
                ]}
              />
            )}
          </ChartCard>

          {/* Distribuição do leadscore */}
          <ChartCard title="Distribuição do leadscore">
            {s.scoreDistribution.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center py-10 text-xs" style={{ color: MUTED }}>Sem scores</div>
            ) : (
              <div className="space-y-2">
                {s.scoreDistribution.map((b, i) => {
                  const maxCount = Math.max(...s.scoreDistribution.map(d => d.count), 1);
                  const colors = [RED, YELLOW, ACCENT, PURPLE, GREEN];
                  return (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="shrink-0 w-14 text-right" style={{ color: TEXT }}>{b.label}</span>
                      <div className="flex-1 h-6 rounded relative overflow-hidden" style={{ background: BORDER2 }}>
                        <div className="h-full rounded flex items-center" style={{ width: `${(b.count / maxCount) * 100}%`, background: colors[i], transition: "width 300ms" }}>
                          {b.count > 0 && <span className="pl-2 text-[10px] font-bold text-white">{b.pct}%</span>}
                        </div>
                      </div>
                      <span className="shrink-0 w-16 text-right" style={{ color: MUTED }}>{b.pct}% ({b.count})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Perfil do público */}
      <SectionBlock title="Perfil do público" icon={<Users size={16} style={{ color: ACCENT }} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {profileQuestions.map(q => (
            <ChartCard key={q.key} title={q.label} subtitle={`${q.totalResponses} respostas`}>
              <QuestionChart q={q} />
            </ChartCard>
          ))}
        </div>
      </SectionBlock>

      {/* Maturidade e intenção */}
      <SectionBlock title="Maturidade e intenção" icon={<Target size={16} style={{ color: PURPLE }} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {maturityQuestions.filter(q => q.totalResponses > 0).map(q => (
            <ChartCard key={q.key} title={q.label} subtitle={`${q.totalResponses} respostas`}>
              <QuestionChart q={q} />
            </ChartCard>
          ))}
        </div>
      </SectionBlock>

      {/* Qualidade por resposta */}
      <SectionBlock title="Qualidade por resposta" icon={<Award size={16} style={{ color: GREEN }} />}>
        <div className="flex gap-4 mb-4 border-b" style={{ borderColor: BORDER }}>
          <button onClick={() => setQualityTab("best")} className="pb-2 text-sm font-medium border-b-2 transition-colors"
            style={{ borderColor: qualityTab === "best" ? GREEN : "transparent", color: qualityTab === "best" ? GREEN : MUTED }}>
            Respostas com maior qualidade
          </button>
          <button onClick={() => setQualityTab("worst")} className="pb-2 text-sm font-medium border-b-2 transition-colors"
            style={{ borderColor: qualityTab === "worst" ? RED : "transparent", color: qualityTab === "worst" ? RED : MUTED }}>
            Respostas com menor qualidade
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER2}` }}>
                {(qualityTab === "best"
                  ? ["Pergunta", "Resposta", "Leads", "%", "Score médio", "Score med.", "% A", "% B", "% Qualif.", "Faixa", "Recomendação"]
                  : ["Pergunta", "Resposta", "Leads", "Score médio", "% C/D", "Recomendação"]
                ).map((h, i) => (
                  <th key={i} className="text-left py-2 px-2 font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(qualityTab === "best" ? s.bestAnswers : s.worstAnswers).map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER2}` }} className="hover:bg-white/5 transition-colors">
                  <td className="py-2 px-2 max-w-[160px] truncate" style={{ color: MUTED }} title={r.question}>{r.question}</td>
                  <td className="py-2 px-2 max-w-[180px] truncate font-medium" style={{ color: TEXT }} title={r.answer}>
                    {r.answer}
                    {r.smallSample && <span className="ml-1 text-[9px] px-1 py-0.5 rounded" style={{ background: `${YELLOW}22`, color: YELLOW }}>amostra pequena</span>}
                  </td>
                  <td className="py-2 px-2" style={{ color: TEXT }}>{r.leads}</td>
                  {qualityTab === "best" && (
                    <>
                      <td className="py-2 px-2" style={{ color: MUTED }}>{r.pct}%</td>
                      <td className="py-2 px-2 font-bold" style={{ color: PURPLE }}>{r.avgScore ?? "—"}</td>
                      <td className="py-2 px-2" style={{ color: MUTED }}>{r.medianScore ?? "—"}</td>
                      <td className="py-2 px-2" style={{ color: GREEN }}>{r.pctA}%</td>
                      <td className="py-2 px-2" style={{ color: ACCENT }}>{r.pctB}%</td>
                      <td className="py-2 px-2" style={{ color: GREEN }}>{r.qualifiedPct}%</td>
                      <td className="py-2 px-2"><GradeBadge grade={r.topGrade} /></td>
                    </>
                  )}
                  {qualityTab === "worst" && (
                    <>
                      <td className="py-2 px-2 font-bold" style={{ color: PURPLE }}>{r.avgScore ?? "—"}</td>
                      <td className="py-2 px-2" style={{ color: RED }}>{r.leads > 0 ? Math.round(((r.leads - r.leads * r.qualifiedPct / 100) / r.leads) * 100) : 0}%</td>
                    </>
                  )}
                  <td className="py-2 px-2"><RecBadge rec={r.recommendation} /></td>
                </tr>
              ))}
              {(qualityTab === "best" ? s.bestAnswers : s.worstAnswers).length === 0 && (
                <tr><td colSpan={11} className="py-8 text-center" style={{ color: MUTED }}>Dados insuficientes para gerar ranking (mínimo 3 leads por resposta)</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionBlock>

      {/* Renda e situação */}
      {(rendaQ || situacaoQ) && (
        <SectionBlock title="Renda e situação" icon={<BarChart3 size={16} style={{ color: YELLOW }} />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {rendaQ && rendaQ.totalResponses > 0 && (
              <ChartCard title="Leadscore por renda mensal" subtitle={`${rendaQ.totalResponses} respostas`}>
                <QuestionChart q={rendaQ} />
              </ChartCard>
            )}
            {situacaoQ && situacaoQ.totalResponses > 0 && (
              <ChartCard title="Leadscore por situação atual" subtitle={`${situacaoQ.totalResponses} respostas`}>
                <QuestionChart q={situacaoQ} />
              </ChartCard>
            )}
          </div>
        </SectionBlock>
      )}

      {/* Concurso e nível de preparo */}
      {(tribunalQ || nivelQ || motivoQ) && (
        <SectionBlock title="Concurso e nível de preparo" icon={<Award size={16} style={{ color: ACCENT }} />}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {tribunalQ && tribunalQ.totalResponses > 0 && (
              <ChartCard title="Experiência com concursos de Tribunal" subtitle={`${tribunalQ.totalResponses} respostas`}>
                <QuestionChart q={tribunalQ} />
              </ChartCard>
            )}
            {nivelQ && nivelQ.totalResponses > 0 && (
              <ChartCard title="Nível no mundo dos concursos x qualidade" subtitle={`${nivelQ.totalResponses} respostas`}>
                <QuestionChart q={nivelQ} />
              </ChartCard>
            )}
            {motivoQ && motivoQ.totalResponses > 0 && (
              <ChartCard title="Motivo de participação x qualidade" subtitle={`${motivoQ.totalResponses} respostas`}>
                <QuestionChart q={motivoQ} />
              </ChartCard>
            )}
          </div>
        </SectionBlock>
      )}

      {/* Insights da pesquisa */}
      {s.insights.length > 0 && (
        <SectionBlock title="Insights da pesquisa" icon={<Lightbulb size={16} style={{ color: YELLOW }} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleInsights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg p-4" style={{
                background: ins.type === "danger" ? "rgba(248,81,73,0.1)" :
                  ins.type === "warning" ? "rgba(210,153,34,0.1)" :
                  ins.type === "success" ? "rgba(63,185,80,0.1)" : "rgba(88,166,255,0.1)",
                border: `1px solid ${
                  ins.type === "danger" ? "rgba(248,81,73,0.2)" :
                  ins.type === "warning" ? "rgba(210,153,34,0.2)" :
                  ins.type === "success" ? "rgba(63,185,80,0.2)" : "rgba(88,166,255,0.2)"
                }`,
              }}>
                <InsightIcon name={ins.icon} type={ins.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{
                    color: ins.type === "danger" ? RED :
                      ins.type === "warning" ? YELLOW :
                      ins.type === "success" ? GREEN : ACCENT
                  }}>{ins.text}</div>
                  {ins.metric && <div className="mt-0.5 text-[10px]" style={{ color: MUTED }}>{ins.metric}</div>}
                </div>
              </div>
            ))}
          </div>
          {s.insights.length > 6 && !showAllInsights && (
            <button onClick={() => setShowAllInsights(true)} className="mt-3 text-xs font-medium hover:underline" style={{ color: ACCENT }}>
              Ver todos os insights ({s.insights.length})
            </button>
          )}
        </SectionBlock>
      )}

      {/* Oportunidades de copy e segmentação */}
      {s.bestAnswers.length > 0 && (
        <SectionBlock title="Oportunidades para copy e segmentação" icon={<Sparkles size={16} style={{ color: PURPLE }} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {s.bestAnswers.filter(r => r.recommendation === "Usar na copy" || r.recommendation === "Segmentar").slice(0, 6).map((r, i) => (
              <div key={i} className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <RecBadge rec={r.recommendation} />
                  <span className="text-[10px]" style={{ color: MUTED }}>{r.question}</span>
                </div>
                <div className="text-sm font-medium mb-1" style={{ color: TEXT }}>"{r.answer}"</div>
                <div className="text-[11px]" style={{ color: MUTED }}>
                  {r.leads} leads | Score médio: <span style={{ color: PURPLE }}>{r.avgScore}</span> | {r.qualifiedPct}% qualificados
                </div>
                {r.recommendation === "Usar na copy" && (
                  <div className="mt-2 text-[10px]" style={{ color: GREEN }}>
                    Usar este ângulo em copy e criativos — perfil com alta qualificação.
                  </div>
                )}
                {r.recommendation === "Segmentar" && (
                  <div className="mt-2 text-[10px]" style={{ color: ACCENT }}>
                    Criar segmento específico para este público — boa qualidade e volume.
                  </div>
                )}
              </div>
            ))}
            {s.bestAnswers.filter(r => r.recommendation === "Nutrir").slice(0, 3).map((r, i) => (
              <div key={`n-${i}`} className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <RecBadge rec="Nutrir" />
                  <span className="text-[10px]" style={{ color: MUTED }}>{r.question}</span>
                </div>
                <div className="text-sm font-medium mb-1" style={{ color: TEXT }}>"{r.answer}"</div>
                <div className="text-[11px]" style={{ color: MUTED }}>
                  {r.leads} leads | Score médio: <span style={{ color: PURPLE }}>{r.avgScore}</span>
                </div>
                <div className="mt-2 text-[10px]" style={{ color: YELLOW }}>
                  Nutrir antes de oferta direta — potencial médio, precisa de aquecimento.
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Tabela de respostas individuais */}
      <SectionBlock title="Respostas individuais" icon={<Users size={16} style={{ color: ACCENT }} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER2}` }}>
                {["Data", "Nome", "Email", "Telefone", "Leadscore", "Faixa", "Idade", "Situação", "Nível", "Motivo", "LP", "Origem", "Ações"].map((h, i) => (
                  <th key={i} className="text-left py-2 px-2 font-semibold whitespace-nowrap" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLeads.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${BORDER2}` }} className="hover:bg-white/5 transition-colors">
                  <td className="py-2 px-2 whitespace-nowrap" style={{ color: MUTED }}>
                    {new Date(l.receivedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </td>
                  <td className="py-2 px-2 max-w-[120px] truncate font-medium" style={{ color: TEXT }}>{fix(l.name) || "—"}</td>
                  <td className="py-2 px-2 max-w-[160px] truncate" style={{ color: MUTED }}>{l.email ?? "—"}</td>
                  <td className="py-2 px-2 whitespace-nowrap" style={{ color: MUTED }}>{l.phone ?? "—"}</td>
                  <td className="py-2 px-2 font-bold" style={{ color: PURPLE }}>{l.score ?? "—"}</td>
                  <td className="py-2 px-2"><GradeBadge grade={l.grade} /></td>
                  <td className="py-2 px-2 max-w-[100px] truncate" style={{ color: TEXT }}>{fix(l.answers.idade) || "—"}</td>
                  <td className="py-2 px-2 max-w-[120px] truncate" style={{ color: TEXT }}>{fix(l.answers.situacao) || "—"}</td>
                  <td className="py-2 px-2 max-w-[120px] truncate" style={{ color: TEXT }}>{fix(l.answers.nivel_concursos) || "—"}</td>
                  <td className="py-2 px-2 max-w-[120px] truncate" style={{ color: TEXT }}>{fix(l.answers.motivo_projeto) || "—"}</td>
                  <td className="py-2 px-2 whitespace-nowrap" style={{ color: MUTED }}>{l.paginaCaptura ? l.paginaCaptura.replace(/.*lp=/, "") : "—"}</td>
                  <td className="py-2 px-2 whitespace-nowrap" style={{ color: MUTED }}>{l.origin}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedLead(l)} title="Ver detalhes" className="p-1 rounded hover:bg-white/10 transition-colors">
                        <Eye size={12} style={{ color: ACCENT }} />
                      </button>
                      <button onClick={() => copy([l.name, l.email, l.phone].filter(Boolean).join(" — "), `c-${l.id}`)} title="Copiar contato" className="p-1 rounded hover:bg-white/10 transition-colors">
                        {copiedId === `c-${l.id}` ? <Check size={12} style={{ color: GREEN }} /> : <Copy size={12} style={{ color: MUTED }} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tableLeads.length === 0 && (
                <tr><td colSpan={13} className="py-8 text-center" style={{ color: MUTED }}>Nenhuma resposta encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER2}` }}>
            <div className="text-[11px]" style={{ color: MUTED }}>
              Mostrando {tablePage * PAGE_SIZE + 1} a {Math.min((tablePage + 1) * PAGE_SIZE, s.leads.length)} de {s.leads.length} respostas
            </div>
            <div className="flex items-center gap-1">
              {tablePage > 0 && (
                <button onClick={() => setTablePage(p => p - 1)} className="px-2 py-1 rounded text-[11px] font-medium hover:bg-white/10" style={{ color: ACCENT }}>← Anterior</button>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = tablePage < 3 ? i : tablePage + i - 2;
                if (p < 0 || p >= totalPages) return null;
                return (
                  <button key={p} onClick={() => setTablePage(p)}
                    className="w-7 h-7 rounded text-[11px] font-medium"
                    style={{ background: tablePage === p ? ACCENT : "transparent", color: tablePage === p ? "#fff" : MUTED }}>
                    {p + 1}
                  </button>
                );
              })}
              {tablePage < totalPages - 1 && (
                <button onClick={() => setTablePage(p => p + 1)} className="px-2 py-1 rounded text-[11px] font-medium hover:bg-white/10" style={{ color: ACCENT }}>Próximo →</button>
              )}
            </div>
          </div>
        )}
      </SectionBlock>

      {/* Drawer de detalhe */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full max-w-md overflow-y-auto" style={{ background: BG, borderLeft: `1px solid ${BORDER}` }}>
            <div className="sticky top-0 z-10 flex items-center justify-between p-4" style={{ background: BG, borderBottom: `1px solid ${BORDER2}` }}>
              <span className="text-sm font-semibold" style={{ color: TEXT }}>Detalhes da resposta</span>
              <button onClick={() => setSelectedLead(null)} className="p-1 rounded hover:bg-white/10"><X size={16} style={{ color: MUTED }} /></button>
            </div>

            <div className="p-4 space-y-5">
              {/* Dados do lead */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Dados do lead</div>
                <div className="space-y-1">
                  {[
                    ["Nome", fix(selectedLead.name)],
                    ["Email", selectedLead.email],
                    ["Telefone", selectedLead.phone],
                    ["Data", new Date(selectedLead.receivedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
                  ].map(([label, value], i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span style={{ color: MUTED }}>{label}</span>
                      <span className="font-medium" style={{ color: TEXT }}>{value ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Qualidade */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Qualidade</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: MUTED }}>Leadscore</span>
                    <span className="font-bold text-lg" style={{ color: PURPLE }}>{selectedLead.score ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: MUTED }}>Faixa</span>
                    <GradeBadge grade={selectedLead.grade} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: MUTED }}>Classificação</span>
                    <span style={{ color: selectedLead.grade === "A" || selectedLead.grade === "B" ? GREEN : selectedLead.grade === "C" ? YELLOW : selectedLead.grade === "D" ? RED : MUTED }}>
                      {selectedLead.grade === "A" || selectedLead.grade === "B" ? "Qualificado" : selectedLead.grade === "C" ? "Intermediário" : selectedLead.grade === "D" ? "Fraco" : "Sem score"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Respostas */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Respostas do questionário</div>
                <div className="space-y-1">
                  {Object.entries(SURVEY_QUESTION_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-start justify-between text-xs gap-2">
                      <span className="shrink-0" style={{ color: MUTED }}>{label}</span>
                      <span className="font-medium text-right" style={{ color: TEXT }}>{fix(selectedLead.answers[key]) || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Atribuição */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Atribuição</div>
                <div className="space-y-1">
                  {[
                    ["Origem", selectedLead.origin],
                    ["Plataforma", selectedLead.platform],
                    ["LP", selectedLead.paginaCaptura],
                    ["utm_source", selectedLead.utmSource],
                    ["utm_campaign", selectedLead.utmCampaign],
                    ["utm_medium", selectedLead.utmMedium],
                    ["utm_content", selectedLead.utmContent],
                    ["utm_term", selectedLead.utmTerm],
                  ].map(([label, value], i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span style={{ color: MUTED }}>{label}</span>
                      <span className="font-medium max-w-[200px] truncate" style={{ color: TEXT }} title={value ?? ""}>{value ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => copy([selectedLead.name, selectedLead.email, selectedLead.phone].filter(Boolean).join(" — "), `d-${selectedLead.id}`)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: CARD, border: `1px solid ${BORDER2}`, color: TEXT }}>
                  {copiedId === `d-${selectedLead.id}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  Copiar contato
                </button>
                <button onClick={() => {
                  const summary = Object.entries(SURVEY_QUESTION_LABELS).map(([k, l]) => `${l}: ${fix(selectedLead.answers[k]) || "—"}`).join("\n");
                  copy(`${fix(selectedLead.name)}\nScore: ${selectedLead.score}\nFaixa: ${selectedLead.grade}\n\n${summary}`, `s-${selectedLead.id}`);
                }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: CARD, border: `1px solid ${BORDER2}`, color: TEXT }}>
                  {copiedId === `s-${selectedLead.id}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  Copiar resumo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
