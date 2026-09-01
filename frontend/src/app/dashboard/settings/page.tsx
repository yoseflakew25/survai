import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | Survey Copilot',
  description: 'Account and application settings'
};

export default function SettingsPage() {
  return (
    <PageContainer
      pageTitle='Settings'
      pageDescription='Manage your account and application preferences'
    >
      <div className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Profile</CardTitle>
            <CardDescription>
              Your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm'>
              Profile settings coming soon
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Organization</CardTitle>
            <CardDescription>
              Manage your organization settings and team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm'>
              Organization settings coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
