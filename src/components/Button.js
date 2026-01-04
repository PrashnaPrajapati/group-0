export default function Button({
  children,
  className = "",
  type = "button",
  fullWidth = false,
  ...props
}) {
  return (
    <button
      type={type}
      {...props}
      className={`
        ${fullWidth ? "w-full" : "w-auto"}
        px-6 py-3 rounded-lg text-white font-semibold
        bg-gradient-to-r from-pink-500 to-purple-500
        hover:opacity-90 transition disabled:opacity-50
        ${className}
      `}
    >
      {children}
    </button>
  );
}
