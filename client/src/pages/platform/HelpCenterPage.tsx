import { useState, useEffect } from 'react';

interface HelpArticle {
  id: string;
  category: string;
  subcategory?: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  viewCount: number;
}

// Statische Hilfe-Artikel (in Production aus Datenbank laden)
const HELP_ARTICLES: HelpArticle[] = [
  {
    id: '1', category: 'admin', title: 'Neuen Mandanten anlegen', slug: 'tenant-create',
    content: '## Neuen Mandanten anlegen\n\n1. Gehen Sie zu "Mandanten"\n2. Klicken Sie auf "Neuer Mandant"\n3. Füllen Sie das Formular aus\n4. Klicken Sie auf "Erstellen"\n\nDer Mandant erhält automatisch eine Testlizenz für 30 Tage.',
    tags: ['mandant', 'erstellung', 'tenant'], viewCount: 245,
  },
  {
    id: '2', category: 'admin', title: 'Lizenz-Status ändern', slug: 'license-status',
    content: '## Lizenz-Status ändern\n\nVerfügbare Status:\n- **TEST**: Testphase (30 Tage)\n- **ACTIVE**: Voll aktiviert\n- **SUSPENDED**: Gesperrt (keine Schreibzugriffe)\n- **CANCELLED**: Gekündigt\n\nSo ändern Sie den Status:\n1. Mandanten auswählen\n2. "Lizenz" Tab öffnen\n3. Neuen Status wählen\n4. Bestätigen',
    tags: ['lizenz', 'status', 'sperren'], viewCount: 189,
  },
  {
    id: '3', category: 'admin', title: 'SEPA-Lastschrift einrichten', slug: 'sepa-setup',
    content: '## SEPA-Lastschrift einrichten\n\n### 1. Gläubiger-ID beantragen\nBeantragen Sie bei Ihrer Bank eine SEPA-Gläubiger-ID.\n\n### 2. Bankverbindung konfigurieren\nGehen Sie zu Entwickler → Bank/SEPA und tragen Sie Ihre Bankdaten ein.\n\n### 3. Mandate verwalten\nFür jeden Kunden muss ein SEPA-Mandat vorliegen.',
    tags: ['sepa', 'bank', 'zahlung', 'lastschrift'], viewCount: 156,
  },
  {
    id: '4', category: 'admin', title: 'Stripe Webhooks konfigurieren', slug: 'stripe-webhooks',
    content: '## Stripe Webhooks konfigurieren\n\n1. Gehen Sie zu Entwickler → Zahlungen\n2. Tragen Sie Ihre Stripe API Keys ein\n3. In Stripe Dashboard: Webhook-URL hinzufügen\n   `https://ihre-domain.de/api/platform/webhooks/stripe`\n4. Webhook Secret kopieren und hier eintragen\n5. Verbindung testen',
    tags: ['stripe', 'webhook', 'zahlung'], viewCount: 134,
  },
  {
    id: '5', category: 'admin', title: 'Kritische Berichte verstehen', slug: 'critical-reports',
    content: '## Kritische Berichte verstehen\n\nDas Dashboard zeigt automatisch kritische Probleme:\n\n- 🔴 **Kritisch**: Sofortiges Handeln erforderlich\n- 🟡 **Warnung**: Baldige Aufmerksamkeit nötig\n- 🔵 **Info**: Zur Information\n\nJeder Bericht enthält konkrete Lösungsvorschläge mit Priorität und Aufwand.',
    tags: ['berichte', 'dashboard', 'probleme'], viewCount: 98,
  },
  {
    id: '6', category: 'user', title: 'Mitarbeiter anlegen', slug: 'employee-create',
    content: '## Mitarbeiter anlegen\n\n1. Menü → Mitarbeiter\n2. "Neuer Mitarbeiter" klicken\n3. Daten eingeben:\n   - Name, E-Mail\n   - Personalnummer\n   - Beschäftigungsart\n   - Qualifikationen\n4. Speichern\n\nDer Mitarbeiter erhält eine E-Mail mit Login-Daten.',
    tags: ['mitarbeiter', 'erstellung'], viewCount: 312,
  },
  {
    id: '7', category: 'user', title: 'Dienstplan erstellen', slug: 'deployment-create',
    content: '## Dienstplan erstellen\n\n### Manuell:\n1. Menü → Dienstplanung\n2. Objekt und Mitarbeiter wählen\n3. Datum und Uhrzeit festlegen\n4. Speichern\n\n### KI-gestützt:\n1. Menü → Auto-Planung\n2. Zeitraum wählen\n3. Parameter einstellen\n4. KI erstellt optimalen Plan\n5. Plan prüfen und freigeben',
    tags: ['dienstplan', 'planung', 'ki'], viewCount: 278,
  },
  {
    id: '8', category: 'user', title: 'Zeiten erfassen', slug: 'time-tracking',
    content: '## Zeiterfassung\n\n### Über Web:\n1. Menü → Zeiterfassung\n2. "Neue Zeit" klicken\n3. Mitarbeiter, Datum, Stunden eingeben\n4. Speichern\n\n### Über Mobile App:\n1. App öffnen\n2. Stempeln (GPS-Ortung)\n3. Pause starten/beenden\n4. Abmelden',
    tags: ['zeit', 'erfassung', 'mobil'], viewCount: 401,
  },
  {
    id: '9', category: 'user', title: 'DATEV-Export durchführen', slug: 'datev-export',
    content: '## DATEV-Export\n\n1. Menü → Abrechnung → DATEV-Export\n2. Zeitraum wählen\n3. Daten validieren\n4. Export starten\n5. CSV-Datei herunterladen\n6. In DATEV importieren\n\n**Wichtig**: Alle Mitarbeiter müssen vollständige Stammdaten haben (Steuer-ID, SV-Nummer, IBAN).',
    tags: ['datev', 'export', 'lohn'], viewCount: 167,
  },
  {
    id: '10', category: 'troubleshooting', title: 'Login-Probleme', slug: 'login-issues',
    content: '## Login-Probleme beheben\n\n### "Ungültige Anmeldedaten"\n- E-Mail korrekt?\n- Passwort korrekt? (Groß-/Kleinschreibung)\n- Caps Lock aktiv?\n\n### "Account gesperrt"\n- Zu viele Fehlversuche?\n- Warten Sie 15 Minuten\n- Oder Admin kontaktieren\n\n### "Lizenz abgelaufen"\n- Admin kontaktieren\n- Subscription verlängern',
    tags: ['login', 'problem', 'passwort'], viewCount: 523,
  },
];

