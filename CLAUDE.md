# sample-size-tool

Moogle in the Machine's UX research tools: calculators and explainers (sample size, significance,
p-value and chi-square explainers and others under `src/app/apps/`). Next.js app router + TypeScript +
Tailwind, deployed on **Vercel**. **The production branch is `recovery-fix`** (the repo's default branch), not `main`:
pushing `recovery-fix` deploys production, other branches get preview URLs. `main` is stale; don't build on it.

Before calling anything done: `npm run lint` and `npm run build` pass, and you've checked the changed page
on the branch's Vercel preview. Keep Next.js on a patched version; Vercel blocks deploys of vulnerable releases.

## Working with Rene (local or cloud sessions)

- **Never push or merge to the production branch (`recovery-fix`) without Rene's approval.** Work on a branch; Vercel builds a preview URL for it. Merge after he says so.
- **Link every live change.** When something goes live, give the direct URL of each page that changed, confirmed live (200).
- **Status checks get a direct answer:** yes or no with one line of evidence; next steps only if something is off.
- **Never ask Rene to paste secrets** (API keys, tokens, passwords) into the chat. Secrets live in Vercel environment variables and local `.env` files, never in the repo.
- **User-facing copy:** plain and direct, no em dashes, no "not X, it's Y", no slogans.
- In a cloud session `rtk` isn't installed; run commands directly.
