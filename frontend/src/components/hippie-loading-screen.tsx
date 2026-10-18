import './hippie-loading-screen.css';

type HippieLoadingScreenProps = {
  /** Short status under the brand. */
  message?: string;
  /** Use when embedding inside a layout instead of full viewport. */
  compact?: boolean;
};

/**
 * Outline brand loading screen — stroke mark, paper wash, quiet motion.
 */
export function HippieLoadingScreen({
  message = 'Loading',
  compact = false
}: HippieLoadingScreenProps) {
  return (
    <div
      className='hl-screen'
      style={compact ? { minHeight: '100%' } : undefined}
      role='status'
      aria-live='polite'
      aria-busy='true'
      aria-label={message}
    >
      <div className='hl-stage'>
        <div className='hl-mark' aria-hidden='true'>
          <svg viewBox='0 0 96 96' className='hl-svg'>
            <circle className='hl-orbit' cx='48' cy='48' r='42' />
            <rect
              className='hl-box'
              x='28'
              y='28'
              width='40'
              height='40'
              rx='10'
            />
            <path
              className='hl-check'
              d='M38 49.5 44.5 56 58.5 40'
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default HippieLoadingScreen;
