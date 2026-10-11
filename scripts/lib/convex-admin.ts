import { ConvexHttpClient } from "convex/browser";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

/**
 * An admin-authenticated Convex client for scripts, so they can call the
 * internal import mutations the way `npx convex run` does.
 *
 * Credentials, in order:
 *   1. CONVEX_DEPLOY_KEY: a deploy key from the dashboard (Settings > Deploy
 *      keys). Works for dev, preview and production deployments.
 *   2. The CLI's own login (`npx convex login` writes ~/.convex/config.json):
 *      the script asks the Convex API for the dev deployment's admin key
 *      exactly like `npx convex dev` does.
 *
 * The deployment comes from CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL in
 * .env.local, the same file the app reads.
 */

const BIG_BRAIN = "https://api.convex.dev/api/";

const EnvFile = z.object({
  CONVEX_DEPLOYMENT: z.string().min(1),
  NEXT_PUBLIC_CONVEX_URL: z.url(),
});

/** Parse KEY=VALUE lines from .env.local without pulling in a dotenv dependency. */
export function readEnvFile(path = ".env.local"): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    // `npx convex dev` writes a trailing "# team: ..., project: ..." comment after the value.
    const value = m[2].replace(/\s+#.*$/, "").trim();
    out[m[1]] = value.replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

export interface DeploymentTarget {
  name: string;
  url: string;
  adminKey: string;
}

const CliConfig = z.object({ accessToken: z.string().min(1) });
const TeamAndProject = z.object({ team: z.string(), project: z.string() }).loose();
const Credentials = z
  .object({ adminKey: z.string(), url: z.url(), deploymentName: z.string() })
  .loose();

async function bigBrain(path: string, token: string, body?: unknown): Promise<unknown> {
  const res = await fetch(new URL(path, BIG_BRAIN), {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Convex-Client": "npm-cli-1.46.0",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`Convex API ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Resolve the deployment and an admin key. */
export async function resolveDeployment(envPath = ".env.local"): Promise<DeploymentTarget> {
  const env = EnvFile.parse({ ...readEnvFile(envPath), ...process.env });
  const name = env.CONVEX_DEPLOYMENT.replace(/^(dev|prod|preview):/, "");
  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  if (deployKey) return { name, url: env.NEXT_PUBLIC_CONVEX_URL, adminKey: deployKey };

  const configPath = join(homedir(), ".convex", "config.json");
  if (!existsSync(configPath)) {
    throw new Error(
      "No Convex credentials. Set CONVEX_DEPLOY_KEY or run `npx convex login` first.",
    );
  }
  const { accessToken } = CliConfig.parse(JSON.parse(readFileSync(configPath, "utf8")));
  const slugs = TeamAndProject.parse(
    await bigBrain(`deployment/${name}/team_and_project`, accessToken),
  );
  const credentials = Credentials.parse(
    await bigBrain("deployment/provision_and_authorize", accessToken, {
      teamSlug: slugs.team,
      projectSlug: slugs.project,
      deploymentType: "dev",
    }),
  );
  return { name: credentials.deploymentName, url: credentials.url, adminKey: credentials.adminKey };
}

/**
 * A client that may call internal functions. `ConvexHttpClient` is typed for
 * public functions and keeps its admin-auth setter out of the typings, so the
 * casts live here and nowhere else.
 */
export class AdminClient {
  private readonly http: ConvexHttpClient;

  constructor(url: string, adminKey: string) {
    this.http = new ConvexHttpClient(url);
    (this.http as unknown as { setAdminAuth(key: string): void }).setAdminAuth(adminKey);
  }

  mutation<Ref extends FunctionReference<"mutation", "public" | "internal">>(
    ref: Ref,
    args: FunctionArgs<Ref>,
  ): Promise<FunctionReturnType<Ref>> {
    return this.http.mutation(ref as unknown as FunctionReference<"mutation">, args);
  }

  query<Ref extends FunctionReference<"query", "public" | "internal">>(
    ref: Ref,
    args: FunctionArgs<Ref>,
  ): Promise<FunctionReturnType<Ref>> {
    return this.http.query(ref as unknown as FunctionReference<"query">, args);
  }
}

export async function adminClient(
  envPath?: string,
): Promise<{ client: AdminClient; target: DeploymentTarget }> {
  const target = await resolveDeployment(envPath);
  return { client: new AdminClient(target.url, target.adminKey), target };
}
