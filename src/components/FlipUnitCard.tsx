import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { TimeUnitKey, formatTwoDigits } from '../utils/timerLogic';

interface FlipUnitCardProps {
  unit: TimeUnitKey;
  label: string;
  value: number;
  isEditable: boolean;
  isFullscreen: boolean;
  controlsVisible: boolean;
  isCompleted: boolean;
  onStepUnit: (unit: TimeUnitKey, delta: number) => void;
  onCommitUnitInput: (unit: TimeUnitKey, rawValue: string) => void;
}


export const FlipUnitCard: React.FC<FlipUnitCardProps> = ({
  unit,
  label,
  value,
  isEditable,
  isFullscreen,
  controlsVisible,
  isCompleted,
  onStepUnit,
  onCommitUnitInput,
}) => {
  const formattedValue = formatTwoDigits(value);
  const [displayValue, setDisplayValue] = useState<string>(formattedValue);
  const [previousValue, setPreviousValue] = useState<string>(formattedValue);
  const [flipKey, setFlipKey] = useState<number>(0);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  useEffect(() => {
    if (formattedValue !== displayValue) {
      setPreviousValue(displayValue);
      setDisplayValue(formattedValue);
      setFlipKey((prev) => prev + 1);
      setIsFlipping(true);

      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 420);
      return () => clearTimeout(timer);
    }
  }, [formattedValue, displayValue]);

  const [isEditingDirect, setIsEditingDirect] = useState<boolean>(false);
  const [draftInput, setDraftInput] = useState<string>(formattedValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditable && isEditingDirect) {
      setIsEditingDirect(false);
    }
  }, [isEditable, isEditingDirect]);

  const handleStartDirectEdit = () => {
    if (!isEditable) return;
    setDraftInput(formattedValue);
    setIsEditingDirect(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  const handleCommitEdit = () => {
    setIsEditingDirect(false);
    onCommitUnitInput(unit, draftInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingDirect(false);
      setDraftInput(formattedValue);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isEditable || isEditingDirect) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    onStepUnit(unit, delta);
  };

  // Exact proportional split-flap geometry:
  // font-size = 1.04 * cardHeight inside width = 1.04 * cardHeight gives
  // balanced side margins while filling ~76% of the vertical flap height.
  const cardHeightVar = isFullscreen
    ? '[--card-h:clamp(210px,46vh,450px)]'
    : '[--card-h:clamp(172px,32vh,284px)]';

  const cardSizeClasses = `${cardHeightVar} w-[calc(var(--card-h)*1.04)] h-[var(--card-h)]`;

  const digitFontSizeClasses = 'text-[calc(var(--card-h)*1.04)]';

  const digitColorClass = isCompleted ? 'text-amber-400' : 'text-[#EAEAEF]';

  const renderHalfContent = (digits: string, half: 'top' | 'bottom') => (
    <div
      className={`absolute inset-x-0 ${
        half === 'top' ? 'top-0' : 'bottom-0'
      } h-[200%] flex items-center justify-center pointer-events-none select-none`}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
        }}
        className={`font-bold tabular-nums leading-none tracking-tight ${digitFontSizeClasses} ${
          half === 'top'
            ? digitColorClass
            : isCompleted
            ? 'text-amber-400/95'
            : 'text-[#DCDCE4]'
        }`}
      >
        {digits}
      </span>
    </div>
  );

  const headerVisibilityClass =
    isFullscreen && !controlsVisible
      ? 'opacity-0 pointer-events-none'
      : 'opacity-100';

  const current = displayValue;
  const previous = previousValue;

  return (
    <div
      className="flex flex-col items-center group"
      onWheel={handleWheel}
      data-testid={`flip-unit-${unit}`}
    >
      {/* Top Unit Header + Stepper Controls */}
      <div
        className={`w-full flex items-center justify-between px-1 mb-3 transition-opacity duration-200 ${headerVisibilityClass}`}
      >
        <span className="text-xs font-medium tracking-wider text-zinc-400">
          {label}
        </span>

        {isEditable && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onStepUnit(unit, 1)}
              aria-label={`Increase ${unit}`}
              title={`Increase ${unit}`}
              className="p-1 rounded bg-[#15151A] hover:bg-[#22222A] text-zinc-400 hover:text-zinc-100 border border-[#262630] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onStepUnit(unit, -1)}
              aria-label={`Decrease ${unit}`}
              title={`Decrease ${unit}`}
              className="p-1 rounded bg-[#15151A] hover:bg-[#22222A] text-zinc-400 hover:text-zinc-100 border border-[#262630] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* True Split-Flap Mechanical Card Stack (No outer digital monitor frame) */}
      <div className={`relative ${cardSizeClasses} flip-card-perspective`}>
        {/* Top Deck Plate Stack Effect (Simulates reserve flaps waiting in upper drum) */}
        <div
          aria-hidden="true"
          className="absolute inset-x-3 -top-1.5 h-2 rounded-t-xl bg-[#111116] border-t border-x border-[#2A2A35]"
        />
        {/* Bottom Deck Plate Stack Effect (Simulates resting flaps at bottom of drum) */}
        <div
          aria-hidden="true"
          className="absolute inset-x-2.5 -bottom-1.5 h-2 rounded-b-xl bg-[#0D0D11] border-b border-x border-[#23232D] shadow-[0_20px_44px_rgba(0,0,0,0.95)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-4 -bottom-3 h-2 rounded-b-xl bg-[#09090C] border-b border-x border-[#1B1B24]"
        />

        {isEditingDirect ? (
          <div className="w-full h-full rounded-2xl bg-[#16161C] border-2 border-amber-500 flex flex-col items-center justify-center relative z-30 shadow-2xl">
            <label htmlFor={`input-${unit}`} className="sr-only">
              Enter {unit}
            </label>
            <input
              id={`input-${unit}`}
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={draftInput}
              aria-label={`Enter ${unit} value`}
              onChange={(e) =>
                setDraftInput(e.target.value.replace(/\D/g, '').slice(0, 2))
              }
              onBlur={handleCommitEdit}
              onKeyDown={handleKeyDown}
              style={{
                fontFamily: 'var(--font-display)',
                fontVariantNumeric: 'tabular-nums',
              }}
              className={`w-full h-full text-center bg-transparent font-bold tabular-nums text-amber-400 focus:outline-none ${digitFontSizeClasses}`}
            />
            <span className="absolute bottom-2.5 text-[11px] font-sans text-zinc-300 bg-black/70 px-2 py-0.5 rounded">
              Press Enter to set
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={!isEditable}
            onClick={handleStartDirectEdit}
            aria-label={`${label}: ${current}${isEditable ? '. Click to edit' : ''}`}
            title={
              isEditable
                ? `Click to edit ${unit} (or scroll mouse wheel)`
                : `${current} ${unit}`
            }
            className={`w-full h-full relative block focus-visible:outline-2 focus-visible:outline-amber-500 rounded-2xl ${
              isEditable ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {/* 1. Static Upper Flap (Reveals NEW/CURRENT value underneath as old flap folds down) */}
            <div
              className={`w-full h-[calc(50%-2.5px)] absolute top-0 left-0 overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#23232C] to-[#191920] border-t border-x ${
                isCompleted ? 'border-amber-500/60' : 'border-[#333340]'
              } shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]`}
            >
              {renderHalfContent(current, 'top')}
              {isFlipping && (
                <div
                  key={`reveal-shadow-${flipKey}`}
                  className="absolute inset-0 bg-black animate-static-top-shadow pointer-events-none"
                />
              )}
            </div>

            {/* 2. Static Lower Flap (Displays PREVIOUS value until falling flap covers it) */}
            <div
              className={`w-full h-[calc(50%-2.5px)] absolute bottom-0 left-0 overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#15151B] to-[#1E1E26] border-b border-x ${
                isCompleted ? 'border-amber-500/60' : 'border-[#282834]'
              } shadow-[0_18px_38px_rgba(0,0,0,0.88)]`}
            >
              {renderHalfContent(isFlipping ? previous : current, 'bottom')}
              {isFlipping && (
                <div
                  key={`cast-shadow-${flipKey}`}
                  className="absolute inset-0 bg-black animate-static-bottom-shadow pointer-events-none"
                />
              )}
            </div>

            {/* 3. Animated 3D Folding Upper Flap (Swings out toward viewer 0deg -> -90deg showing PREVIOUS value) */}
            {isFlipping && (
              <div
                key={`flap-top-${flipKey}`}
                className="w-full h-[calc(50%-2.5px)] absolute top-0 left-0 overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#262630] to-[#1A1A22] border-t-[2.5px] border-x border-t-zinc-300/65 border-x-[#3E3E4E] animate-flap-top z-20"
              >
                {renderHalfContent(previous, 'top')}
                <div className="absolute inset-0 bg-black animate-top-flap-shade pointer-events-none" />
              </div>
            )}

            {/* 4. Animated 3D Dropping Lower Flap (Swings down 90deg -> 0deg with gravity bounce showing CURRENT value) */}
            {isFlipping && (
              <div
                key={`flap-bot-${flipKey}`}
                className="w-full h-[calc(50%-2.5px)] absolute bottom-0 left-0 overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#16161D] to-[#22222C] border-b-[2.5px] border-x border-b-zinc-200/75 border-x-[#383848] animate-flap-bottom z-20"
              >
                {renderHalfContent(current, 'bottom')}
                <div className="absolute inset-0 bg-white animate-bottom-flap-highlight pointer-events-none" />
              </div>
            )}

            {/* 5. Physical Split-Flap Center Axle & Side Hinge Notches */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[5px] bg-[#060608] z-30 flex items-center justify-between pointer-events-none"
            >
              {/* Left Metal Hinge Bracket */}
              <div className="w-2.5 h-5 -ml-1 rounded-xs bg-gradient-to-b from-[#5A5A6E] via-[#2E2E3A] to-[#181820] border border-black shadow-md" />
              {/* Center Axle Hairline */}
              <div className="flex-1 h-px bg-[#14141A] mx-1" />
              {/* Right Metal Hinge Bracket */}
              <div className="w-2.5 h-5 -mr-1 rounded-xs bg-gradient-to-b from-[#5A5A6E] via-[#2E2E3A] to-[#181820] border border-black shadow-md" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
