import { useState, useEffect } from 'react';
import { platformService, Plan } from '../../services/platform.service';

export function PlanListPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await platformService.listPlans();
      setPlans(data);
    } catch (err) {
      console.error('Fehler beim Laden der Tarife:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tarife</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie die verfügbaren Abonnement-Tarife</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Neuer Tarif
        </button>
      </div>

      {/* Tarif-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-8 text-center text-gray-500">Laden...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-3 p-8 text-center text-gray-500">Keine Tarife vorhanden</div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-md p-6 border-2 ${
                plan.isActive ? 'border-transparent' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  )}
                </div>
                {plan.isActive ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Aktiv
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    Inaktiv
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">
                    {Number(plan.monthlyPrice).toLocaleString('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                  <span className="text-gray-600 ml-2">/ Monat</span>
                </div>
                <div className="text-sm text-gray-600">
                  oder {Number(plan.yearlyPrice).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / Jahr
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                {plan.employeeLimit && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600">Bis zu</span>
                    <span className="font-medium text-gray-900 ml-1">{plan.employeeLimit} Mitarbeiter</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <span className="text-gray-600">Aktive Abonnements:</span>
                  <span className="font-medium text-gray-900 ml-1">{plan.subscriptionCount}</span>
                </div>
              </div>

              {plan.features && typeof plan.features === 'object' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
                  <div className="space-y-1">
                    {Object.entries(plan.features).map(([key, value]) => (
                      <div key={key} className="flex items-center text-sm">
                        {value ? (
                          <span className="text-green-600 mr-2">✓</span>
                        ) : (
                          <span className="text-gray-400 mr-2">✗</span>
                        )}
                        <span className="text-gray-700">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  Bearbeiten
                </button>
                {!plan.isActive && (
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                    Löschen
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
