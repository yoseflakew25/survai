'use client';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { SurvaiPanel, SurvaiPanelHeader } from '@/components/survai-panel';

type ActivityType = 'created' | 'edited' | 'published' | 'reviewed' | 'completed';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
}

const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'created',
    title: 'Created survey "Food Security Assessment"',
    description: 'Added 26 questions across 5 sections',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: '2',
    type: 'edited',
    title: 'Edited "Community Health Assessment"',
    description: 'Modified 3 questions in Section 2: Health Status',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: '3',
    type: 'reviewed',
    title: 'Reviewed AI suggestions for Water & Sanitation',
    description: 'Accepted 5 of 8 findings, dismissed 3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: '4',
    type: 'published',
    title: 'Published "Youth Employment Needs"',
    description: 'Survey is now collecting responses',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: '5',
    type: 'completed',
    title: 'Completed "Livelihoods Impact Survey"',
    description: '67 responses collected over 14 days',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  }
];

const typeConfig: Record<
  ActivityType,
  { icon: keyof typeof Icons; label: string; badgeClass: string }
> = {
  created: {
    icon: 'add',
    label: 'Created',
    badgeClass: 'bg-secondary text-secondary-foreground'
  },
  edited: {
    icon: 'edit',
    label: 'Edited',
    badgeClass: 'bg-secondary text-secondary-foreground'
  },
  published: {
    icon: 'collect',
    label: 'Published',
    badgeClass:
      'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground'
  },
  reviewed: {
    icon: 'review',
    label: 'Reviewed',
    badgeClass: 'bg-secondary text-secondary-foreground'
  },
  completed: {
    icon: 'check',
    label: 'Completed',
    badgeClass: 'bg-foreground text-background'
  }
};

function formatTimeAgo(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentActivity() {
  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        icon={<Icons.activity className='size-3.5' />}
        title='Recent Activity'
        subtitle='Your recent actions across surveys and reports.'
      />
      <div className='divide-y divide-border'>
        {mockActivity.map((item) => {
          const config = typeConfig[item.type];
          const Icon = Icons[config.icon];

          return (
            <div key={item.id} className='flex items-start gap-3 px-4 py-3.5 sm:px-5'>
              <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-foreground'>
                {Icon ? <Icon className='size-3.5' /> : null}
              </div>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='text-sm font-medium'>{item.title}</p>
                  <Badge
                    variant='outline'
                    className={`rounded-full border-transparent text-[10px] ${config.badgeClass}`}
                  >
                    {config.label}
                  </Badge>
                </div>
                <p className='text-muted-foreground mt-0.5 text-xs'>
                  {item.description}
                </p>
              </div>
              <span className='text-muted-foreground mt-0.5 shrink-0 font-mono text-[11px] whitespace-nowrap tabular-nums'>
                {formatTimeAgo(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </SurvaiPanel>
  );
}
