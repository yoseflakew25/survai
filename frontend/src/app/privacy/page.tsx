import type { Metadata } from 'next';

import { LegalPageShell, LegalSection } from '@/components/legal-page-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Survai collects, uses, and protects organization and survey data.'
};

const UPDATED = 'October 18, 2026';

export default function PrivacyPage() {
  return (
    <LegalPageShell title='Privacy Policy' updated={UPDATED}>
      <p className='text-muted-foreground text-base leading-relaxed'>
        Survai (“we”, “us”) is an AI-assisted survey lifecycle platform for research
        and monitoring & evaluation teams. This policy explains what we collect,
        why we collect it, and the choices you have. It applies to the Survai web
        app and related services.
      </p>

      <LegalSection title='Who this covers'>
        <p>
          Survai accounts are <strong>organization workspaces</strong>. People who
          fill public survey links are respondents — they do not create Survai
          accounts unless you invite them as users later.
        </p>
      </LegalSection>

      <LegalSection title='Information we collect'>
        <ul>
          <li>
            <strong>Account data</strong> — email, password (stored hashed),
            organization name, optional profile fields (display name, phone, role
            label, about, website).
          </li>
          <li>
            <strong>Workspace content</strong> — surveys, plans, responses,
            reviews, reports, and files you create or upload in Survai.
          </li>
          <li>
            <strong>Usage & device data</strong> — IP address, browser type,
            approximate location derived from IP, and product analytics needed to
            operate and secure the service.
          </li>
          <li>
            <strong>Cookies</strong> — httpOnly authentication cookies and similar
            session tokens. We do not use advertising trackers on auth pages.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title='How we use information'>
        <ul>
          <li>Provide, maintain, and improve Survai.</li>
          <li>Authenticate you and protect accounts from abuse.</li>
          <li>
            Run AI-assisted features you trigger (for example review or report
            drafts). Model outputs are tools for your team — you remain
            responsible for validating statistics and published findings.
          </li>
          <li>Send transactional messages (security, billing, product notices).</li>
          <li>Comply with law and enforce our Terms.</li>
        </ul>
      </LegalSection>

      <LegalSection title='AI processing'>
        <p>
          When you use AI features, relevant survey content may be sent to
          subprocessors that host model APIs. We do not sell your survey data for
          advertising. Do not paste secrets or regulated personal data into AI
          prompts unless your own policies allow it.
        </p>
      </LegalSection>

      <LegalSection title='Sharing'>
        <p>We share data only with:</p>
        <ul>
          <li>
            Infrastructure and database providers that host Survai under contract.
          </li>
          <li>AI and email providers needed to run features you use.</li>
          <li>
            Authorities when required by law, or to protect Survai, users, or the
            public from serious harm.
          </li>
        </ul>
        <p>We do not sell personal information.</p>
      </LegalSection>

      <LegalSection title='Retention'>
        <p>
          We keep account and workspace data while your organization is active.
          If you delete your organization, we remove associated account data from
          active systems within a reasonable period, except records we must keep
          for legal, security, or accounting reasons.
        </p>
      </LegalSection>

      <LegalSection title='Your choices'>
        <ul>
          <li>Update profile and organization details in Account.</li>
          <li>Change your password or delete your organization in Account.</li>
          <li>
            Contact us to request access or deletion where applicable law
            provides that right.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title='Security'>
        <p>
          We use industry-standard measures such as TLS in transit, hashed
          passwords, and access-controlled databases. No method of transmission
          or storage is 100% secure; please use strong passwords and protect your
          devices.
        </p>
      </LegalSection>

      <LegalSection title='Children'>
        <p>
          Survai is built for professional organizations. It is not directed at
          children under 16. If you believe a child created an account, contact
          us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title='International transfers'>
        <p>
          Survai may process data in countries other than where you are located.
          Where required, we use appropriate safeguards with subprocessors.
        </p>
      </LegalSection>

      <LegalSection title='Changes'>
        <p>
          We may update this policy. We will revise the “Last updated” date and,
          for material changes, provide additional notice in the product when
          practical.
        </p>
      </LegalSection>

      <LegalSection title='Contact'>
        <p>
          Privacy questions:{' '}
          <a href='mailto:privacy@survai.app'>privacy@survai.app</a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
