'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import type { PublicQuestion, AnswerValue } from '../api/types';

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
  return (
    <div id={`collection-q-${question.id}`} className='scroll-mt-24 space-y-3'>
      <div className='flex items-start gap-3'>
        <span className='text-muted-foreground w-5 shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums'>
          {questionNumber}.
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-foreground text-[15px] leading-snug font-medium'>
            {question.promptText}
            {question.isRequired ? (
              <span className='text-destructive ml-0.5'>*</span>
            ) : (
              <span className='text-muted-foreground ml-1.5 text-xs font-normal'>
                (optional)
              </span>
            )}
          </p>
          {question.helpText && (
            <p className='text-muted-foreground mt-0.5 text-xs'>{question.helpText}</p>
          )}
        </div>
      </div>

      <div className='pl-8'>
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

        {error && (
          <p className='text-destructive mt-1.5 flex items-center gap-1.5 text-xs font-medium'>
            <Icons.alertCircle className='size-3.5 shrink-0' />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ---- Individual renderers ----

function ShortTextInput({
  value,
  onChange,
  error
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder='Type your answer'
      aria-invalid={!!error}
      className={cn('h-11 border-border/80 bg-background text-sm shadow-none', error && 'border-destructive')}
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
  return (
    <div className='space-y-1.5'>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='Type your answer'
        rows={5}
        maxLength={maxLength}
        className={cn(
          'resize-none border-border/80 bg-background text-sm leading-relaxed shadow-none',
          error && 'border-destructive'
        )}
        aria-invalid={!!error}
      />
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-[11px]'>
          {maxLength ? 'Be as detailed as you like' : 'Share your thoughts'}
        </p>
        {maxLength && (
          <p
            className={cn(
              'text-muted-foreground text-[10px] tabular-nums',
              value.length >= (maxLength ?? 0) && 'text-destructive font-medium'
            )}
          >
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent'
};

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
  const count = max - min + 1;
  const showMidpoint = count === 5;

  return (
    <div className='space-y-2' role='radiogroup' aria-invalid={!!error}>
      <div className='flex items-center gap-1.5 sm:gap-2'>
        {Array.from({ length: count }, (_, i) => {
          const n = min + i;
          const isSelected = value === n;
          const label = RATING_LABELS[n];
          return (
            <button
              key={n}
              type='button'
              onClick={() => onChange(n)}
              className={cn(
                'flex h-12 flex-1 items-center justify-center rounded-lg border text-base font-semibold transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/80 bg-background text-foreground'
              )}
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
      <div className='flex items-start justify-between px-1 text-[10px] text-muted-foreground'>
        <span>{RATING_LABELS[min] ?? `${min}`}</span>
        {showMidpoint && RATING_LABELS[3] && (
          <span className='hidden sm:inline'>{RATING_LABELS[3]}</span>
        )}
        <span>{RATING_LABELS[max] ?? `${max}`}</span>
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
    <div className='space-y-2' role='radiogroup' aria-invalid={!!error}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.id}
            type='button'
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border bg-background px-3.5 py-3 text-left text-sm transition-colors',
              'hover:border-primary/40 hover:bg-primary/5',
              isSelected
                ? 'border-primary bg-primary/5 font-medium'
                : 'border-border/80'
            )}
            role='radio'
            aria-checked={isSelected}
          >
            <span
              className={cn(
                'flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                isSelected ? 'border-primary' : 'border-muted-foreground/40'
              )}
            >
              {isSelected && <span className='size-2 rounded-full bg-primary' />}
            </span>
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
    <div className='space-y-2' role='group'>
      {options.map((opt) => {
        const isChecked = value.includes(opt.value);
        return (
          <button
            key={opt.id}
            type='button'
            onClick={() => toggle(opt.value)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border bg-background px-3.5 py-3 text-left text-sm transition-colors',
              'hover:border-primary/40 hover:bg-primary/5',
              isChecked
                ? 'border-primary bg-primary/5 font-medium'
                : 'border-border/80'
            )}
            role='checkbox'
            aria-checked={isChecked}
          >
            <span
              className={cn(
                'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors',
                isChecked
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40'
              )}
            >
              {isChecked && <Icons.check className='size-3' />}
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
  return (
    <div className='relative'>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={cn(
          'h-11 w-full cursor-pointer appearance-none rounded-lg border border-border/80 bg-background pr-9 pl-3 text-sm shadow-none',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
          !value && 'text-muted-foreground',
          error && 'border-destructive'
        )}
      >
        <option value='' disabled>
          Select an option…
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Icons.chevronsUpDown className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2' />
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
  return (
    <Input
      type='number'
      inputMode='numeric'
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : Number(v));
      }}
      min={min}
      max={max}
      placeholder='Enter a number'
      aria-invalid={!!error}
      className={cn('h-11 w-full max-w-[240px] border-border/80 bg-background text-sm shadow-none', error && 'border-destructive')}
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
    <Input
      type='date'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      className={cn('h-11 w-full max-w-[260px] border-border/80 bg-background text-sm shadow-none', error && 'border-destructive')}
    />
  );
}
