import { Sparkles } from "lucide-react";

export default function Logo() {
  return (
    <div className="flex flex-col items-center mb-5">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
        <Sparkles size={36} className="text-pink-500" />
        Singar Glow
      </h1>
    </div>
  );
}
