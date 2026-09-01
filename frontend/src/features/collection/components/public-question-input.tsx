'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PublicQuestion, AnswerValue } from '../api/types';

interface PublicQuestionInputProps {
  question: PublicQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  error?: string;
}

export function PublicQuestionInput({
  question,
  value,
  onChange,
  error
}: PublicQuestionInputProps) {
  return (
    <div className='space-y-2'>
      {/* Question text */}
      <div className='space-y-1'>
        <Label className='text-sm leading-snug font-medium'>
          {question.promptText}
          {question.isRequired && (
            <span className='text-destructive ml-1'>*</span>
          )}
        </Label>
        {question.helpText && (
          <p className='text-muted-foreground text-xs'>{question.helpText}</p>
        )}
      </div>

      {/* Type-specific input */}
      {question.type === 'short_text' && (
        <ShortTextInput
          value={(value as string) ?? ''}
          onChange={(v) => onChange(v || null)}
          error={error}
        />
      )}

      {question.type === 'long_text' && (
        <LongTextInput
          value={(value as string) ?? ''}
          onChange={(v) => onChange(v || null)}
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
          error={error}
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

      {/* Error */}
      {error && (
        <p className='text-destructive text-xs font-medium'>{error}</p>
      )}
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
      placeholder='Type your answer...'
      aria-invalid={!!error}
      className='h-11 text-sm'
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
    <div className='space-y-1'>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='Type your answer...'
        rows={4}
        maxLength={maxLength}
        className='resize-none text-sm'
        aria-invalid={!!error}
      />
      {maxLength && (
        <p className='text-muted-foreground text-right text-[10px]'>
          {value.length}/{maxLength}
        </p>
      )}
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
      {options.map((opt) => (
        <button
          key={opt.id}
          type='button'
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
            value === opt.value
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border hover:bg-muted/50'
          )}
          role='radio'
          aria-checked={value === opt.value}
        >
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
              value === opt.value ? 'border-primary' : 'border-input'
            )}
          >
            {value === opt.value && (
              <span className='size-2.5 rounded-full bg-primary' />
            )}
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MultipleChoiceInput({
  options,
  value,
  onChange,
  error
}: {
  options: { id: string; label: string; value: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  function toggle(optValue: string) {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  }

  return (
    <div className='space-y-2' role='group' aria-invalid={!!error}>
      {options.map((opt) => {
        const isChecked = value.includes(opt.value);
        return (
          <button
            key={opt.id}
            type='button'
            onClick={() => toggle(opt.value)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
              isChecked
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border hover:bg-muted/50'
            )}
            role='checkbox'
            aria-checked={isChecked}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-md border-2',
                isChecked
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input'
              )}
            >
              {isChecked && (
                <svg className='size-3' viewBox='0 0 12 12' fill='none'>
                  <path
                    d='M10 3L4.5 8.5L2 6'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              )}
            </span>
            {opt.label}
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      className={cn(
        'flex h-11 w-full rounded-lg border bg-background px-3 text-sm',
        'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
        error && 'border-destructive'
      )}
    >
      <option value=''>Select an option...</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
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
  const labels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  const count = max - min + 1;

  return (
    <div className='space-y-2' role='radiogroup' aria-invalid={!!error}>
      <div className='flex gap-2'>
        {Array.from({ length: count }, (_, i) => {
          const n = min + i;
          const isSelected = value === n;
          return (
            <button
              key={n}
              type='button'
              onClick={() => onChange(n)}
              className={cn(
                'flex h-12 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-all',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground scale-105 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
              role='radio'
              aria-checked={isSelected}
              aria-label={`Rating ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {/* Labels */}
      <div className='flex justify-between px-1'>
        <span className='text-muted-foreground text-[10px]'>
          {labels[min] ?? min}
        </span>
        <span className='text-muted-foreground text-[10px]'>
          {labels[max] ?? max}
        </span>
      </div>
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
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : Number(v));
      }}
      min={min}
      max={max}
      placeholder='0'
      aria-invalid={!!error}
      className='h-11 w-32 text-sm'
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
      className='h-11 w-full max-w-[280px] text-sm'
    />
  );
}
