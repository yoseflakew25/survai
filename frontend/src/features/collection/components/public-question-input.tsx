'use client';

import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import type { PublicQuestion, AnswerValue } from '../api/types';
import { useTranslations } from 'next-intl';

interface PublicQuestionInputProps {
  question: PublicQuestion;
  /** Global 1-based question number across the whole survey */
  questionNumber: number;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  error?: string;
}

export function PublicQuestionInput({
  question,
  questionNumber,
  value,
  onChange,
  error
}: PublicQuestionInputProps) {
  const tCommon = useTranslations('common');
  return (
    <div id={`collection-q-${question.id}`} className='collect-q'>
      <div className='collect-q-head'>
        <span className='collect-q-num'>{questionNumber}.</span>
        <div className='min-w-0 flex-1'>
          <p className='collect-q-prompt'>
            {question.promptText}
            {question.isRequired ? (
              <span className='collect-q-req'>*</span>
            ) : (
              <span className='collect-q-opt'>({tCommon('optional')})</span>
            )}
          </p>
          {question.helpText ? (
            <p className='collect-q-help'>{question.helpText}</p>
          ) : null}
        </div>
      </div>

      <div className='collect-q-body'>
        {question.type === 'short_text' && (
          <ShortTextInput
            value={(value as string) ?? ''}
            onChange={(v) => onChange(v.trim() ? v : null)}
            error={error}
          />
        )}

        {question.type === 'long_text' && (
          <LongTextInput
            value={(value as string) ?? ''}
            onChange={(v) => onChange(v.trim() ? v : null)}
            maxLength={question.validationRules?.maxLength}
            error={error}
          />
        )}

        {question.type === 'single_choice' && question.options && (
          <SingleChoiceInput
            options={question.options}
            value={(value as string) ?? null}
            onChange={(v) => onChange(v)}
            error={error}
          />
        )}

        {question.type === 'multiple_choice' && question.options && (
          <MultipleChoiceInput
            options={question.options}
            value={(value as string[]) ?? []}
            onChange={(v) => onChange(v.length > 0 ? v : null)}
          />
        )}

        {question.type === 'dropdown' && question.options && (
          <DropdownInput
            options={question.options}
            value={(value as string) ?? ''}
            onChange={(v) => onChange(v || null)}
            error={error}
          />
        )}

        {question.type === 'rating_scale' && (
          <RatingScaleInput
            min={question.validationRules?.min ?? 1}
            max={question.validationRules?.max ?? 5}
            value={(value as number) ?? null}
            onChange={(v) => onChange(v)}
            error={error}
          />
        )}

        {question.type === 'number' && (
          <NumberInput
            value={(value as number) ?? null}
            onChange={(v) => onChange(v)}
            min={question.validationRules?.min}
            max={question.validationRules?.max}
            error={error}
          />
        )}

        {question.type === 'date' && (
          <DateInput
            value={(value as string) ?? ''}
            onChange={(v) => onChange(v || null)}
            error={error}
          />
        )}

        {error ? (
          <p className='collect-q-error'>
            <Icons.alertCircle />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ShortTextInput({
  value,
  onChange,
  error
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const t = useTranslations('publicCollect');
  return (
    <input
      className='collect-input'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t('typeAnswer')}
      aria-invalid={!!error}
    />
  );
}

function LongTextInput({
  value,
  onChange,
  maxLength,
  error
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  error?: string;
}) {
  const t = useTranslations('publicCollect');
  return (
    <div>
      <textarea
        className='collect-textarea'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('typeAnswer')}
        rows={5}
        maxLength={maxLength}
        aria-invalid={!!error}
      />
      <div className='collect-textarea-meta'>
        <p>{maxLength ? t('longTextDetailed') : t('shareThoughts')}</p>
        {maxLength ? (
          <p
            className={cn(
              'collect-textarea-count',
              value.length >= maxLength && 'is-max'
            )}
          >
            {value.length}/{maxLength}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RatingScaleInput({
  min,
  max,
  value,
  onChange,
  error
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
  error?: string;
}) {
  const t = useTranslations('publicCollect');
  const ratingLabels: Record<number, string> = {
    1: t('ratingPoor'),
    2: t('ratingFair'),
    3: t('ratingGood'),
    4: t('ratingVeryGood'),
    5: t('ratingExcellent')
  };
  const count = max - min + 1;
  const showMidpoint = count === 5;

  return (
    <div role='radiogroup' aria-invalid={!!error}>
      <div className='collect-rating-row'>
        {Array.from({ length: count }, (_, i) => {
          const n = min + i;
          const isSelected = value === n;
          const label = ratingLabels[n];
          return (
            <button
              key={n}
              type='button'
              className='collect-rating'
              onClick={() => onChange(n)}
              role='radio'
              aria-checked={isSelected}
              aria-label={`${n} — ${label ?? ''}`}
              title={label}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className='collect-rating-labels'>
        <span>{ratingLabels[min] ?? `${min}`}</span>
        {showMidpoint && ratingLabels[3] ? (
          <span className='hidden sm:inline'>{ratingLabels[3]}</span>
        ) : null}
        <span>{ratingLabels[max] ?? `${max}`}</span>
      </div>
    </div>
  );
}

function SingleChoiceInput({
  options,
  value,
  onChange,
  error
}: {
  options: { id: string; label: string; value: string }[];
  value: string | null;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className='collect-choice-list' role='radiogroup' aria-invalid={!!error}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.id}
            type='button'
            className='collect-choice'
            onClick={() => onChange(opt.value)}
            role='radio'
            aria-checked={isSelected}
          >
            <span className='collect-choice-mark' aria-hidden='true' />
            <span className='min-w-0'>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultipleChoiceInput({
  options,
  value,
  onChange
}: {
  options: { id: string; label: string; value: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div className='collect-choice-list' role='group'>
      {options.map((opt) => {
        const isChecked = value.includes(opt.value);
        return (
          <button
            key={opt.id}
            type='button'
            className='collect-choice'
            onClick={() => toggle(opt.value)}
            role='checkbox'
            aria-checked={isChecked}
          >
            <span className='collect-choice-mark' aria-hidden='true'>
              {isChecked ? <Icons.check /> : null}
            </span>
            <span className='min-w-0'>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DropdownInput({
  options,
  value,
  onChange,
  error
}: {
  options: { id: string; label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const t = useTranslations('publicCollect');
  return (
    <div className='collect-select-wrap'>
      <select
        className={cn('collect-select', !value && 'is-empty')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      >
        <option value='' disabled>
          {t('selectOption')}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Icons.chevronsUpDown />
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  error
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  error?: string;
}) {
  const t = useTranslations('publicCollect');
  return (
    <input
      className='collect-input collect-input-narrow'
      type='number'
      inputMode='numeric'
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : Number(v));
      }}
      min={min}
      max={max}
      placeholder={t('enterNumber')}
      aria-invalid={!!error}
    />
  );
}

function DateInput({
  value,
  onChange,
  error
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <input
      className='collect-input collect-input-narrow'
      type='date'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
    />
  );
}
