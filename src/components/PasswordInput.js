import { forwardRef, useId, useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

const PasswordInput = forwardRef(({ label, error, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
  const [show, setShow] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative mt-1">
        <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} aria-hidden="true" />
        <input
          {...props}
          id={inputId}
          ref={ref}
          type={show ? "text" : "password"}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`w-full pl-10 pr-10 p-3 border rounded-lg placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          aria-controls={inputId}
        >
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-red-500 text-sm mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
