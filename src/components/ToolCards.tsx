'use client';

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

export default function ToolCards() {
  return (
    <section className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Link href="/apps/sample-size" target="_blank">
        <Card className="bg-[#121224] border border-purple-700 hover:border-purple-500 hover:shadow-xl transition duration-300">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-purple-300">
                Sample Size Calculator
              </h2>
              <ArrowUpRight className="text-purple-400" />
            </div>
            <p className="text-sm text-gray-400">
              Estimate confidence levels based on your survey sample size and population. Quickly check if your margin of error meets the standard.
            </p>
          </CardContent>
        </Card>
      </Link>
    </section>
  );
}