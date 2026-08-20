import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_PERSONA_PATH = path.join(repositoryRoot, "SKILL.md");

export function loadPersona(skillPath = DEFAULT_PERSONA_PATH): string {
  const persona = readFileSync(skillPath, "utf8").trim();
  if (!persona) {
    throw new Error(`Persona source is empty: ${skillPath}`);
  }
  return persona;
}
