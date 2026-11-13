import { useEffect, useState } from 'react';
import { attendanceService } from '../../services/attendance.service';
import { objectService } from '../../services/object.service';
import { userService } from '../../services/user.service';

type AccessRow = { id: string; canEdit: boolean; canApprove: boolean; user: { id: string; firstName: string; lastName: string; email: string; role: { name: string } }; object: { id: string; name: string; objectNumber: string } };

export function AttendanceObjectAccess() {
  const [users, setUsers] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [entries, setEntries] = useState<AccessRow[]>([]);
  const [userId, setUserId] = useState('');
  const [objectId, setObjectId] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const [userResult, objectResult, accessResult] = await Promise.all([
        userService.list({ isActive: true, limit: 100 }), objectService.list({ isActive: true, limit: 100 }), attendanceService.listObjectAccess(),
      ]);
      setUsers(userResult.users); setObjects(objectResult.objects); setEntries(accessResult); setError(''); setLoaded(true);
    } catch (err: any) { setError(err.response?.data?.message || 'Objekt-Zugriffe können mit Ihren Rechten nicht verwaltet werden.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!userId || !objectId) { setError('Bitte Benutzer und Objekt wählen.'); return; }
    setBusy(true); setError('');
    try { await attendanceService.setObjectAccess({ userId, objectId, canEdit, canApprove }); await load(); }
    catch (err: any) { setError(err.response?.data?.message || 'Zugriff konnte nicht gespeichert werden.'); }
    finally { setBusy(false); }
  };
  const remove = async (entry: AccessRow) => {
    setBusy(true); setError('');
    try { await attendanceService.removeObjectAccess(entry.user.id, entry.object.id); await load(); }
    catch (err: any) { setError(err.response?.data?.message || 'Zugriff konnte nicht entfernt werden.'); }
    finally { setBusy(false); }
  };

  return <section className="card mt-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Objektbezogene Zeitrechte</h2><p className="text-sm text-gray-500">Zugriff für Disponenten und Objektleitungen festlegen</p></div><button type="button" className="btn-secondary" onClick={load}>Aktualisieren</button></div>
    {error && <p role="alert" className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
    {loaded && <><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-sm">Benutzer<select className="input-field mt-1" value={userId} onChange={event => setUserId(event.target.value)}><option value="">Benutzer auswählen</option>{users.map(user => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} · {user.role.name}</option>)}</select></label><label className="text-sm">Objekt<select className="input-field mt-1" value={objectId} onChange={event => setObjectId(event.target.value)}><option value="">Objekt auswählen</option>{objects.map(object => <option key={object.id} value={object.id}>{object.objectNumber} · {object.name}</option>)}</select></label></div><div className="my-3 flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={canEdit} onChange={event => setCanEdit(event.target.checked)} />Zeiten bearbeiten</label><label className="flex items-center gap-2"><input type="checkbox" checked={canApprove} onChange={event => setCanApprove(event.target.checked)} />Zeiten freigeben</label></div><button type="button" className="btn-primary" disabled={busy} onClick={save}>Zugriff speichern</button><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-2">Benutzer</th><th className="p-2">Objekt</th><th className="p-2">Rechte</th><th className="p-2"></th></tr></thead><tbody className="divide-y">{entries.map(entry => <tr key={entry.id}><td className="p-2">{entry.user.firstName} {entry.user.lastName}<div className="text-xs text-gray-500">{entry.user.role.name}</div></td><td className="p-2">{entry.object.objectNumber} · {entry.object.name}</td><td className="p-2">{[entry.canEdit && 'Bearbeiten', entry.canApprove && 'Freigeben'].filter(Boolean).join(' · ') || 'Nur ansehen'}</td><td className="p-2 text-right"><button type="button" disabled={busy} onClick={() => remove(entry)} className="text-red-700 hover:underline">Entfernen</button></td></tr>)}</tbody></table>{entries.length === 0 && <p className="p-3 text-sm text-gray-500">Noch keine Objekt-Zeitrechte zugewiesen.</p>}</div></>}
    {!loaded && busy && <p className="p-4 text-center text-gray-500">Benutzer und Objekte werden geladen …</p>}
  </section>;
}
