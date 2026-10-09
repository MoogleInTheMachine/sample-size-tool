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
    {
      title: "Significance Calculator",
      description:
        "Compare success rates between two or more groups to determine statistical significance.",
      href: "/apps/significance-calculator",
    },
    {
      title: "P-Value Explainer",
      description:
        "An interactive graph that shows what a p-value really means. Drag sample size and rates to watch it move, and hover any part to see how it's calculated.",
      href: "/apps/p-value-explainer",
    },
    {
      title: "Chi-Square Explainer",
      description:
        "Test whether two categories are related, like which page people saw and which plan they picked. Edit a table and watch the chi-square curve, expected counts, and effect size update.",
      href: "/apps/chi-square-explainer",
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