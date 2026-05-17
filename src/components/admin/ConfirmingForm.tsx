"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

type Props = Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  confirmMessage: string;
  children: ReactNode;
};

export default function ConfirmingForm({
  confirmMessage,
  children,
  ...formProps
}: Props) {
  return (
    <form
      {...formProps}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
