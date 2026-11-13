import { describe, expect, it, vi } from 'vitest';
import {
  actorFromRequestUser,
  appendTimeRecordAuditEvent,
  systemActor,
} from '../timeRecordAudit.service';

describe('timeRecordAudit.service', () => {
  it('builds an actor snapshot from the authenticated user', () => {
    expect(actorFromRequestUser(
      { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace', roleSlug: 'manager' },
      '192.0.2.7',
      'Protektor Mobile/1.0',
    )).toEqual({
      userId: 'user-1',
      userName: 'Ada Lovelace',
      role: 'manager',
      ipAddress: '192.0.2.7',
      deviceInfo: 'Protektor Mobile/1.0',
    });
  });

  it('appends a serializable audit snapshot through the caller transaction', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => data);
    const tx = {
      employee: { findFirst: vi.fn().mockResolvedValue({ firstName: 'Mia', lastName: 'Test' }) },
      sMSObject: { findFirst: vi.fn().mockResolvedValue({ name: 'Tor 1' }) },
      timeRecordAuditEvent: { create },
    };
    const record = {
      id: 'record-1', tenantId: 'tenant-1', employeeId: 'employee-1', objectId: 'object-1',
      date: new Date('2026-11-12T00:00:00.000Z'),
    };
    const actor = {
      userId: 'user-1', userName: 'Ada Lovelace', role: 'manager',
      ipAddress: '192.0.2.7', deviceInfo: 'Protektor Mobile/1.0',
    };
    const change = {
      action: 'corrected' as const,
      fieldChanged: 'clockOut',
      oldValue: { clockOut: '2026-11-12T16:00:00.000Z' },
      newValue: { clockOut: '2026-11-12T16:15:00.000Z' },
      reasonCategory: 'incorrect_punch',
      comment: 'Fehlende Viertelstunde ergänzt',
    };

    const result = await appendTimeRecordAuditEvent(tx, record, actor, change);

    expect(tx.employee.findFirst).toHaveBeenCalledWith({
      where: { id: 'employee-1', tenantId: 'tenant-1' },
      select: { firstName: true, lastName: true },
    });
    expect(tx.sMSObject.findFirst).toHaveBeenCalledWith({
      where: { id: 'object-1', tenantId: 'tenant-1' },
      select: { name: true },
    });
    expect(create).toHaveBeenCalledOnce();
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      tenantId: 'tenant-1', timeRecordId: 'record-1', actorUserId: 'user-1',
      actorName: 'Ada Lovelace', actorRole: 'manager', employeeName: 'Mia Test',
      objectName: 'Tor 1', action: 'corrected', fieldChanged: 'clockOut',
      reasonCategory: 'incorrect_punch', comment: change.comment,
      ipAddress: '192.0.2.7', deviceInfo: 'Protektor Mobile/1.0',
    });
    expect(data.oldValue).toEqual(change.oldValue);
    expect(data.newValue).toEqual(change.newValue);
    expect(result).toBe(data);
  });

  it('records missing optional relations without inventing them', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => data);
    const tx = {
      employee: { findFirst: vi.fn().mockResolvedValue(null) },
      sMSObject: { findFirst: vi.fn() },
      timeRecordAuditEvent: { create },
    };

    await appendTimeRecordAuditEvent(
      tx,
      { id: 'record-2', tenantId: 'tenant-2', employeeId: 'missing-employee', objectId: null, date: new Date('2026-11-12T00:00:00.000Z') },
      systemActor(),
      { action: 'created' },
    );

    expect(tx.sMSObject.findFirst).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      employeeName: 'Unbekannt', objectId: null, objectName: null,
      actorUserId: undefined, actorName: 'System', actorRole: 'system',
    }) });
  });
});
