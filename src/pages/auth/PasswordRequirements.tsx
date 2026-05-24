import React from 'react';
import { Check, X } from 'lucide-react';
import { getPasswordRuleResults } from 'utils/passwordValidation';

interface PasswordRequirementsProps {
  password: string;
  /** Show checklist once user starts typing */
  showWhenEmpty?: boolean;
}

const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  showWhenEmpty = false,
}) => {
  if (!showWhenEmpty && password.length === 0) return null;

  const results = getPasswordRuleResults(password);

  return (
    <ul className="mt-3 space-y-2" aria-live="polite">
      {results.map(({ id, label, met }) => (
        <li
          key={id}
          className={`flex items-start gap-2 text-xs transition-colors duration-200 ${
            met
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-gray-400'
          }`}
        >
          <span className="mt-0.5 shrink-0" aria-hidden>
            {met ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            ) : (
              <X className="h-4 w-4 text-slate-400 dark:text-gray-500" strokeWidth={2.5} />
            )}
          </span>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
};

export default PasswordRequirements;
