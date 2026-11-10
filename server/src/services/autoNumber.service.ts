import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Auto-Number-Service für automatische Nummerngenerierung
 * 
 * Formate:
 * - Kundennummer: KD-{JAHR}-{NUMMER} z.B. KD-2026-0001
 * - Rechnungsnummer: INV-{JAHR}-{NUMMER} z.B. INV-2026-0001
 * - Objektnummer: OBJ-{JAHR}-{NUMMER} z.B. OBJ-2026-0001
 * 
 * Konfigurierbar pro Tenant:
 * - Präfix (z.B. KD, CUSTOMER, C)
 * - Startwert (z.B. 1, 100, 1000)
 * - Stellenanzahl (z.B. 4 Stellen = 0001)
 */

export class AutoNumberService {
  /**
   * Generiert die nächste Kundennummer
   */
  async generateCustomerNumber(tenantId: string): Promise<string> {
    // Lade Tenant-Konfiguration (oder Default)
    const config = await this.getConfig(tenantId, 'customer');
    
    const prefix = config.prefix || 'KD';
    const startNumber = config.startNumber || 1;
    const padding = config.padding || 4;
    
    const year = new Date().getFullYear();
    
    // Hole höchste Nummer für dieses Jahr
    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        customerNumber: {
          startsWith: `${prefix}-${year}-`,
        },
      },
      select: {
        customerNumber: true,
      },
      orderBy: {
        customerNumber: 'desc',
      },
      take: 1,
    });
    
    let nextNumber = startNumber;
    
    if (customers.length > 0) {
      // Extrahiere Nummer aus letzter Kundennummer
      const lastNumber = customers[0].customerNumber;
      const parts = lastNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      nextNumber = lastNum + 1;
    }
    
    // Formatiere Nummer mit Padding
    const paddedNumber = nextNumber.toString().padStart(padding, '0');
    
    return `${prefix}-${year}-${paddedNumber}`;
  }
  
  /**
   * Generiert die nächste Rechnungsnummer
   */
  async generateInvoiceNumber(tenantId: string): Promise<string> {
    const config = await this.getConfig(tenantId, 'invoice');
    
    const prefix = config.prefix || 'INV';
    const startNumber = config.startNumber || 1;
    const padding = config.padding || 4;
    
    const year = new Date().getFullYear();
    
    const invoices = await prisma.customerInvoice.findMany({
      where: {
        tenantId,
        invoiceNumber: {
          startsWith: `${prefix}-${year}-`,
        },
      },
      select: {
        invoiceNumber: true,
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
      take: 1,
    });
    
    let nextNumber = startNumber;
    
    if (invoices.length > 0) {
      const lastNumber = invoices[0].invoiceNumber;
      const parts = lastNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      nextNumber = lastNum + 1;
    }
    
    const paddedNumber = nextNumber.toString().padStart(padding, '0');
    
    return `${prefix}-${year}-${paddedNumber}`;
  }
  
  /**
   * Generiert die nächste Objektnummer
   */
  async generateObjectNumber(tenantId: string): Promise<string> {
    const config = await this.getConfig(tenantId, 'object');
    
    const prefix = config.prefix || 'OBJ';
    const startNumber = config.startNumber || 1;
    const padding = config.padding || 4;
    
    const year = new Date().getFullYear();
    
    const objects = await prisma.sMSObject.findMany({
      where: {
        tenantId,
        objectNumber: {
          startsWith: `${prefix}-${year}-`,
        },
      },
      select: {
        objectNumber: true,
      },
      orderBy: {
        objectNumber: 'desc',
      },
      take: 1,
    });
    
    let nextNumber = startNumber;
    
    if (objects.length > 0) {
      const lastNumber = objects[0].objectNumber;
      const parts = lastNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      nextNumber = lastNum + 1;
    }
    
    const paddedNumber = nextNumber.toString().padStart(padding, '0');
    
    return `${prefix}-${year}-${paddedNumber}`;
  }
  
  /**
   * Lädt die Konfiguration für einen Entity-Typ
   * TODO: Aus TenantFieldConfig oder separater Config-Tabelle laden
   */
  private async getConfig(tenantId: string, entityType: string): Promise<{
    prefix?: string;
    startNumber?: number;
    padding?: number;
  }> {
    // TODO: Implementierung mit TenantFieldConfig oder separater Config-Tabelle
    // Für jetzt: Default-Werte
    
    const defaults: Record<string, { prefix: string; startNumber: number; padding: number }> = {
      customer: { prefix: 'KD', startNumber: 1, padding: 4 },
      invoice: { prefix: 'INV', startNumber: 1, padding: 4 },
      object: { prefix: 'OBJ', startNumber: 1, padding: 4 },
    };
    
    return defaults[entityType] || defaults.customer;
  }
  
  /**
   * Aktualisiert die Konfiguration für einen Entity-Typ
   */
  async updateConfig(
    tenantId: string,
    entityType: string,
    config: { prefix?: string; startNumber?: number; padding?: number }
  ): Promise<void> {
    // TODO: Implementierung mit TenantFieldConfig oder separater Config-Tabelle
    logger.info(`Auto-Number-Config aktualisiert für ${entityType}: ${JSON.stringify(config)}`);
  }
}

export const autoNumberService = new AutoNumberService();
