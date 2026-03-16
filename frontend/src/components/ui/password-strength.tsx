interface PasswordStrengthProps {
  password: string;
}

interface Check {
  label: string;
  test: (pw: string) => boolean;
}

const checks: Check[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'Uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(password: string): { score: number; label: string; color: string; bgColor: string } {
  if (!password) return { score: 0, label: '', color: '', bgColor: '' };
  const passed = checks.filter((c) => c.test(password)).length;
  if (passed <= 1) return { score: 1, label: 'Weak', color: 'text-red-400', bgColor: 'bg-red-500' };
  if (passed <= 2) return { score: 2, label: 'Fair', color: 'text-orange-400', bgColor: 'bg-orange-500' };
  if (passed <= 3) return { score: 3, label: 'Good', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
  return { score: 4, label: 'Strong', color: 'text-emerald-400', bgColor: 'bg-emerald-500' };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color, bgColor } = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              level <= score ? bgColor : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
      {/* Label */}
      <p className={`text-xs font-medium ${color}`}>{label}</p>
    </div>
  );
}

export { getStrength, checks };
