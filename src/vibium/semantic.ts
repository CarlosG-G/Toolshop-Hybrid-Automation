import type { Element, Page } from "vibium";

export async function findSemanticHeadings(
  page: Page,
  text: string,
): Promise<Element[]> {
  try {
    return await page.findAll(
      { role: "heading", text },
      { timeout: 2_000 },
    );
  } catch (error) {
    const expectedWait = `waiting for 'role=heading, text=${text}'`;
    if (
      error instanceof Error &&
      error.message.startsWith("timeout: timeout after") &&
      error.message.includes(expectedWait) &&
      error.message.endsWith(": no elements found")
    ) {
      return [];
    }
    throw error;
  }
}
