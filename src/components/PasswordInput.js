import { forwardRef, useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

const PasswordInput = forwardRef(({ label, error, ...props }, ref) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative mt-1">
        <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
        <input
          {...props}
          ref={ref}
          type={show ? "text" : "password"}
          className={`w-full pl-10 pr-10 p-3 border rounded-lg focus:outline-pink-400 placeholder-gray-400 text-gray-700 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
});

export default PasswordInput;
