"use client";

/**
 * AddressStep — Step 1 of checkout flow (Week 4).
 *
 * Client Component. Collects the shipping address before advancing to the
 * Shipping step. Uses the project's hand-written validator from
 * `@/types/checkout` (no Zod).
 *
 * The province/ward picker is delegated to <AddressCascade /> which wires up
 * the cascading select against `vn_provinces` / `vn_wards`.
 */

import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AddressCascade from "@/components/checkout/AddressCascade";
import {
  EMPTY_ADDRESS_ERRORS,
  hasValidationErrors,
  validateCheckoutAddress,
  type CheckoutAddress,
  type CheckoutValidation,
} from "@/types/checkout";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AddressStepProps {
  initialValue?: Partial<CheckoutAddress>;
  onNext: (value: CheckoutAddress) => void;
  /** Guest checkout → require + collect email. */
  isGuest: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInitialForm(
  initial: Partial<CheckoutAddress> | undefined,
): Partial<CheckoutAddress> {
  return {
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address_line: initial?.address_line ?? "",
    ward_code: initial?.ward_code ?? "",
    province_code: initial?.province_code ?? "",
    notes: initial?.notes ?? "",
  };
}

// ---------------------------------------------------------------------------
// Field label / error helpers
// ---------------------------------------------------------------------------

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-foreground/90 mb-1.5"
    >
      {children}
      {required ? <span className="text-[#D4A843] ml-0.5">*</span> : null}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AddressStep({
  initialValue,
  onNext,
  isGuest,
}: AddressStepProps) {
  const [form, setForm] = useState<Partial<CheckoutAddress>>(() =>
    makeInitialForm(initialValue),
  );
  const [errors, setErrors] = useState<CheckoutValidation["errors"]>(
    EMPTY_ADDRESS_ERRORS,
  );
  // Track which fields the user has interacted with so we don't show all
  // errors on first render; we still reveal everything on submit.
  const [touched, setTouched] = useState<
    Partial<Record<keyof CheckoutAddress, boolean>>
  >({});
  const [pending, startTransition] = useTransition();

  function setField<K extends keyof CheckoutAddress>(
    key: K,
    value: CheckoutAddress[K] | undefined,
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Re-validate on every change so the "Tiếp tục" button can enable as
      // soon as the form becomes valid. Only surface errors for touched fields.
      const v = validateCheckoutAddress(next, { isGuest });
      setErrors(v.errors);
      return next;
    });
  }

  function markTouched(key: keyof CheckoutAddress) {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const v = validateCheckoutAddress(form, { isGuest });
    setErrors(v.errors);

    // Reveal every error on submit attempt.
    setTouched({
      full_name: true,
      phone: true,
      email: true,
      address_line: true,
      ward_code: true,
      province_code: true,
      notes: true,
    });

    if (hasValidationErrors(v)) {
      // Focus first invalid field for accessibility.
      const firstErrKey = (
        Object.keys(v.errors) as (keyof CheckoutAddress)[]
      ).find((k) => v.errors[k]);
      if (firstErrKey) {
        const el = document.getElementById(`address-${firstErrKey}`);
        el?.focus();
      }
      return;
    }

    // At this point form has all required fields. Cast safely.
    const value: CheckoutAddress = {
      full_name: form.full_name!.trim(),
      phone: form.phone!.replace(/\s+/g, ""),
      email: form.email?.trim() || undefined,
      address_line: form.address_line!.trim(),
      ward_code: form.ward_code!,
      province_code: form.province_code!,
      notes: form.notes?.trim() || undefined,
    };

    startTransition(() => {
      onNext(value);
    });
  }

  const currentValidation = validateCheckoutAddress(form, { isGuest });
  const isFormValid = !hasValidationErrors(currentValidation);

  // Only show an error if the field was touched OR validation already ran on submit.
  const errFor = (key: keyof CheckoutAddress) =>
    touched[key] ? errors[key] : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
      aria-labelledby="address-step-heading"
    >
      <div>
        <h2
          id="address-step-heading"
          className="text-lg font-semibold text-foreground"
        >
          Địa chỉ giao hàng
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Thông tin này sẽ được dùng để giao hàng và liên hệ khi cần.
        </p>
      </div>

      {/* Full name --------------------------------------------------------- */}
      <div>
        <FieldLabel htmlFor="address-full_name" required>
          Họ và tên
        </FieldLabel>
        <Input
          id="address-full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          inputMode="text"
          placeholder="Nguyễn Văn A"
          value={form.full_name ?? ""}
          onChange={(e) => setField("full_name", e.target.value)}
          onBlur={() => markTouched("full_name")}
          aria-invalid={Boolean(errFor("full_name")) || undefined}
          aria-describedby={
            errFor("full_name") ? "address-full_name-error" : undefined
          }
          disabled={pending}
          maxLength={100}
        />
        {errFor("full_name") ? (
          <p
            id="address-full_name-error"
            className="mt-1 text-xs text-destructive"
            role="alert"
          >
            {errFor("full_name")}
          </p>
        ) : null}
      </div>

      {/* Phone ------------------------------------------------------------- */}
      <div>
        <FieldLabel htmlFor="address-phone" required>
          Số điện thoại
        </FieldLabel>
        <Input
          id="address-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0901234567"
          value={form.phone ?? ""}
          onChange={(e) => setField("phone", e.target.value)}
          onBlur={() => markTouched("phone")}
          aria-invalid={Boolean(errFor("phone")) || undefined}
          aria-describedby={
            errFor("phone") ? "address-phone-error" : undefined
          }
          disabled={pending}
          maxLength={15}
        />
        {errFor("phone") ? (
          <p
            id="address-phone-error"
            className="mt-1 text-xs text-destructive"
            role="alert"
          >
            {errFor("phone")}
          </p>
        ) : null}
      </div>

      {/* Email (guest only) ------------------------------------------------ */}
      {isGuest ? (
        <div>
          <FieldLabel htmlFor="address-email" required>
            Email
          </FieldLabel>
          <Input
            id="address-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="ban@example.com"
            value={form.email ?? ""}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => markTouched("email")}
            aria-invalid={Boolean(errFor("email")) || undefined}
            aria-describedby={
              errFor("email")
                ? "address-email-error"
                : "address-email-hint"
            }
            disabled={pending}
          />
          {errFor("email") ? (
            <p
              id="address-email-error"
              className="mt-1 text-xs text-destructive"
              role="alert"
            >
              {errFor("email")}
            </p>
          ) : (
            <p
              id="address-email-hint"
              className="mt-1 text-xs text-muted-foreground"
            >
              Chúng tôi sẽ gửi xác nhận đơn hàng đến email này.
            </p>
          )}
        </div>
      ) : null}

      {/* Address line (textarea) ------------------------------------------ */}
      <div>
        <FieldLabel htmlFor="address-address_line" required>
          Địa chỉ chi tiết
        </FieldLabel>
        <Textarea
          id="address-address_line"
          name="address_line"
          autoComplete="street-address"
          placeholder="Số nhà, tên đường, thôn/xóm…"
          value={form.address_line ?? ""}
          onChange={(e) => setField("address_line", e.target.value)}
          onBlur={() => markTouched("address_line")}
          aria-invalid={Boolean(errFor("address_line")) || undefined}
          aria-describedby={
            errFor("address_line") ? "address-address_line-error" : undefined
          }
          disabled={pending}
          maxLength={255}
          rows={2}
        />
        {errFor("address_line") ? (
          <p
            id="address-address_line-error"
            className="mt-1 text-xs text-destructive"
            role="alert"
          >
            {errFor("address_line")}
          </p>
        ) : null}
      </div>

      {/* Province / Ward cascade ------------------------------------------ */}
      <div>
        <FieldLabel htmlFor="address-province_code" required>
          Tỉnh/thành phố &amp; phường/xã
        </FieldLabel>
        <AddressCascade
          value={{
            province_code: form.province_code ?? "",
            ward_code: form.ward_code ?? "",
          }}
          onChange={({ province_code, ward_code }) => {
            // Update both atomically so re-validation sees the new pair.
            setForm((prev) => {
              const next = {
                ...prev,
                province_code: province_code ?? "",
                ward_code: ward_code ?? "",
              };
              const v = validateCheckoutAddress(next, { isGuest });
              setErrors(v.errors);
              return next;
            });
            markTouched("province_code");
            if (ward_code) markTouched("ward_code");
          }}
          disabled={pending}
          idPrefix="address"
          error={errFor("province_code") ?? errFor("ward_code")}
        />
        <FieldError message={errFor("province_code")} />
        <FieldError message={errFor("ward_code")} />
      </div>

      {/* Notes ------------------------------------------------------------- */}
      <div>
        <FieldLabel htmlFor="address-notes">Ghi chú (tuỳ chọn)</FieldLabel>
        <Textarea
          id="address-notes"
          name="notes"
          placeholder="Ví dụ: giao giờ hành chính, gọi trước khi đến…"
          value={form.notes ?? ""}
          onChange={(e) => setField("notes", e.target.value)}
          onBlur={() => markTouched("notes")}
          aria-invalid={Boolean(errFor("notes")) || undefined}
          aria-describedby={
            errFor("notes") ? "address-notes-error" : undefined
          }
          disabled={pending}
          maxLength={500}
          rows={2}
        />
        {errFor("notes") ? (
          <p
            id="address-notes-error"
            className="mt-1 text-xs text-destructive"
            role="alert"
          >
            {errFor("notes")}
          </p>
        ) : null}
      </div>

      {/* Submit ------------------------------------------------------------ */}
      <div className="pt-2 flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending || !isFormValid}
          className="bg-[#D4A843] text-[#0a0a0a] hover:bg-[#D4A843]/90 min-w-[160px]"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Đang xử lý…
            </>
          ) : (
            <>
              Tiếp tục
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
