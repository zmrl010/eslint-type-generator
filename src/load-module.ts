/**
 * Dynamically load a module
 *
 * @param name name of module to import
 * @returns default export if exists, else the entire module
 */
export async function loadModule(name: string): Promise<unknown> {
  const module = await import(name);
  return module?.default ?? module;
}
