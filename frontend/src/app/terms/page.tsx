import type { Metadata } from 'next';

import { LegalPageShell, LegalSection } from '@/components/legal-page-shell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of the Survai survey platform.'
};

const UPDATED = 'October 18, 2026';

export default function TermsPage() {
  return (
    <LegalPageShell title='Terms of Service' updated={UPDATED}>
      <p className='text-muted-foreground text-base leading-relaxed'>
        These Terms govern your access to Survai, an AI-assisted survey platform
        for planning, building, reviewing, collecting, analyzing, and reporting
        surveys. By creating an organization account or using Survai, you agree
        to these Terms.
      </p>

      <LegalSection title='The service'>
        <p>
          Survai provides software tools for organization workspaces. Features
          may change as we develop the product. We may suspend or discontinue
          beta features with reasonable notice when practical.
        </p>
      </LegalSection>

      <LegalSection title='Accounts'>
        <ul>
          <li>
            You must provide accurate registration information and keep
            credentials confidential.
          </li>
          <li>
            You are responsible for activity under your organization account.
          </li>
          <li>
            One organization login owns the workspace in the current MVP. Do not
            share passwords across people; contact us if you need multi-seat
            access later.
          </li>
          <li>
            You must be able to form a binding contract and meet any age
            requirements in your jurisdiction.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title='Your content'>
        <p>
          You retain ownership of surveys, responses, and other content you
          submit (“Customer Content”). You grant Survai a limited license to
          host, process, and display Customer Content solely to provide the
          service, including AI features you enable.
        </p>
        <p>
          You represent that you have the rights and consents needed to collect
          and process respondent data under applicable law (including privacy
          and research ethics rules that apply to your work).
        </p>
      </LegalSection>

      <LegalSection title='AI features'>
        <p>
          AI suggestions, reviews, and drafts are assistive only. Survai does
          not guarantee accuracy, completeness, or fitness of model outputs. You
          must verify statistics, quotes, and published findings before relying
          on them. Do not use Survai to generate fabricated research results
          presented as fact.
        </p>
      </LegalSection>

      <LegalSection title='Acceptable use'>
        <p>You agree not to:</p>
        <ul>
          <li>Break the law or infringe others’ rights.</li>
          <li>
            Probe, scan, or attack Survai systems, or attempt unauthorized
            access.
          </li>
          <li>
            Abuse rate limits, scrape the service, or interfere with other
            customers.
          </li>
          <li>
            Upload malware or content that is unlawful, harassing, or harmful.
          </li>
          <li>
            Use Survai to send spam or deceptive surveys intended to phish or
            defraud respondents.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title='Respondent experience'>
        <p>
          Public survey links may be filled by people without Survai accounts.
          You are responsible for the survey’s purpose, consent language,
          retention of responses, and how you use respondent data.
        </p>
      </LegalSection>

      <LegalSection title='Fees'>
        <p>
          Paid plans, if offered, will be described at purchase. Unless stated
          otherwise, fees are non-refundable except where required by law. We
          may change pricing with notice for renewals.
        </p>
      </LegalSection>

      <LegalSection title='Suspension & termination'>
        <p>
          You may delete your organization at any time from Account. We may
          suspend or terminate access for Terms violations, non-payment, or risk
          to the service. Upon termination, your right to use Survai ends;
          provisions that should survive (including IP, disclaimers, and
          liability limits) remain in effect.
        </p>
      </LegalSection>

      <LegalSection title='Disclaimers'>
        <p>
          Survai is provided “as is” and “as available.” To the fullest extent
          permitted by law, we disclaim warranties of merchantability, fitness
          for a particular purpose, and non-infringement. We do not warrant that
          the service will be uninterrupted or error-free.
        </p>
      </LegalSection>

      <LegalSection title='Limitation of liability'>
        <p>
          To the fullest extent permitted by law, Survai and its suppliers will
          not be liable for indirect, incidental, special, consequential, or
          punitive damages, or for lost profits, data, or goodwill. Our
          aggregate liability for claims relating to the service will not exceed
          the amounts you paid us for Survai in the twelve months before the
          claim (or USD $100 if you paid nothing).
        </p>
      </LegalSection>

      <LegalSection title='Indemnity'>
        <p>
          You will defend and indemnify Survai against claims arising from your
          Customer Content, your surveys, or your violation of these Terms or
          applicable law.
        </p>
      </LegalSection>

      <LegalSection title='Governing law'>
        <p>
          These Terms are governed by the laws applicable in the jurisdiction
          where Survai operates its primary contracting entity, without regard
          to conflict-of-law rules. Courts in that jurisdiction have exclusive
          venue, except where consumer law requires otherwise.
        </p>
      </LegalSection>

      <LegalSection title='Changes'>
        <p>
          We may update these Terms. Continued use after the updated date
          constitutes acceptance, except where local law requires explicit
          consent.
        </p>
      </LegalSection>

      <LegalSection title='Contact'>
        <p>
          Legal questions:{' '}
          <a href='mailto:legal@survai.app'>legal@survai.app</a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
