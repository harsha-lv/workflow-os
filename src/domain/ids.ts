import { nanoid } from "nanoid";

export function createId(prefix?: string): string {
  const id = nanoid(21);
  return prefix ? `${prefix}_${id}` : id;
}

export const prefixes = {
  user: "usr",
  org: "org",
  membership: "mem",
  project: "prj",
  workflow: "wf",
  version: "ver",
  node: "nd",
  edge: "ed",
  execution: "run",
  step: "stp",
  approval: "apv",
  integration: "int",
  secret: "sec",
  template: "tpl",
  audit: "aud",
  usage: "usg",
  session: "ses",
  webhook: "whk",
} as const;

export function id(prefix: keyof typeof prefixes): string {
  return createId(prefixes[prefix]);
}
