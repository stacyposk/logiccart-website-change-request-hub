'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type Props = {
  value?: Date;
  onChange?: (d: Date | undefined) => void;
  placeholder?: string;
  disablePast?: boolean;
};

export function DatePicker({
  value,
  onChange = () => {},
  placeholder = 'Pick a date',
  disablePast = true,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" /* prevent form submit */
          variant="outline"
          aria-label="Open date picker"
          className={`w-full h-11 justify-start text-left font-normal text-gray-900 hover:bg-primary/5 data-[state=open]:bg-primary/5 focus-ring rounded-sm font-geist text-sm`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto pt-4 px-0 pb-0 z-50"
        align="start"
        sideOffset={6} /* small gap from trigger */
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            if (!d) return;          // only act on real selections
            // Fix timezone offset issue by creating a new date at noon local time
            // This prevents the date from shifting when converted to ISO string
            const fixedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
            onChange(fixedDate);
            setOpen(false);
          }}
          disabled={
            disablePast
              ? (date) => date < new Date(new Date().setHours(0, 0, 0, 0))
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
}