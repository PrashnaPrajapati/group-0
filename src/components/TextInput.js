import { forwardRef } from "react";

const TextInput = forwardRef(({ icon: Icon, label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative mt-1">
        {Icon && <Icon className="absolute left-3 top-3.5 text-gray-400" size={18} />}
        <input
          {...props}
          ref={ref}
          className={`w-full pl-10 p-3 border rounded-lg focus:outline-pink-400 placeholder-gray-400 text-gray-700 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
});

export default TextInput;
