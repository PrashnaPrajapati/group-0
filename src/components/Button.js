export default function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`w-full py-3 rounded-lg text-white font-semibold 
        bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 transition ${className}`}
    >
      {children}
    </button>
  );
}
