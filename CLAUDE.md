# sample-size-tool

Moogle in the Machine's UX research tools: calculators and explainers (sample size, significance,
p-value and chi-square explainers and others under `src/app/apps/`). Next.js app router + TypeScript +
Tailwind, deployed on **Vercel**. **The production branch is `recovery-fix`** (the repo's default branch), not `main`:
pushing `recovery-fix` deploys production, other branches get preview URLs. `main` is stale; don't build on it.

Before pushing: `npm run lint` and `npm run build` pass. After pushing: the changed page is live (200) on
moogleinthemachine.com. Keep Next.js on a patched version; Vercel blocks deploys of vulnerable releases.

**Vercel project:** `sample-size-tool-9929` serves moogleinthemachine.com. Three leftover projects
(`sample-size-tool`, `sample-size-tool-4jfs`, `sample-size-tool-7le1`) also build on every push but serve
nothing; ignore them (or delete them in the Vercel dashboard).

**Commit identity:** commits must be authored as `mooglesthegreat@gmail.com`, or Vercel's Hobby plan blocks the
deploy. Set it per repo: `git config user.email mooglesthegreat@gmail.com`.

**This repo is public.** Anyone can read CLAUDE.md, ADRs and plans on GitHub. Keep business strategy, pricing and
client details out of repo files.

## Working with Rene (local or cloud sessions)

- **Ship when asked.** When Rene asks for a change, build it, push it to `recovery-fix` and check it live. No separate
  merge approval and no preview step. Stop and ask first only when a change could break something hard to undo or
  that costs money (DNS, deleting or renaming a public URL, anything touching secrets), or when what he wants is genuinely unclear.
- **Link every live change.** When something goes live, give the direct URL of each page that changed, confirmed live (200).
- **Status checks get a direct answer:** yes or no with one line of evidence; next steps only if something is off.
- **Never ask Rene to paste secrets** (API keys, tokens, passwords) into the chat. Secrets live in Vercel environment variables and local `.env` files, never in the repo.
- **User-facing copy:** plain and direct, no em dashes, no "not X, it's Y", no slogans.
- In a cloud session `rtk` isn't installed; run commands directly.
