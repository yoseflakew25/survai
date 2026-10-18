'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Heading } from '@/components/ui/heading';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { reportOptions } from '../api/queries';
import type { ReportSection } from '../api/types';

interface ReportViewProps {
  surveyId: string;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function inlineBold(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className='font-semibold text-foreground'>
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function renderSectionContent(content: string): ReactNode[] {
  return content.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className='h-2' />;

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    const dashed = line.match(/^[-•]\s+(.*)$/);
    const bulletText = numbered?.[1] ?? dashed?.[1];

    if (bulletText) {
      return (
        <div key={i} className='flex gap-2.5'>
          <span className='mt-[8px] size-1.5 shrink-0 rounded-full bg-brand' />
          <p className='flex-1'>{inlineBold(bulletText)}</p>
        </div>
      );
    }

    return (
      <p key={i} className={cn(line.startsWith('**') && 'font-medium')}>
        {inlineBold(line)}
      </p>
    );
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

const brandCtaClass =
  'h-10 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] transition-[filter,box-shadow] hover:brightness-105 hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_35%,transparent)]';

export function ReportView({ surveyId }: ReportViewProps) {
  const { data: report } = useSuspenseQuery(reportOptions(surveyId));
  const [sections, setSections] = useState<ReportSection[]>(report.sections);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([
    {
      role: 'assistant',
      content:
        "I've generated a draft report based on your survey data. You can edit any section below, or ask me to revise specific parts. What would you like to change?"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, isReplying]);

  const totalWords = sections.reduce((sum, s) => sum + countWords(s.content), 0);

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      if (Math.random() < 0.15) {
        throw new Error('Report generation failed');
      }
      toast.success('Report generated', {
        description: 'AI has generated a complete report from your survey data.'
      });
    } catch {
      toast.error('Generation failed', {
        description: 'Could not generate the report. Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleSendMessage = useCallback(
    (override?: string) => {
      const message = (override ?? chatInput).trim();
      if (!message || isReplying) return;
      setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
      setChatInput('');
      setIsReplying(true);
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              "I've updated the report based on your feedback. The changes have been applied to the relevant sections. Would you like me to make any other adjustments?"
          }
        ]);
        setIsReplying(false);
      }, 1200);
    },
    [chatInput, isReplying]
  );

  const handleExport = useCallback((format: string) => {
    if (Math.random() < 0.15) {
      toast.error('Export failed', {
        description: `Could not export as ${format.toUpperCase()}. Please try again.`
      });
      return;
    }
    toast.success(`Exporting as ${format.toUpperCase()}`, {
      description: `Your report will be downloaded as a ${format} file.`
    });
  }, []);

