import { useState } from 'react';
import { X, FileSpreadsheet, Star } from 'lucide-react';

export default function DatevAddonBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded"
        aria-label="Schließen"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            DATEV Mitarbeiter-Import
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
              Premium Add-on
            </span>
          </h3>
          
          <p className="text-gray-600 mt-1 text-sm">
            Importieren Sie Ihre Mitarbeiter automatisch aus DATEV. Keine manuelle Dateneingabe mehr, 
            weniger Fehler, immer aktuelle Daten.
          </p>

          <div className="mt-3 flex items-center gap-4">
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Mehr erfahren →
            </button>
            <span className="text-sm text-gray-500">
              Ab € 49,90/Monat
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
