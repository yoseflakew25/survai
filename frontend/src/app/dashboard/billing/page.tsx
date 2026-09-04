'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { billingInfoContent } from '@/config/infoconfig';
import { useAuth } from '@/lib/auth-context';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals and small teams getting started.',
    features: ['Up to 3 team members', 'Basic features', 'Community support'],
    current: true
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing teams that need more power.',
    features: [
      'Unlimited team members',
      'All features',
      'Priority support',
      'Advanced analytics'
    ],
    current: false
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with advanced needs.',
    features: [
      'Everything in Pro',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee'
    ],
    current: false
  }
];

export default function BillingPage() {
  const { user } = useAuth();

  return (
    <PageContainer
      infoContent={billingInfoContent}
      pageTitle='Billing & Plans'
      pageDescription={`Manage your subscription and usage limits for ${user?.organizationName || 'your workspace'}`}
    >
      <div className='space-y-4'>
        <Alert>
          <Icons.info className='h-4 w-4' />
          <AlertDescription>
            This is a demo billing page. Connect a real payment provider to enable subscriptions.
          </AlertDescription>
        </Alert>

        <div className='grid gap-6 md:grid-cols-3'>
          {PLANS.map((plan) => (
            <Card key={plan.name} className={plan.current ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className='mt-2'>
                  <span className='text-3xl font-bold'>{plan.price}</span>
                  <span className='text-muted-foreground text-sm'>{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <ul className='space-y-2 text-sm'>
                  {plan.features.map((feature) => (
                    <li key={feature} className='flex items-center gap-2'>
                      <Icons.check className='text-primary size-4 shrink-0' />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className='w-full'
                  variant={plan.current ? 'outline' : 'default'}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
