'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Heading } from '@/components/ui/heading';
import { SurveyStepper } from '@/components/survey-stepper';
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

/** Renders **bold** segments inside a line. */
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

/** Renders plain-text report content with numbered bullets and bold markers. */
function renderSectionContent(content: string): ReactNode[] {
  return content.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className='h-2' />;

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    const dashed = line.match(/^[-•]\s+(.*)$/);
    const bulletText = numbered?.[1] ?? dashed?.[1];

    if (bulletText) {
      return (
        <div key={i} className='flex gap-2.5'>
          <span className='text-primary mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current' />
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

  // Keep the chat scrolled to the latest message.
  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, isReplying]);

  const totalWords = sections.reduce((sum, s) => sum + countWords(s.content), 0);

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      // Simulate a service failure so the error path is exercised
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
    // Simulate a service failure so the error path is exercised
    if (Math.random() < 0.15) {
      toast.error(`Export failed`, {
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
      icon: <Icons.activity className='text-primary h-4 w-4' />
    },
    {
      label: 'Completion',
      value: `${report.stats.completionRate}%`,
      icon: <Icons.checks className='text-primary h-4 w-4' />
    },
    {
      label: 'Avg. Duration',
      value: `${report.stats.avgCompletionMinutes}m`,
      icon: <Icons.clock className='text-primary h-4 w-4' />
    },
    {
      label: 'Questions',
      value: report.stats.questionsCount.toString(),
      icon: <Icons.forms className='text-primary h-4 w-4' />
    }
  ];

  return (
    <div className='space-y-4'>
      {/* Header + progress stepper side by side */}
      <div className='flex flex-col items-end justify-between gap-4 sm:flex-row sm:items-end'>
        <Heading
          title='Report Workspace'
          description='Generate AI-powered reports from your survey data'
        />
        <SurveyStepper currentStep={6} badge={<Badge variant='secondary'>Draft</Badge>} />
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content — report sections */}
        <div className='space-y-4 lg:col-span-2'>
          {/* Report header */}
          <div className='rounded-lg border bg-background'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <div>
                  <h3 className='font-semibold text-primary'>AI-Generated Report</h3>
                  <p className='text-muted-foreground text-xs'>
                    Key findings and recommendations from your survey
                  </p>
                </div>
                <Badge variant='secondary' className='ml-auto text-xs'>
                  {sections.length} sections
                </Badge>
              </div>
            </div>
            <div className='p-4'>
              {/* Report stats */}
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {reportStats.map((stat) => (
                  <div key={stat.label} className='flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2'>
                    {stat.icon}
                    <div className='min-w-0'>
                      <p className='text-muted-foreground text-[10px] font-medium uppercase tracking-wide'>
                        {stat.label}
                      </p>
                      <p className='text-sm font-semibold'>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generation meta */}
              <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground'>
                <span className='flex items-center gap-1.5'>
                  <Icons.calendar className='h-3.5 w-3.5' />
                  Generated {formatDate(report.createdAt)}
                </span>
                <span className='flex items-center gap-1.5'>
                  <Icons.sparkles className='h-3.5 w-3.5' />
                  {report.model}
                </span>
                <span className='flex items-center gap-1.5'>
                  <Icons.page className='h-3.5 w-3.5' />
                  {totalWords.toLocaleString()} words
                </span>
              </div>

            </div>
          </div>

          {/* Report sections */}
          {sections.map((section, index) => (
            <div key={section.id} className='rounded-lg border bg-background'>
              <div className='border-b bg-muted/30 px-4 py-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <span className='bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold'>
                      {index + 1}
                    </span>
                    <h3 className='truncate font-semibold'>{section.title}</h3>
                  </div>
                  <div className='flex shrink-0 items-center gap-2'>
                    <span className='text-muted-foreground text-xs'>
                      {countWords(section.content).toLocaleString()} words
                    </span>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() =>
                        setActiveSection(activeSection === section.id ? null : section.id)
                      }
                    >
                      <Icons.edit className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                </div>
              </div>
              <div className='p-4'>
                {activeSection === section.id ? (
                  <div className='space-y-3'>
                    <textarea
                      value={section.content}
                      aria-label={`Edit ${section.title}`}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === section.id ? { ...s, content: e.target.value } : s
                          )
                        )
                      }
                      className='min-h-[200px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
                    />
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
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
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-6'>
          {/* Report Chat */}
          <div className='overflow-hidden rounded-lg border bg-background'>
            <div className='flex items-center gap-3 border-b bg-primary px-4 py-3'>
              <div className='min-w-0 flex-1'>
                <h3 className='text-sm font-semibold text-primary-foreground'>Report Chat</h3>
                <p className='truncate text-primary-foreground/75 text-xs'>
                  Ask AI to revise sections
                </p>
              </div>
              <span className='flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white'>
                <Icons.sparkles className='h-3 w-3' />
                {report.model}
              </span>
            </div>

            <div className='flex flex-col gap-3 p-4'>
              {/* Messages */}
              <div
                ref={messagesEndRef}
                aria-live='polite'
                className='flex min-h-[260px] max-h-[420px] flex-col gap-3 overflow-y-auto pr-1'
              >
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary self-end rounded-br-md text-primary-foreground'
                        : 'bg-primary/10 self-start rounded-bl-md text-foreground/90'
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {isReplying && (
                  <div className='bg-primary/10 flex items-center gap-1 self-start rounded-2xl rounded-bl-md px-3.5 py-3'>
                    <span className='bg-primary/50 h-1.5 w-1.5 animate-bounce rounded-full' />
                    <span className='bg-primary/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]' />
                    <span className='bg-primary/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]' />
                  </div>
                )}
              </div>

              {/* Quick prompts */}
              {chatMessages.length === 1 && (
                <div className='flex flex-wrap gap-1.5'>
                  {['Make it more concise', 'Expand key findings', 'Rewrite the summary'].map(
                    (prompt) => (
                      <button
                        key={prompt}
                        type='button'
                        onClick={() => handleSendMessage(prompt)}
                        className='text-primary hover:bg-primary/10 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-medium transition-colors'
                      >
                        {prompt}
                      </button>
                    )
                  )}
                </div>
              )}

              <Separator />

              {/* Input */}
              <div className='flex items-center gap-2'>
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder='Ask to revise the report...'
                  className='h-9 flex-1'
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
                  className='h-9 w-9 shrink-0'
                >
                  <Icons.send className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className='rounded-lg border bg-background p-4'>
           

            {/* Generate + export buttons */}
            <div className='flex flex-col items-stretch gap-2'>
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className='py-2 flex-1 whitespace-nowrap shadow-sm'
              >
                {isGenerating ? (
                  <Icons.spinner className='size-4 animate-spin' />
                ) : (
                  <Icons.sparkles className='size-4' />
                )}
                Regenerate Report
              </Button>
              <Button
                variant='outline'
                onClick={() => handleExport('docx')}
                className='bg-background hover:bg-muted/50 py-2 flex-1 whitespace-nowrap'
              >
                <Icons.fileTypeDoc className='size-4' />
                DOCX
              </Button>
              <Button
                variant='outline'
                onClick={() => handleExport('pdf')}
                className='bg-background hover:bg-muted/50 py-2 flex-1 whitespace-nowrap'
              >
                <Icons.fileTypePdf className='size-4' />
                PDF
              </Button>
            </div>

            <Separator className='my-4' />

            {/* Navigation */}
            <div className='space-y-1'>
              <Link
                href={`/dashboard/surveys/${surveyId}/analytics`}
                className='group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60'
              >
                <span className='bg-primary/10 text-primary group-hover:bg-primary/20 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors'>
                  <Icons.analytics className='size-4' />
                </span>
                <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                  View Analytics
                </span>
                <Icons.arrowRight className='text-muted-foreground size-4 transition-all group-hover:translate-x-0.5 group-hover:text-primary' />
              </Link>
              <Link
                href={`/dashboard/surveys/${surveyId}/review`}
                className='group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60'
              >
                <span className='bg-primary/10 text-primary group-hover:bg-primary/20 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors'>
                  <Icons.review className='size-4' />
                </span>
                <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                  Review Survey
                </span>
                <Icons.arrowRight className='text-muted-foreground size-4 transition-all group-hover:translate-x-0.5 group-hover:text-primary' />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}