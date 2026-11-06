import { Metadata } from 'next';

import { AssistantWorkspace } from '@/features/assistant/components/assistant-workspace';

export const metadata: Metadata = {
  title: 'Assistant',
  description: 'Ask questions across your surveys, reports, and reviews'
};

export default function AssistantPage() {
  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4'>
      <AssistantWorkspace />
    </div>
  );
}
