export default function ToolsLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans p-4">
        <main className="max-w-3xl mx-auto">{children}</main>
      </div>
    );
  }