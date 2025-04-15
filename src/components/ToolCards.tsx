import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function ToolCards() {
  const tools = [
    {
      title: "Sample Size Calculator",
      description:
        "Estimate confidence levels based on your survey sample size and population. Quickly check if your margin of error meets the standard.",
      href: "/apps/sample-size",
    },
    {
      title: "Bias Checker",
      description:
        "Identify leading or biased language in your research questions and get suggestions for neutral phrasing.",
      href: "/apps/bias-checker",
    },
  ];

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3 relative z-10">
      {tools.map((tool, index) => (
        <Link href={tool.href} target="_blank" key={index}>
          <Card className="border border-purple-700 text-purple-300 hover:border-purple-400 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">
                  {tool.title}
                </h2>
                <span className="text-sm">↗</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">{tool.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}