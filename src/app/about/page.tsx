'use client';

import React from 'react';

export default function AboutPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto text-black dark:text-white bg-white dark:bg-[#0f0f23] transition-colors">
      <h1 className="text-3xl font-bold mb-6">About</h1>

      <section className="space-y-4">
        <p>
           Hi!I’m a UX researcher with over seven years of experience working across
          industries like software-as-a-service, telecommunications, and financial services. My background is
          actually in fine arts—and I’ve always believed that creativity and curiosity are just as essential to UX
          as frameworks and data.
        </p>

        <p>
          This site started as an experiment. I wanted to see how far I could push generative AI tools—not just to
          brainstorm ideas, but to collaborate with me in designing, building, and launching a real product. I’d
          never built a website in React before, but with ChatGPT’s help, I had a tool live in just a few days. That
          spark of momentum became this space: a home for practical UX research tools designed for speed, clarity,
          and confidence.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Why this exists</h2>
        <p>
          In my most recent role, I was one of the senior-most researchers in the organization. Junior UXRs would
          often come to us—not just for help with planning and methods, but for the confidence to push back when
          their work was misunderstood. Not everyone has that kind of support. <strong>This site is for them.</strong> For the
          junior UX researcher trying to validate a hunch. For the designer or PM rolling up their sleeves to talk
          to users. For anyone who wants to do good research but isn’t sure where to start.
        </p>
        <p>
          These tools aim to fill the gap between curiosity and confidence—quick answers to the kinds of questions
          you’d ask a lead UXer if they were sitting next to you.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">My values</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Accessibility:</strong> Research should be understandable, usable, and inclusive—even for people
            without formal training.
          </li>
          <li>
            <strong>Anti-imposter syndrome:</strong> You don’t need to know everything to do meaningful research.
          </li>
          <li>
            <strong>Staying current:</strong> As technology evolves, I try to evolve with it. I’d rather explore new
            tools than fear them.
          </li>
        </ul>

        <p>
          And yes—if the branding feels a little nostalgic or cyberpunk, that’s on purpose. The moogle is both a nod
          to my love of video games and a nickname I’ve carried for most of my life. This is a playground for me to
          keep learning, experimenting, and hopefully helping others along the way.
        </p>
      </section>
    </main>
  );
}
