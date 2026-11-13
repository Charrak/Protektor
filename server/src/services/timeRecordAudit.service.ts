export interface TimeRecordActorContext {
  userId?: string;
  userName: string;
  role: string;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface TimeRecordAuditChange {
  action: 'created' | 'backfilled' | 'stamped_out' | 'corrected' | 'correction_requested' | 'correction_approved' | 'correction_rejected' | 'approved' | 'released' | 'unlocked' | 'billing_exported' | 'locked' | 'billed' | 'voided' | 'break_started' | 'break_ended' | 'timesheet_closed' | 'timesheet_signed';
  fieldChanged?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reasonCategory?: string;
  comment?: string;
}

/** Writes a single, append-only audit entry using the caller's transaction. */
export async function appendTimeRecordAuditEvent(
  tx: any,
  record: any,
  actor: TimeRecordActorContext,
  change: TimeRecordAuditChange,
) {
  const [employee, object] = await Promise.all([
    tx.employee.findFirst({
      where: { id: record.employeeId, tenantId: record.tenantId },
      select: { firstName: true, lastName: true },
    }),
    record.objectId
      ? tx.sMSObject.findFirst({
          where: { id: record.objectId, tenantId: record.tenantId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  return tx.timeRecordAuditEvent.create({
    data: {
      tenantId: record.tenantId,
      timeRecordId: record.id,
      actorUserId: actor.userId,
      actorName: actor.userName,
      actorRole: actor.role,
      action: change.action,
      employeeId: record.employeeId,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unbekannt',
      objectId: record.objectId || null,
      objectName: object?.name || null,
      recordDate: record.date,
      fieldChanged: change.fieldChanged,
      oldValue: change.oldValue === undefined ? undefined : JSON.parse(JSON.stringify(change.oldValue)),
      newValue: change.newValue === undefined ? undefined : JSON.parse(JSON.stringify(change.newValue)),
      reasonCategory: change.reasonCategory,
      comment: change.comment,
      ipAddress: actor.ipAddress,
      deviceInfo: actor.deviceInfo,
    },
  });
}

export function actorFromRequestUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  roleSlug: string;
}, ipAddress?: string, deviceInfo?: string): TimeRecordActorContext {
  return {
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`,
    role: user.roleSlug,
    ipAddress,
    deviceInfo,
  };
}

export function systemActor(): TimeRecordActorContext {
  return { userName: 'System', role: 'system' };
}

