export default function Button({ children, className = "", type = "submit", ...props }) {
  return (
    <button
      type={type} 
      {...props}
      className={`w-full py-3 rounded-lg text-white font-semibold 
        bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 transition disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
