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
      className={`btn-primary ${fullWidth ? "w-full" : "w-auto"} ${className}`}
    >
      {children}
    </button>
  );
}
