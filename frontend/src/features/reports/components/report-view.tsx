'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ReportSection {
  id: string;
  title: string;
  content: string;
}

interface ReportViewProps {
  surveyId: string;
}

const MOCK_SECTIONS: ReportSection[] = [
  {
    id: 'sec_1',
    title: 'Executive Summary',
    content:
      'This report presents findings from the Community Health Assessment conducted across DICDO target communities. The survey captured health status, healthcare access patterns, and community health needs to inform program design and resource allocation.\n\nKey findings indicate that while healthcare awareness is moderate, significant barriers remain in access and utilization, particularly for vulnerable populations.'
  },
  {
    id: 'sec_2',
    title: 'Methodology',
    content:
      'The survey was administered to 138 respondents across target communities using a structured questionnaire. Data collection employed both digital and paper-based methods to ensure broad coverage. The questionnaire covered demographics, health status, healthcare access, and barriers to care.'
  },
  {
    id: 'sec_3',
    title: 'Key Findings',
    content:
      '1. **Health Conditions**: Hypertension (32%) and diabetes (18%) are the most commonly reported chronic conditions.\n\n2. **Healthcare Access**: 67% of respondents access healthcare quarterly or less frequently, with distance and cost cited as primary barriers.\n\n3. **Preventive Practices**: Awareness of preventive health measures varies significantly by age group, with younger respondents showing higher awareness levels.\n\n4. **Barriers**: The top three barriers identified are: distance to facilities (42%), cost of services (35%), and availability of medications (28%).'
  },
  {
    id: 'sec_4',
    title: 'Recommendations',
    content:
      'Based on the findings, we recommend:\n\n1. Expand mobile health clinics to address distance barriers\n2. Implement subsidized healthcare programs for vulnerable populations\n3. Launch community health education campaigns targeting preventive practices\n4. Establish community health worker networks for ongoing support'
  }
];

export function ReportView({ surveyId }: ReportViewProps) {
  const [sections, setSections] = useState<ReportSection[]>(MOCK_SECTIONS);
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

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsGenerating(false);
    toast.success('Report generated', {
      description: 'AI has generated a complete report from your survey data.'
    });
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I've updated the report based on your feedback. The changes have been applied to the relevant sections. Would you like me to make any other adjustments?`
        }
      ]);
    }, 1000);
  }, [chatInput]);

  const handleExport = useCallback((format: string) => {
    toast.success(`Exporting as ${format.toUpperCase()}`, {
      description: `Your report will be downloaded as a ${format} file.`
    });
  }, []);

  return (
    <div className='space-y-6'>
      {/* Progress indicator */}
      <div className='rounded-xl border bg-muted/30 p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Plan Created</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Plan Approved</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Review Survey</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Collect</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Analytics</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>6</span>
              <span className='text-sm font-medium'>Report</span>
            </div>
          </div>
          <Badge variant='secondary'>Draft</Badge>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content — report sections */}
        <div className='space-y-4 lg:col-span-2'>
          {/* Report header */}
          <div className='rounded-lg border bg-background'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded'>
                  <Icons.sparkles className='h-3.5 w-3.5' />
                </div>
                <div>
                  <h3 className='font-semibold'>AI-Generated Report</h3>
                  <p className='text-muted-foreground text-xs'>Key findings and recommendations from your survey</p>
                </div>
                <Badge variant='secondary' className='ml-auto text-xs'>{sections.length} sections</Badge>
              </div>
            </div>
            <div className='p-4'>
              <div className='flex gap-2'>
                <Button onClick={handleGenerateReport} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Icons.sparkles className='mr-2 h-4 w-4' />
                      Regenerate Report
                    </>
                  )}
                </Button>
                <Button variant='outline' onClick={() => handleExport('docx')}>
                  <Icons.fileTypeDoc className='mr-2 h-4 w-4' />
                  Export DOCX
                </Button>
                <Button variant='outline' onClick={() => handleExport('pdf')}>
                  <Icons.fileTypePdf className='mr-2 h-4 w-4' />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Report sections */}
          {sections.map((section) => (
            <div key={section.id} className='rounded-lg border bg-background'>
              <div className='border-b bg-muted/30 px-4 py-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-semibold'>{section.title}</h3>
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
              <div className='p-4'>
                {activeSection === section.id ? (
                  <div className='space-y-3'>
                    <textarea
                      value={section.content}
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
                  <div className='prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap'>
                    {section.content}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          {/* Primary Action - Back to Analytics */}
          <div className='relative overflow-hidden rounded-xl border border-primary/20 bg-primary'>
            <div
              className='pointer-events-none absolute inset-0'
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                maskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)'
              }}
            />
            <div className='relative space-y-4 p-5'>
              <div className='space-y-1.5'>
                <h3 className='text-base font-semibold text-primary-foreground'>Final Step</h3>
                <p className='text-primary-foreground/80 text-xs leading-relaxed'>
                  Edit sections and use the chat sidebar to request changes from AI
                </p>
              </div>
              <Link href={`/dashboard/surveys/${surveyId}/analytics`} className='w-full'>
                <Button className='w-full' size='lg' variant='secondary'>
                  Back to Analytics
                  <Icons.arrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
              <p className='text-primary-foreground/60 text-center text-[11px]'>
                Export as DOCX or PDF when ready
              </p>
            </div>
          </div>

          <Separator />

          {/* Report Chat */}
          <div className='rounded-lg border bg-background'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded'>
                  <Icons.chat className='h-3.5 w-3.5' />
                </div>
                <div>
                  <h3 className='font-semibold'>Report Chat</h3>
                  <p className='text-muted-foreground text-xs'>Ask AI to revise sections</p>
                </div>
              </div>
            </div>
            <div className='flex flex-col p-4'>
              {/* Messages */}
              <div className='mb-4 max-h-[300px] space-y-3 overflow-y-auto'>
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary/10 ml-auto'
                        : 'bg-muted mr-auto'
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              <Separator className='mb-4' />
              {/* Input */}
              <div className='flex gap-2'>
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder='Ask to revise the report...'
                  className='flex-1'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  size='icon'
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className='shrink-0'
                >
                  <Icons.send className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className='rounded-lg border bg-background p-4'>
            <h3 className='mb-3 text-sm font-semibold'>Actions</h3>
            <div className='space-y-2'>
              <Link href={`/dashboard/surveys/${surveyId}/analytics`} className='w-full'>
                <Button variant='outline' className='w-full justify-start'>
                  <Icons.analytics className='mr-2 h-4 w-4' />
                  View Analytics
                </Button>
              </Link>
              <Link href={`/dashboard/surveys/${surveyId}/review`} className='w-full'>
                <Button variant='outline' className='w-full justify-start'>
                  <Icons.review className='mr-2 h-4 w-4' />
                  Review Survey
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
