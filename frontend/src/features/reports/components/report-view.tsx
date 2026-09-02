'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import Link from 'next/link';

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
    // Simulate AI generation
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

    // Simulate AI response
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
    <div className='grid gap-6 lg:grid-cols-3'>
      {/* Main content — report sections */}
      <div className='space-y-4 lg:col-span-2'>
        {/* Report header */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <CardTitle className='text-base'>Survey Report</CardTitle>
                <CardDescription>
                  AI-generated report with key findings and recommendations
                </CardDescription>
              </div>
              <Badge variant='secondary'>Draft</Badge>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Report sections */}
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>{section.title}</CardTitle>
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
            </CardHeader>
            <CardContent>
              {activeSection === section.id ? (
                <Textarea
                  value={section.content}
                  onChange={(e) =>
                    setSections((prev) =>
                      prev.map((s) =>
                        s.id === section.id ? { ...s, content: e.target.value } : s
                      )
                    )
                  }
                  className='min-h-[200px] resize-none'
                />
              ) : (
                <div className='prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap'>
                  {section.content}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sidebar — chat */}
      <div className='space-y-6'>
        {/* Chat */}
        <Card className='flex flex-col'>
          <CardHeader>
            <CardTitle className='text-base'>Report Chat</CardTitle>
            <CardDescription>
              Ask AI to revise sections or add content
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-1 flex-col'>
            {/* Messages */}
            <div className='mb-4 flex-1 space-y-3 overflow-y-auto' style={{ maxHeight: '400px' }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary/10 ml-8'
                      : 'bg-muted mr-8'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            <Separator className='mb-4' />

            {/* Input */}
            <div className='flex gap-2'>
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder='Ask to revise the report...'
                rows={2}
                className='resize-none'
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
          </CardContent>
        </Card>

        <Separator />

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Actions</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
