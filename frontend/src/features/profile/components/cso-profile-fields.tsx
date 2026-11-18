'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { cn } from '@/lib/utils';

import type { OrganizationProfileFormValues } from './organization-profile-form-types';

type Register = UseFormRegister<OrganizationProfileFormValues>;

function Field({
  id,
  label,
  hint,
  register,
  name,
  multiline,
  rows = 4,
  maxLength,
  error,
  placeholder
}: {
  id: string;
  label: string;
  hint?: string;
  register: Register;
  name: Parameters<Register>[0];
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  error?: string;
  placeholder?: string;
}) {
  const common = cn(
    'rounded-xl',
    error && 'border-destructive focus-visible:ring-destructive/20'
  );
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {hint ? (
        <p className='text-muted-foreground text-xs leading-relaxed'>{hint}</p>
      ) : null}
      {multiline ? (
        <Textarea
          id={id}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className={cn('min-h-[88px]', common)}
          {...register(name)}
        />
      ) : (
        <Input
          id={id}
          maxLength={maxLength}
          placeholder={placeholder}
          className={cn('h-11', common)}
          {...register(name)}
        />
      )}
      {error ? <p className='text-destructive text-xs'>{error}</p> : null}
    </div>
  );
}

function errAt(
  errors: FieldErrors<OrganizationProfileFormValues>,
  path: string
): string | undefined {
  const parts = path.split('.');
  let node: unknown = errors;
  for (const p of parts) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[p];
  }
  if (node && typeof node === 'object' && 'message' in node) {
    const msg = (node as { message?: unknown }).message;
    return typeof msg === 'string' ? msg : undefined;
  }
  return undefined;
}

