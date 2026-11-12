import { type Deployment } from '../../services/deployment.service';

interface KPIBarProps {
  deployments: Deployment[];
}

export function KPIBar({ deployments }: KPIBarProps) {
  // Berechne KPIs
  const totalDeployments = deployments.length;
  
  const occupiedDeployments = deployments.filter(
    d => d.employeeId && d.status !== 'cancelled' && d.status !== 'declined'
  ).length;
  
  const openDeployments = deployments.filter(
    d => !d.employeeId && d.status !== 'cancelled' && d.status !== 'declined'
  ).length;
  
  // Berechne Gesamtstunden
  const totalHours = deployments.reduce((sum, dep) => {
    if (dep.status === 'cancelled' || dep.status === 'declined') return sum;
    
    const [startH, startM] = dep.startTime.split(':').map(Number);
    const [endH, endM] = dep.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);
    let durationMinutes = endMinutes - startMinutes;
    
    // Über Nacht
    if (durationMinutes < 0) durationMinutes += 24 * 60;
    
    // Pause abziehen
    durationMinutes -= dep.breakMinutes || 0;
    
    return sum + durationMinutes / 60;
  }, 0);
  
  // Konflikte zählen (Doppelbelegungen)
  const employeeMap = new Map<string, Deployment[]>();
  deployments.forEach(dep => {
    if (!dep.employeeId || dep.status === 'cancelled' || dep.status === 'declined') return;
    const key = `${dep.employeeId}_${dep.date}`;
    if (!employeeMap.has(key)) employeeMap.set(key, []);
    employeeMap.get(key)!.push(dep);
  });
  
  let conflicts = 0;
  employeeMap.forEach(deps => {
    for (let i = 0; i < deps.length; i++) {
      for (let j = i + 1; j < deps.length; j++) {
        const a = deps[i];
        const b = deps[j];
        
        const [aStartH, aStartM] = a.startTime.split(':').map(Number);
        const [aEndH, aEndM] = a.endTime.split(':').map(Number);
        const [bStartH, bStartM] = b.startTime.split(':').map(Number);
        const [bEndH, bEndM] = b.endTime.split(':').map(Number);
        
        const aStart = aStartH * 60 + (aStartM || 0);
        const aEnd = aEndH * 60 + (aEndM || 0);
        const bStart = bStartH * 60 + (bStartM || 0);
        const bEnd = bEndH * 60 + (bEndM || 0);
        
        // Überlappung?
        if (aStart < bEnd && bStart < aEnd) {
          conflicts++;
        }
      }
    }
  });
  
  return (
    <div className="card mb-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPIStat
          label="Einsätze gesamt"
          value={totalDeployments}
          icon="📊"
          color="blue"
        />
        <KPIStat
          label="Besetzte Schichten"
          value={occupiedDeployments}
          icon="✅"
          color="green"
        />
        <KPIStat
          label="Offene Schichten"
          value={openDeployments}
          icon="⚠️"
          color={openDeployments > 0 ? 'orange' : 'green'}
        />
        <KPIStat
          label="Gesamtstunden"
          value={`${totalHours.toFixed(1)}h`}
          icon="⏱️"
          color="purple"
        />
        <KPIStat
          label="Konflikte"
          value={conflicts}
          icon="⚡"
          color={conflicts > 0 ? 'red' : 'green'}
        />
      </div>
    </div>
  );
}

function KPIStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  };
  
  const c = colors[color] || colors.blue;
  
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.iconBg}`}>
        <span className="text-lg">{icon}</span>
      </div>
      <div>
        <p className={`text-xl font-bold ${c.text}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
