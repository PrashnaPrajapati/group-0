import { forwardRef, useId } from "react";

const TextInput = forwardRef(({ icon: Icon, label, error, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
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
        {Icon && <Icon className="absolute left-3 top-3.5 text-gray-400" size={18} aria-hidden="true" />}
        <input
          {...props}
          id={inputId}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`w-full ${Icon ? "pl-10" : "pl-3"} p-3 border rounded-lg placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
      </div>
      {error && (
        <p id={errorId} className="text-red-500 text-sm mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

TextInput.displayName = "TextInput";

export default TextInput;
