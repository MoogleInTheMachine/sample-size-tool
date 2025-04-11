export default function Home() {
  return (
    <main className="p-8 max-w-xl mx-auto text-center space-y-4">
      <h1 className="text-2xl font-bold">Welcome to Moogle in the Machine</h1>
      <p className="text-gray-600">
        A growing collection of tools that help UX researchers bring clarity, confidence, and statistical weight to their work.
      </p>
      <p>
        👉 <a href="/apps/sample-size" className="text-blue-600 underline">Try the Sample Size Calculator</a>
      </p>
    </main>
  );
}