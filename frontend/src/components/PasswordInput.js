import { forwardRef, useId, useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

const PasswordInput = forwardRef(({ label, error, id, ...props }, ref) => {
  const [show, setShow] = useState(false);
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
        <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
        <input
          {...props}
          id={inputId}
          ref={ref}
          type={show ? "text" : "password"} 
          className={`w-full pl-10 pr-10 p-3 border rounded-lg placeholder-gray-400 text-gray-700 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 rounded"
          onClick={() => setShow(!show)}
        > 
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-red-500 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
