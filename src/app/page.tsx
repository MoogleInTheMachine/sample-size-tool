import Image from "next/image";
import "@/styles/sparkles.css"; // Import animation styles
import "@/styles/branding.css"; // Import branding styles (contains pulse)
import ToolCards from "@/components/ToolCards"; // Import tool cards grid 
import FloatingSparkles from '@/components/FloatingSparkles'; // Importing floating sparkles for background

export default function Home() {
  return (
    <>
      <FloatingSparkles /> {/* ✨ Now this floats above the whole screen */}

      <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1f1f3a] text-white font-mono p-8 overflow-hidden relative">
        {/* Sparkles */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="sparkle sparkle-1 teal" />
          <div className="sparkle sparkle-2 blue" />
          <div className="sparkle sparkle-3 white" />
          <div className="sparkle sparkle-4 purple" />
          <div className="sparkle sparkle-5 teal" />
          <div className="sparkle sparkle-6 blue" />
        </div>

        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
          <div className="relative w-fit group">
            {/* Glow Behind Logo */}
            <div className="absolute inset-0 w-full h-full rounded-full bg-[radial-gradient(circle,_#7f5af0_10%,_transparent_70%)] blur-2xl opacity-50 group-hover:opacity-80 transition duration-300 z-0 animate-pulse-glow" />

            {/* Logo Image */}
            <div className="relative z-10 transition duration-300 ease-in-out hover:drop-shadow-glow">
              <Image
                src="/assets/branding/moogle-logo.png"
                alt="Moogle in the Machine logo"
                width={128}
                height={128}
              />
            </div>
          </div>

          <h1 className="text-5xl font-bold tracking-tight font-mono">Moogle in the Machine</h1>
          <p className="text-lg text-purple-200 max-w-xl font-light">
            A growing collection of UX research tools that bring clarity, confidence,
            and statistical insight to your work.
          </p>
        </div>

        {/* Tool Cards Section */}
        <ToolCards />
      </main>
    </>
  );
}