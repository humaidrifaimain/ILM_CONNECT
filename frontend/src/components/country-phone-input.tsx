'use client';

import { useEffect, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  COUNTRY_CALLING_CODES,
  DEFAULT_COUNTRY_ISO,
  countryFlag,
  formatInternationalPhone,
  getCountryCallingCode,
  type CountryCallingCode,
} from '@/lib/country-calling-codes';

interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedIso: string;
  onCountryChange: (country: CountryCallingCode) => void;
  inputClassName?: string;
  selectClassName?: string;
  wrapperClassName?: string;
  placeholder?: string;
}

export default function CountryPhoneInput({
  value,
  onChange,
  selectedIso,
  onCountryChange,
  inputClassName = '',
  selectClassName = '',
  wrapperClassName = '',
  placeholder = '77 123 4567',
}: CountryPhoneInputProps) {
  const countrySelectId = useId();
  const selectedCountry = getCountryCallingCode(selectedIso);

  useEffect(() => {
    let ignore = false;

    const applyDetectedCountry = (iso2: string | null | undefined) => {
      if (ignore || value.trim()) {
        return;
      }

      const country = getCountryCallingCode(iso2 || DEFAULT_COUNTRY_ISO);
      onCountryChange(country);
    };

    fetch('/api/geo', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { country?: string } | null) => {
        applyDetectedCountry(data?.country || DEFAULT_COUNTRY_ISO);
      })
      .catch(() => {
        applyDetectedCountry(DEFAULT_COUNTRY_ISO);
      });

    return () => {
      ignore = true;
    };
  }, [onCountryChange, value]);

  return (
    <div
      className={`flex flex-col sm:flex-row min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-[#095F46] focus-within:ring-2 focus-within:ring-[#095F46]/15 transition-all ${wrapperClassName}`}
    >
      <label className="sr-only" htmlFor={countrySelectId}>
        Country code
      </label>
      <div className="relative shrink-0 w-full sm:w-auto">
        <select
          id={countrySelectId}
          value={selectedCountry.iso2}
          onChange={(event) => onCountryChange(getCountryCallingCode(event.target.value))}
          className={`w-full sm:w-auto sm:min-w-[195px] sm:max-w-[280px] appearance-none border-0 border-b sm:border-b-0 sm:border-r border-stone-200 bg-stone-50/70 pl-3.5 pr-8 py-3 sm:py-2.5 text-base sm:text-sm font-semibold text-stone-900 focus:outline-none cursor-pointer min-h-[46px] ${selectClassName}`}
          aria-label="Phone country code"
        >
          {COUNTRY_CALLING_CODES.map((country) => (
            <option key={country.iso2} value={country.iso2}>
              {countryFlag(country.iso2)} {country.dialCode} {country.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400">
          <ChevronDown className="h-4 w-4 stroke-[2]" />
        </div>
      </div>
      <input
        type="tel"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 border-0 bg-transparent px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none min-h-[46px] ${inputClassName}`}
        aria-label={`Phone or WhatsApp number, ${selectedCountry.name} ${selectedCountry.dialCode}`}
        inputMode="tel"
      />
      <input type="hidden" value={formatInternationalPhone(value, selectedCountry)} readOnly />
    </div>
  );
}
