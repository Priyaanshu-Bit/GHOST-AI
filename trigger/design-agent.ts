import { task, logger } from "@trigger.dev/sdk";
import { executeDesignAgent, type DesignAgentParams } from "@/lib/ai/design-service";

export type DesignAgentPayload = DesignAgentParams;

/**
 * Background design agent Trigger.dev task.
 * Delegates to the unified design agent execution service.
 */
export const designAgent = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload, { ctx }) => {
    logger.info("Design agent task started", {
      runId: ctx.run.id,
      roomId: payload.roomId,
      prompt: payload.prompt,
    });
    return await executeDesignAgent(payload);
  },
});
