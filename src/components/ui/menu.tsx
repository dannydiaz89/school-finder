"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { cx } from "./cx";
import { FilterButton } from "./filter-button";
import { Popover } from "./popover";
import { Radio } from "./radio";

export interface MenuOption {
  value: string;
  label: ReactNode;
  /** Smaller gray line under the label. */
  description?: ReactNode;
  disabled?: boolean;
}

interface MenuBaseProps {
  /** Trigger text, composed by the caller: "Type: District, Charter". */
  label: ReactNode;
  /** Accessible name of the option group: "School type". */
  groupLabel: string;
  options: MenuOption[];
  /** Underline the trigger because the filter narrows results. */
  active?: boolean;
  align?: "start" | "end";
  /** Render the panel in a portal (default). `false` keeps it inside a themed ancestor. */
  portal?: boolean;
  className?: string;
}

export type MenuProps = MenuBaseProps &
  (
    | {
        /** Checkbox items; Apply sends the checked values in option order. */
        mode: "multiple";
        value: string[];
        onApply: (value: string[]) => void;
      }
    | {
        /** Radio items; Apply sends the chosen value. */
        mode: "single";
        value: string;
        onApply: (value: string) => void;
      }
  );

/**
 * The filter dropdown: a text button with a caret that opens a panel of
 * checkbox or radio rows with Apply and Cancel. Choices are a draft until
 * Apply; Cancel, Escape, and clicking outside discard the draft.
 *
 * Built on Popover rather than a Radix menu so Tab reaches the footer
 * buttons and the rows are real form controls.
 */
export function Menu(props: MenuProps) {
  const { label, groupLabel, options, active, align = "start", portal, className } = props;
  const t = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const name = useId();

  const current = props.mode === "multiple" ? props.value : [props.value];

  function handleOpenChange(next: boolean) {
    if (next) setDraft(current);
    setOpen(next);
  }

  function toggle(value: string, checked: boolean) {
    if (props.mode === "single") {
      setDraft([value]);
      return;
    }
    setDraft((prev) => {
      const set = new Set(prev);
      if (checked) set.add(value);
      else set.delete(value);
      return options.map((o) => o.value).filter((v) => set.has(v));
    });
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    if (props.mode === "multiple") props.onApply(draft);
    else if (draft[0] !== undefined) props.onApply(draft[0]);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      align={align}
      portal={portal}
      label={groupLabel}
      className={cx("w-[300px] p-0", className)}
      trigger={
        <FilterButton active={active} caret>
          {label}
        </FilterButton>
      }
    >
      <form onSubmit={apply} className="flex flex-col py-2">
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">{groupLabel}</legend>
          {options.map((option) => {
            const checked = draft.includes(option.value);
            const shared = {
              name,
              value: option.value,
              label: option.label,
              description: option.description,
              disabled: option.disabled,
              className: "px-4 hover:bg-bg-subtle",
            };
            return props.mode === "multiple" ? (
              <Checkbox
                key={option.value}
                checked={checked}
                onChange={(e) => toggle(option.value, e.target.checked)}
                {...shared}
              />
            ) : (
              <Radio
                key={option.value}
                checked={checked}
                onChange={() => toggle(option.value, true)}
                {...shared}
              />
            );
          })}
        </fieldset>
        <div className="mt-1 flex justify-end gap-2 border-t border-hairline px-4 pt-2 pb-1">
          <Button variant="text" className="h-11 px-3" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button variant="primary" size="sm" type="submit" className="h-11">
            {t("apply")}
          </Button>
        </div>
      </form>
    </Popover>
  );
}
