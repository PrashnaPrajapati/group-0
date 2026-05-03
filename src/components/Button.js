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
      className={`btn-primary focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${fullWidth ? "w-full" : "w-auto"} ${className}`}
    >
      {children}
    </button>
  );
}
