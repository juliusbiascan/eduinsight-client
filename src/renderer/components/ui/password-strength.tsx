interface PasswordStrengthProps {
  password: string;
}

const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const getStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const strength = getStrength(password);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < strength ? 'bg-[#EBC42E]' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {strength === 0 && "Password is required"}
        {strength === 1 && "Password is weak"}
        {strength === 2 && "Password is fair"}
        {strength === 3 && "Password is good"}
        {strength === 4 && "Password is strong"}
      </p>
    </div>
  );
};

export default PasswordStrength;
