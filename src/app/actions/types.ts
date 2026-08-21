export type ActionResult = {
  success: boolean;
  error?: string;
};

export function failAction(error: unknown, fallback: string): ActionResult {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}
