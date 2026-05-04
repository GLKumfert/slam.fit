import { z } from "zod";

const uuidArray = z.array(z.string().uuid());

export const joinSessionSchema = z.object({
  name: z.string().trim().min(1).max(50),
  roleIds: uuidArray.min(1).max(10),
  availableSlotIds: uuidArray,
});

// Availability is stored as a complete replacement rather than a diff.
// The client sends the full current set of selected slot IDs and the server
// deletes the participant's old rows then inserts the new ones in a single
// transaction. This avoids the complexity of computing added/removed deltas
// on both ends and keeps the API surface small and idempotent.
export const updateParticipantSchema = z.object({
  participantToken: z.string().uuid(),
  name: z.string().trim().min(1).max(50),
  roleIds: uuidArray,
  availableSlotIds: uuidArray,
});

export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;
