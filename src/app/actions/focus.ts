"use server";

import { revalidateApp } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";
import { focusUntilFor, type FocusSpan } from "@/lib/focus";
import { setFocusSchema } from "@/lib/validations";
import { failAction, type ActionResult } from "@/app/actions/types";

function focusData(span: FocusSpan | null) {
  if (!span) return { focusedAt: null, focusUntil: null };
  return { focusedAt: new Date(), focusUntil: focusUntilFor(span, getTodayDate()) };
}

/** Put a project in focus for `span`, or take it out with null. */
export async function setProjectFocus(
  id: string,
  span: FocusSpan | null
): Promise<ActionResult> {
  const parsed = setFocusSchema.safeParse({ id, span });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await prisma.project.update({
      where: { id: parsed.data.id },
      data: focusData(parsed.data.span),
    });
  } catch (error) {
    return failAction(error, "Failed to update focus.");
  }

  revalidateApp();
  return { success: true };
}

/** Put a task in focus for `span`, or take it out with null. */
export async function setTaskFocus(
  id: string,
  span: FocusSpan | null
): Promise<ActionResult> {
  const parsed = setFocusSchema.safeParse({ id, span });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await prisma.task.update({
      where: { id: parsed.data.id },
      data: focusData(parsed.data.span),
    });
  } catch (error) {
    return failAction(error, "Failed to update focus.");
  }

  revalidateApp();
  return { success: true };
}
