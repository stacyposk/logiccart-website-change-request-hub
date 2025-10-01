'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { addMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Empty caption to fully suppress DayPicker’s built-in header */


export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const initial =
    (props as any)?.month ||
    ((props.mode === 'single' && (props as any)?.selected) as Date | undefined) ||
    new Date();

  const [month, setMonth] = React.useState<Date>(initial);

  React.useEffect(() => {
    if ((props as any)?.month) setMonth((props as any).month as Date);
  }, [(props as any)?.month]);

  const goPrev = () => setMonth((m) => addMonths(m, -1));
  const goNext = () => setMonth((m) => addMonths(m, 1));

  return (
    <div data-cal="rdp" className={cn('px-3 pt-2 pb-2', className)}>
      {/* Custom header: centered month with outlined arrows */}
      <div className="relative flex items-center justify-center pb-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={goPrev}
          className="absolute left-2 inline-flex h-8 w-8 items-center justify-center rounded-sm border border-input bg-background text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-sm font-semibold text-foreground">
          {format(month, 'LLLL yyyy')}
        </div>

        <button
          type="button"
          aria-label="Next month"
          onClick={goNext}
          className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-sm border border-input bg-background text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <DayPicker
        /* keep DayPicker in sync with our header */
        month={month}
        onMonthChange={setMonth}
        showOutsideDays={showOutsideDays}
        /* hide DayPicker’s own caption/nav */

        /* Tailwind classes for table/cells (no layout-breaking overrides) */
        classNames={{
          months: 'flex flex-col sm:flex-row gap-4',
          month: 'space-y-1', /* Reduced from space-y-3 for tighter spacing */
          table: 'w-full border-collapse',
          head_row: 'flex mb-1', /* Reduced margin bottom */
          head_cell:
            'w-9 text-[0.8rem] font-normal text-muted-foreground text-center',
          row: 'flex w-full mt-1', /* Reduced from mt-2 for tighter row spacing */
          cell: 'relative p-0 text-center text-sm',
          day:
            'h-9 w-9 rounded-sm p-0 font-normal cursor-pointer hover:bg-primary/10 focus-visible:outline-none',
          /* selected appearance is ultimately enforced via globals.css */
          day_selected:
            'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground focus:outline-none focus-visible:ring-0 border-0 rounded-sm',
          /* keep "today" completely neutral - indistinguishable from other dates */
          day_today: 'bg-transparent text-foreground font-normal',
          day_outside: 'text-muted-foreground opacity-50',
          day_disabled: 'text-muted-foreground opacity-50',
          day_range_middle: '',
          day_hidden: 'invisible',
          ...classNames,
        }}
        {...props}
      />
    </div>
  );
}

Calendar.displayName = 'Calendar';