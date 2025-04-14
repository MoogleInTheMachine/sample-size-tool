export default function ToolsLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0f0f23] text-black dark:text-white font-sans p-4">
        <main className="max-w-3xl mx-auto">{children}</main>
      </div>
    );
  }