  const reportStats = [
    {
      label: 'Responses',
      value: report.stats.responseCount.toLocaleString(),
      icon: Icons.activity
    },
    {
      label: 'Completion',
      value: `${report.stats.completionRate}%`,
      icon: Icons.checks
    },
    {
      label: 'Avg. Duration',
      value: `${report.stats.avgCompletionMinutes}m`,
      icon: Icons.clock
    },
    {
      label: 'Questions',
      value: report.stats.questionsCount.toString(),
      icon: Icons.forms
    }
  ];

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <Heading
          title='Report Workspace'
          description='Generate AI-powered reports from your survey data'
        />
        <Badge
          variant='secondary'
          className='rounded-full border-transparent text-[10px]'
        >
          Draft
        </Badge>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-4 lg:col-span-2'>
          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.report className='size-3.5' />}
              title='AI-Generated Report'
              subtitle='Key findings and recommendations from your survey'
              badge={
                <Badge
                  variant='secondary'
                  className='rounded-full text-[10px]'
                >
                  {sections.length} sections
                </Badge>
              }
            />
            <SurvaiPanelBody>
              <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
                {reportStats.map((stat) => {
                  const StatIcon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className='flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5'
                    >
                      <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-foreground'>
                        <StatIcon className='size-3.5' />
                      </div>
                      <div className='min-w-0'>
                        <p className='text-muted-foreground text-[10px] font-medium tracking-wide uppercase'>
                          {stat.label}
                        </p>
                        <p className='font-display text-base font-extrabold tracking-tight tabular-nums'>
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className='text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs'>
                <span className='flex items-center gap-1.5'>
                  <Icons.calendar className='h-3.5 w-3.5' />
                  Generated {formatDate(report.createdAt)}
                </span>
                <span className='flex items-center gap-1.5'>
                  <Icons.sparkles className='h-3.5 w-3.5' />
                  {report.model}
                </span>
                <span className='flex items-center gap-1.5 font-mono tabular-nums'>
                  <Icons.page className='h-3.5 w-3.5' />
                  {totalWords.toLocaleString()} words
                </span>
              </div>
            </SurvaiPanelBody>
          </SurvaiPanel>

          {sections.map((section, index) => (
            <SurvaiPanel key={section.id}>
              <div className='flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3'>
                <div className='flex min-w-0 items-center gap-2.5'>
                  <span className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-foreground text-[11px] font-bold text-background'>
                    {index + 1}
                  </span>
                  <h3 className='font-display truncate text-sm font-bold tracking-tight'>
                    {section.title}
                  </h3>
                </div>
                <div className='flex shrink-0 items-center gap-1.5'>
                  <span className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                    {countWords(section.content).toLocaleString()} words
                  </span>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    className='rounded-lg'
                    aria-label={
                      activeSection === section.id
                        ? 'Close editor'
                        : `Edit ${section.title}`
                    }
                    onClick={() =>
                      setActiveSection(
                        activeSection === section.id ? null : section.id
                      )
                    }
                  >
                    <Icons.edit className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </div>
              <SurvaiPanelBody>
                {activeSection === section.id ? (
                  <div className='space-y-3'>
                    <textarea
                      value={section.content}
                      aria-label={`Edit ${section.title}`}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === section.id
                              ? { ...s, content: e.target.value }
                              : s
                          )
                        )
                      }
                      className='min-h-[200px] w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring'
                    />
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        className={cn(brandCtaClass, 'h-8 px-3 text-xs')}
                        onClick={() => {
                          if (!section.content.trim()) {
                            toast.error('Section cannot be empty', {
                              description: 'Add some content before saving.'
                            });
                            return;
                          }
                          setActiveSection(null);
                          toast.success('Section updated');
                        }}
                      >
                        <Icons.check className='mr-1 h-3 w-3' />
                        Save
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='rounded-xl'
                        onClick={() => setActiveSection(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className='max-w-none space-y-1 text-sm leading-relaxed text-foreground/90'>
                    {renderSectionContent(section.content)}
                  </div>
                )}
              </SurvaiPanelBody>
            </SurvaiPanel>
          ))}
        </div>

        <div className='sticky top-[4.5rem] self-start space-y-4'>
          <SurvaiPanel className='flex flex-col'>
            <div className='relative shrink-0 overflow-hidden border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-4 py-4'>
              <div
                className='pointer-events-none absolute inset-0 opacity-35'
                style={{
                  backgroundImage:
                    'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                  maskImage:
                    'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent, black 20%, black 80%, transparent)'
                }}
              />
              <div className='relative flex items-start gap-3'>
                <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_20%,transparent)]'>
                  <Icons.chat className='size-4' />
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='font-display text-base font-extrabold tracking-tight text-foreground'>
                    Report Chat
                  </h3>
                  <p className='mt-0.5 text-xs leading-relaxed text-foreground/70'>
                    Ask AI to revise any section
                  </p>
                </div>
                <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm'>
                  <Icons.sparkles className='size-3' />
                  {report.model}
                </span>
              </div>
            </div>

            <div
              ref={messagesEndRef}
              aria-live='polite'
              className='flex min-h-[min(48vh,480px)] max-h-[min(64vh,640px)] flex-col gap-3 overflow-y-auto px-3.5 py-4'
              style={{
                backgroundImage: `
                  radial-gradient(ellipse 90% 45% at 50% 0%, color-mix(in srgb, var(--brand) 12%, transparent), transparent 70%),
                  radial-gradient(color-mix(in srgb, var(--foreground) 7%, transparent) 1px, transparent 1px)
                `,
                backgroundSize: 'auto, 16px 16px'
              }}
            >
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                      aria-hidden
                    >
                      <Icons.sparkles className='size-3.5' />
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      'max-w-[min(100%,18rem)] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'rounded-br-md bg-foreground text-background'
                        : 'rounded-bl-md border border-border bg-card/95 text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isReplying ? (
                <div
                  className='flex gap-2.5 animate-in fade-in duration-200'
                  aria-label='SurvAI is typing'
                >
                  <div
                    className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                    aria-hidden
                  >
                    <Icons.sparkles className='size-3.5' />
                  </div>
                  <div className='flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card/95 px-4 py-3 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'>
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className='size-1.5 animate-bounce rounded-full bg-foreground/45'
                        style={{
                          animationDelay: `${dot * 140}ms`,
                          animationDuration: '900ms'
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className='shrink-0 space-y-3 border-t border-border bg-[color-mix(in_srgb,var(--background)_55%,var(--brand-soft))] px-3.5 py-3.5'>
              {chatMessages.length === 1 && !isReplying ? (
                <div className='flex flex-col gap-1.5'>
                  <p className='text-muted-foreground px-0.5 text-[10px] font-medium tracking-wide uppercase'>
                    Suggestions
                  </p>
                  <div className='flex flex-wrap gap-1.5'>
                    {[
                      'Make it more concise',
                      'Expand key findings',
                      'Rewrite the summary'
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type='button'
                        onClick={() => handleSendMessage(prompt)}
                        className='rounded-full border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-[background-color,border-color] hover:border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] hover:bg-brand'
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className='relative'>
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isReplying
                      ? 'SurvAI is typing…'
                      : 'Ask to revise the report…'
                  }
                  disabled={isReplying}
                  className='border-border bg-card h-11 rounded-2xl border-2 pr-12 text-sm shadow-sm focus-visible:border-[color-mix(in_srgb,var(--brand)_65%,var(--foreground))] disabled:opacity-70'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  size='icon'
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || isReplying}
                  aria-label='Send message'
                  className={cn(
                    brandCtaClass,
                    'absolute top-1/2 right-1.5 size-8 -translate-y-1/2 rounded-xl p-0'
                  )}
                >
                  <Icons.send className='size-3.5' />
                </Button>
              </div>
            </div>
          </SurvaiPanel>

          <SurvaiPanel>
            <SurvaiPanelBody className='space-y-3'>
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className={cn(brandCtaClass, 'w-full')}
              >
                {isGenerating ? (
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                ) : (
                  <Icons.sparkles className='mr-2 size-4' />
                )}
                Regenerate Report
              </Button>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  variant='outline'
                  onClick={() => handleExport('docx')}
                  className='h-10 rounded-xl'
                >
                  <Icons.fileTypeDoc className='mr-1.5 size-4' />
                  DOCX
                </Button>
                <Button
                  variant='outline'
                  onClick={() => handleExport('pdf')}
                  className='h-10 rounded-xl'
                >
                  <Icons.fileTypePdf className='mr-1.5 size-4' />
                  PDF
                </Button>
              </div>

              <Separator />

              <div className='space-y-0.5'>
                <Link
                  href={`/dashboard/surveys/${surveyId}/analytics`}
                  className='group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-muted/70'
                >
                  <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-foreground'>
                    <Icons.analytics className='size-4' />
                  </span>
                  <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                    View Analytics
                  </span>
                  <Icons.arrowRight className='text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5' />
                </Link>
                <Link
                  href={`/dashboard/surveys/${surveyId}/review`}
                  className='group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-muted/70'
                >
                  <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-foreground'>
                    <Icons.review className='size-4' />
                  </span>
                  <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                    Review Survey
                  </span>
                  <Icons.arrowRight className='text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5' />
                </Link>
              </div>
            </SurvaiPanelBody>
          </SurvaiPanel>
        </div>
      </div>
    </div>
  );
}