export function CsoProfileFields({
  register,
  errors
}: {
  register: Register;
  errors: FieldErrors<OrganizationProfileFormValues>;
}) {
  const t = useTranslations('account.cso');

  return (
    <div className='space-y-5'>
      <p className='text-muted-foreground text-sm leading-relaxed'>
        {t('intro')}
      </p>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.page className='size-3.5' />}
          title={t('legal.title')}
          subtitle={t('legal.subtitle')}
        />
        <SurvaiPanelBody className='grid gap-4 sm:grid-cols-2'>
          <Field
            id='legal-legal-name'
            label={t('legal.legalName')}
            register={register}
            name='cso.legal.legal_name'
            error={errAt(errors, 'cso.legal.legal_name')}
          />
          <Field
            id='legal-acronym'
            label={t('legal.acronym')}
            register={register}
            name='cso.legal.acronym'
            error={errAt(errors, 'cso.legal.acronym')}
          />
          <Field
            id='legal-reg-number'
            label={t('legal.registrationNumber')}
            register={register}
            name='cso.legal.registration_number'
            error={errAt(errors, 'cso.legal.registration_number')}
          />
          <Field
            id='legal-reg-country'
            label={t('legal.registrationCountry')}
            register={register}
            name='cso.legal.registration_country'
            error={errAt(errors, 'cso.legal.registration_country')}
          />
          <Field
            id='legal-year'
            label={t('legal.yearFounded')}
            register={register}
            name='cso.legal.year_founded'
            placeholder='2010'
            error={errAt(errors, 'cso.legal.year_founded')}
          />
          <Field
            id='legal-status'
            label={t('legal.legalStatus')}
            hint={t('legal.legalStatusHint')}
            register={register}
            name='cso.legal.legal_status'
            error={errAt(errors, 'cso.legal.legal_status')}
          />
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.badgeCheck className='size-3.5' />}
          title={t('mission.title')}
          subtitle={t('mission.subtitle')}
        />
        <SurvaiPanelBody className='space-y-4'>
          <Field
            id='mission-statement'
            label={t('mission.mission')}
            register={register}
            name='cso.mission.mission'
            multiline
            rows={5}
            maxLength={4000}
            error={errAt(errors, 'cso.mission.mission')}
          />
          <Field
            id='vision'
            label={t('mission.vision')}
            register={register}
            name='cso.mission.vision'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.mission.vision')}
          />
          <Field
            id='core-values'
            label={t('mission.coreValues')}
            register={register}
            name='cso.mission.core_values'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.mission.core_values')}
          />
          <Field
            id='theory-of-change'
            label={t('mission.theoryOfChange')}
            register={register}
            name='cso.mission.theory_of_change'
            multiline
            rows={5}
            maxLength={4000}
            error={errAt(errors, 'cso.mission.theory_of_change')}
          />
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.language className='size-3.5' />}
          title={t('geography.title')}
          subtitle={t('geography.subtitle')}
        />
        <SurvaiPanelBody className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field
              id='hq-city'
              label={t('geography.hqCity')}
              register={register}
              name='cso.geography.headquarters_city'
              error={errAt(errors, 'cso.geography.headquarters_city')}
            />
            <Field
              id='hq-country'
              label={t('geography.hqCountry')}
              register={register}
              name='cso.geography.headquarters_country'
              error={errAt(errors, 'cso.geography.headquarters_country')}
            />
          </div>
          <Field
            id='regions-served'
            label={t('geography.regionsServed')}
            hint={t('geography.regionsHint')}
            register={register}
            name='cso.geography.regions_served'
            multiline
            rows={4}
            maxLength={2000}
            error={errAt(errors, 'cso.geography.regions_served')}
          />
          <Field
            id='countries-op'
            label={t('geography.countries')}
            register={register}
            name='cso.geography.countries_of_operation'
            multiline
            rows={2}
            maxLength={1000}
            error={errAt(errors, 'cso.geography.countries_of_operation')}
          />
          <Field
            id='urban-rural'
            label={t('geography.urbanRural')}
            register={register}
            name='cso.geography.urban_rural_focus'
            multiline
            rows={2}
            maxLength={500}
            error={errAt(errors, 'cso.geography.urban_rural_focus')}
          />
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.forms className='size-3.5' />}
          title={t('programs.title')}
          subtitle={t('programs.subtitle')}
        />
        <SurvaiPanelBody className='space-y-4'>
          <Field
            id='primary-themes'
            label={t('programs.themes')}
            hint={t('programs.themesHint')}
            register={register}
            name='cso.programs.primary_themes'
            multiline
            rows={4}
            maxLength={2000}
            error={errAt(errors, 'cso.programs.primary_themes')}
          />
          <Field
            id='flagship'
            label={t('programs.flagship')}
            register={register}
            name='cso.programs.flagship_programs'
            multiline
            rows={5}
            maxLength={4000}
            error={errAt(errors, 'cso.programs.flagship_programs')}
          />
          <Field
            id='target-pop'
            label={t('programs.targetPopulations')}
            register={register}
            name='cso.programs.target_populations'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.programs.target_populations')}
          />
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field
              id='beneficiaries'
              label={t('programs.beneficiaries')}
              register={register}
              name='cso.programs.approximate_annual_beneficiaries'
              error={errAt(errors, 'cso.programs.approximate_annual_beneficiaries')}
            />
            <Field
              id='project-duration'
              label={t('programs.projectDuration')}
              register={register}
              name='cso.programs.typical_project_duration'
              error={errAt(errors, 'cso.programs.typical_project_duration')}
            />
          </div>
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.teams className='size-3.5' />}
          title={t('stakeholders.title')}
          subtitle={t('stakeholders.subtitle')}
        />
        <SurvaiPanelBody className='space-y-4'>
          <Field
            id='donors'
            label={t('stakeholders.donors')}
            register={register}
            name='cso.stakeholders.main_donors_funders'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.stakeholders.main_donors_funders')}
          />
          <Field
            id='gov-partners'
            label={t('stakeholders.government')}
            register={register}
            name='cso.stakeholders.government_partners'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.stakeholders.government_partners')}
          />
          <Field
            id='peer-csos'
            label={t('stakeholders.peers')}
            register={register}
            name='cso.stakeholders.peer_csos'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.stakeholders.peer_csos')}
          />
          <Field
            id='community'
            label={t('stakeholders.community')}
            register={register}
            name='cso.stakeholders.community_structures'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.stakeholders.community_structures')}
          />
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.analytics className='size-3.5' />}
          title={t('me.title')}
          subtitle={t('me.subtitle')}
        />
        <SurvaiPanelBody className='space-y-4'>
          <Field
            id='me-team'
            label={t('me.team')}
            register={register}
            name='cso.me_capacity.me_team_description'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.me_capacity.me_team_description')}
          />
          <Field
            id='survey-types'
            label={t('me.surveyTypes')}
            register={register}
            name='cso.me_capacity.typical_survey_types'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.me_capacity.typical_survey_types')}
          />
          <Field
            id='data-methods'
            label={t('me.dataMethods')}
            register={register}
            name='cso.me_capacity.data_collection_methods'
            multiline
            rows={2}
            maxLength={1000}
            error={errAt(errors, 'cso.me_capacity.data_collection_methods')}
          />
          <Field
            id='reporting-audiences'
            label={t('me.reportingAudiences')}
            register={register}
            name='cso.me_capacity.reporting_audiences'
            multiline
            rows={2}
            maxLength={1000}
            error={errAt(errors, 'cso.me_capacity.reporting_audiences')}
          />
          <Field
            id='indicators'
            label={t('me.indicators')}
            register={register}
            name='cso.me_capacity.indicators_frameworks'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.me_capacity.indicators_frameworks')}
          />
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.language className='size-3.5' />}
          title={t('languages.title')}
          subtitle={t('languages.subtitle')}
        />
        <SurvaiPanelBody className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field
              id='working-lang'
              label={t('languages.working')}
              register={register}
              name='cso.languages.working_languages'
              error={errAt(errors, 'cso.languages.working_languages')}
            />
            <Field
              id='survey-lang'
              label={t('languages.surveys')}
              register={register}
              name='cso.languages.survey_languages'
              error={errAt(errors, 'cso.languages.survey_languages')}
            />
          </div>
          <Field
            id='translation'
            label={t('languages.translation')}
            register={register}
            name='cso.languages.translation_support'
            multiline
            rows={2}
            maxLength={1000}
            error={errAt(errors, 'cso.languages.translation_support')}
          />
          <Field
            id='a11y'
            label={t('languages.accessibility')}
            register={register}
            name='cso.languages.accessibility_inclusion_notes'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.languages.accessibility_inclusion_notes')}
          />
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.user className='size-3.5' />}
          title={t('governance.title')}
          subtitle={t('governance.subtitle')}
        />
        <SurvaiPanelBody className='grid gap-4 sm:grid-cols-2'>
          <Field
            id='exec-lead'
            label={t('governance.executive')}
            register={register}
            name='cso.governance.executive_lead'
            error={errAt(errors, 'cso.governance.executive_lead')}
          />
          <Field
            id='board-chair'
            label={t('governance.boardChair')}
            register={register}
            name='cso.governance.board_chair'
            error={errAt(errors, 'cso.governance.board_chair')}
          />
          <Field
            id='board-size'
            label={t('governance.boardSize')}
            register={register}
            name='cso.governance.board_size'
            error={errAt(errors, 'cso.governance.board_size')}
          />
          <Field
            id='staff-count'
            label={t('governance.staffCount')}
            register={register}
            name='cso.governance.staff_count_approx'
            error={errAt(errors, 'cso.governance.staff_count_approx')}
          />
          <div className='sm:col-span-2'>
            <Field
              id='volunteers'
              label={t('governance.volunteers')}
              register={register}
              name='cso.governance.volunteer_engagement'
              multiline
              rows={2}
              maxLength={1000}
              error={errAt(errors, 'cso.governance.volunteer_engagement')}
            />
          </div>
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.lock className='size-3.5' />}
          title={t('ethics.title')}
          subtitle={t('ethics.subtitle')}
        />
        <SurvaiPanelBody className='space-y-4'>
          <Field
            id='data-protection'
            label={t('ethics.dataProtection')}
            register={register}
            name='cso.ethics.data_protection_policies'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.ethics.data_protection_policies')}
          />
          <Field
            id='consent'
            label={t('ethics.consent')}
            register={register}
            name='cso.ethics.consent_practices'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.ethics.consent_practices')}
          />
          <Field
            id='sensitive'
            label={t('ethics.sensitive')}
            register={register}
            name='cso.ethics.sensitive_topics_policy'
            multiline
            rows={3}
            maxLength={2000}
            error={errAt(errors, 'cso.ethics.sensitive_topics_policy')}
          />
          <Field
            id='ai-boundaries'
            label={t('ethics.aiBoundaries')}
            hint={t('ethics.aiBoundariesHint')}
            register={register}
            name='cso.ethics.ai_usage_boundaries'
            multiline
            rows={4}
            maxLength={2000}
            error={errAt(errors, 'cso.ethics.ai_usage_boundaries')}
          />
        </SurvaiPanelBody>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.edit className='size-3.5' />}
          title={t('additional.title')}
          subtitle={t('additional.subtitle')}
        />
        <SurvaiPanelBody>
          <Field
            id='additional-context'
            label={t('additional.context')}
            register={register}
            name='cso.additional_context'
            multiline
            rows={6}
            maxLength={4000}
            error={errAt(errors, 'cso.additional_context')}
          />
        </SurvaiPanelBody>
      </SurvaiPanel>
    </div>
  );
}