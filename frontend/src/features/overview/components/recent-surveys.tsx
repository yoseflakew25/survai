import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

const surveyData = [
  {
    title: 'Community Health Assessment',
    organization: 'DICDO',
    status: 'published' as const,
    responses: 142,
    updatedAt: '2 hours ago'
  },
  {
    title: 'Education Program Evaluation',
    organization: 'DICDO',
    status: 'draft' as const,
    responses: 0,
    updatedAt: '5 hours ago'
  },
  {
    title: 'Water & Sanitation Baseline',
    organization: 'DICDO',
    status: 'closed' as const,
    responses: 89,
    updatedAt: '1 day ago'
  },
  {
    title: 'Livelihoods Impact Survey',
    organization: 'DICDO',
    status: 'published' as const,
    responses: 67,
    updatedAt: '2 days ago'
  },
  {
    title: 'Food Security Assessment',
    organization: 'DICDO',
    status: 'draft' as const,
    responses: 0,
    updatedAt: '3 days ago'
  }
];

const statusVariant = {
  published: 'default' as const,
  draft: 'secondary' as const,
  closed: 'outline' as const,
  archived: 'outline' as const
};

const statusLabel = {
  published: 'Published',
  draft: 'Draft',
  closed: 'Closed',
  archived: 'Archived'
};

export function RecentSurveys() {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Recent Surveys</CardTitle>
        <CardDescription>5 surveys updated this week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-6'>
          {surveyData.map((survey, index) => (
            <div key={index} className='flex items-center'>
              <Avatar className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                <AvatarFallback className='text-primary text-xs font-medium'>
                  {survey.title
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='ml-4 min-w-0 flex-1 space-y-1'>
                <p className='truncate text-sm leading-none font-medium'>
                  {survey.title}
                </p>
                <div className='flex items-center gap-2'>
                  <p className='text-muted-foreground text-xs'>
                    {survey.responses} responses
                  </p>
                  <span className='text-muted-foreground text-xs'>·</span>
                  <p className='text-muted-foreground text-xs'>
                    {survey.updatedAt}
                  </p>
                </div>
              </div>
              <Badge
                variant={statusVariant[survey.status]}
                className='ml-2 shrink-0 text-[10px]'
              >
                {statusLabel[survey.status]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
