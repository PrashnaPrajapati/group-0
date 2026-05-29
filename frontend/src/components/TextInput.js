import { forwardRef, useId } from "react";

const TextInput = forwardRef(({ icon: Icon, label, error, id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
 
  return (
    <div className="flex flex-col">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative mt-1">
        {Icon && <Icon className="absolute left-3 top-3.5 text-gray-400" size={18} />}
        <input
          {...props}
          id={inputId}
          ref={ref} 
          className={`w-full ${Icon ? "pl-10" : "pl-3"} p-3 border rounded-lg placeholder-gray-400 text-gray-700 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
      </div>
      {error && (
        <p id={errorId} className="text-red-500 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  );
});

TextInput.displayName = "TextInput";

export default TextInput;
