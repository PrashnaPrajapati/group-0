"use client";

export default function TextInput({ icon: Icon, label, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative mt-1">
        {Icon && <Icon className="absolute left-3 top-3.5 text-gray-400" size={18} />}
        <input
          {...props}
          className="w-full pl-10 p-3 border rounded-lg focus:outline-pink-400 placeholder-gray-400 text-gray-700"
        />
      </div>
    </div>
  );
}
