export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'Must not be less than 6 characters',
    test: (p) => p.length >= 6,
  },
  {
    id: 'uppercase',
    label: 'Must have an uppercase letter',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'number',
    label: 'Must include at least 1 number',
    test: (p) => /\d/.test(p),
  },
  {
    id: 'special',
    label: 'Must include at least 1 special character',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export function getPasswordRuleResults(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(password),
  }));
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
