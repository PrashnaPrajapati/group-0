import { toast } from "react-toastify";

// autoClose duration is set globally on ToastContainer (3000ms).
// Individual notify calls don't need to repeat it.
export const notify = {
  success: (msg) => toast.success(msg),
  error:   (msg) => toast.error(msg),
};
