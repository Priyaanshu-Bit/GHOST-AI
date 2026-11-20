import { task, logger } from "@trigger.dev/sdk";
import { executeSpecGeneration } from "@/lib/ai/spec-service";
import type { GenerateSpecPayload } from "@/types/tasks";

/**
 * Background spec generation Trigger.dev task.
 * Delegates to the unified spec generation service.
 */
export const generateSpec = task({
  id: "generate-spec",
  run: async (payload: GenerateSpecPayload, { ctx }) => {
    logger.info("Spec generation task started", {
      runId: ctx.run.id,
      projectId: payload.projectId,
      roomId: payload.roomId,
    });
    return await executeSpecGeneration(payload);
  },
});