export function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categories = [
    { id: 'all', label: 'Alle Artikel', icon: '📖' },
    { id: 'admin', label: 'Admin-Anleitungen', icon: '🔧' },
    { id: 'user', label: 'Anwender-Hilfe', icon: '👤' },
    { id: 'api', label: 'API-Dokumentation', icon: '🔗' },
    { id: 'troubleshooting', label: 'Fehlerbehebung', icon: '🔨' },
  ];

  const filteredArticles = HELP_ARTICLES.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (selectedArticle) {
    return (
      <div>
        <button onClick={() => setSelectedArticle(null)} className="mb-4 text-blue-600 hover:text-blue-700 flex items-center">
          ← Zurück zur Übersicht
        </button>
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>{categories.find(c => c.id === selectedArticle.category)?.icon}</span>
            <span>{categories.find(c => c.id === selectedArticle.category)?.label}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{selectedArticle.title}</h1>
          <div className="prose max-w-none">
            {selectedArticle.content.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-8 mb-4">{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-semibold mt-6 mb-3">{line.replace('### ', '')}</h3>;
              if (line.startsWith('- **')) {
                const parts = line.replace('- ', '').split('**');
                return <li key={i} className="ml-4 mb-2"><strong>{parts[1]}</strong>{parts[2]}</li>;
              }
              if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-2">{line.replace('- ', '')}</li>;
              if (line.match(/^\d+\./)) return <li key={i} className="ml-4 mb-2 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
              if (line.trim() === '') return <br key={i} />;
              return <p key={i} className="mb-3">{line}</p>;
            })}
          </div>
          <div className="mt-8 pt-6 border-t flex items-center justify-between">
            <div className="flex gap-2">
              {selectedArticle.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">#{tag}</span>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => {/* print */}} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                🖨️ Drucken
              </button>
              <button onClick={() => {/* email */}} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                📧 Per E-Mail senden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 Hilfe-Center</h1>
          <p className="text-gray-600 mt-2">Anleitungen, Dokumentation und Support</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Neuer Artikel
        </button>
      </div>

      {/* Suche */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          <input
            type="text"
            placeholder="Suche nach Anleitungen, Themen oder Fehlern..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Kategorien */}
      <div className="flex gap-3 mb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{cat.icon}</span>
            <span className="text-sm font-medium">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Artikel-Liste */}
      <div className="bg-white rounded-xl shadow-sm border">
        {filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-4xl mb-4">🔍</p>
            <p>Keine Artikel gefunden</p>
          </div>
        ) : (
          filteredArticles.map(article => (
            <button
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="w-full text-left p-6 border-b last:border-b-0 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{categories.find(c => c.id === article.category)?.icon}</span>
                    <span className="text-xs text-gray-500 uppercase">{article.category}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
                  <div className="flex gap-2 mt-2">
                    {article.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">#{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>👁️ {article.viewCount}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div data-modal-guard="" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Neuen Hilfe-Artikel erstellen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
                <select className="w-full px-4 py-2 border rounded-lg">
                  <option value="admin">Admin-Anleitungen</option>
                  <option value="user">Anwender-Hilfe</option>
                  <option value="api">API-Dokumentation</option>
                  <option value="troubleshooting">Fehlerbehebung</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="z.B. Wie erstelle ich einen neuen Mitarbeiter?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inhalt (Markdown)</label>
                <textarea className="w-full px-4 py-2 border rounded-lg h-64" placeholder="Schreiben Sie Ihre Anleitung hier..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (kommagetrennt)</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="mitarbeiter, erstellung, anleitung" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">Abbrechen</button>
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Artikel erstellen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
