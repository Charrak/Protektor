import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Bank Connection Controller
 * Verwaltung der Bankverbindungen und SEPA-Mandate
 */
export class BankController {
  /**
   * GET /api/platform/developer/bank-connections
   */
  async listBankConnections(req: Request, res: Response) {
    try {
      const connections = await prisma.bankConnection.findMany({
        orderBy: { isDefault: 'desc' },
      });

      // IBAN maskieren
      const masked = connections.map((conn: any) => ({
        ...conn,
        iban: conn.iban.substring(0, 8) + '***' + conn.iban.substring(conn.iban.length - 4),
      }));

      res.json({ success: true, data: masked });
    } catch (error) {
      logger.error('List Bank Connections Error:', error);
      res.status(500).json({ error: 'Bankverbindungen konnten nicht geladen werden' });
    }
  }

  /**
   * POST /api/platform/developer/bank-connections
   */
  async createBankConnection(req: Request, res: Response) {
    try {
      const { name, iban, bic, bankName, creditorId, isDefault } = req.body;

      if (!name || !iban || !bic || !bankName) {
        return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
      }

      // IBAN validieren (einfache Prüfung)
      if (iban.length < 15 || iban.length > 34) {
        return res.status(400).json({ error: 'Ungültige IBAN' });
      }

      // Wenn default, alle anderen auf false setzen
      if (isDefault) {
        await prisma.bankConnection.updateMany({
          where: { tenantId: null },
          data: { isDefault: false },
        });
      }

      const connection = await prisma.bankConnection.create({
        data: { name, iban, bic, bankName, creditorId, isDefault: isDefault || false },
      });

      res.json({
        success: true,
        data: connection,
        message: 'Bankverbindung erfolgreich hinzugefügt',
      });
    } catch (error) {
      logger.error('Create Bank Connection Error:', error);
      res.status(500).json({ error: 'Bankverbindung konnte nicht erstellt werden' });
    }
  }

  /**
   * DELETE /api/platform/developer/bank-connections/:id
   */
  async deleteBankConnection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.bankConnection.delete({ where: { id } });
      
      res.json({ success: true, message: 'Bankverbindung gelöscht' });
    } catch (error) {
      logger.error('Delete Bank Connection Error:', error);
      res.status(500).json({ error: 'Bankverbindung konnte nicht gelöscht werden' });
    }
  }

  /**
   * GET /api/platform/developer/sepa-mandates
   */
  async listSepaMandates(req: Request, res: Response) {
    try {
      const { tenantId, status } = req.query;
      
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (status) where.status = status;

      const mandates = await prisma.sepaMandate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: mandates });
    } catch (error) {
      logger.error('List SEPA Mandates Error:', error);
      res.status(500).json({ error: 'SEPA-Mandate konnten nicht geladen werden' });
    }
  }

  /**
   * POST /api/platform/developer/sepa/execute-direct-debit
   */
  async executeDirectDebit(req: Request, res: Response) {
    try {
      const { tenantId, amount, description, collectionDate } = req.body;

      if (!tenantId || !amount) {
        return res.status(400).json({ error: 'Tenant und Betrag erforderlich' });
      }

      // Prüfe ob aktives SEPA-Mandat vorhanden
      const mandate = await prisma.sepaMandate.findFirst({
        where: { tenantId, status: 'ACTIVE' },
      });

      if (!mandate) {
        return res.status(400).json({
          error: 'Kein aktives SEPA-Mandat vorhanden',
          message: 'Der Kunde muss erst ein SEPA-Mandat unterschreiben',
        });
      }

      // In Production: Hier würde die echte Bank-API aufgerufen
      // Für jetzt: Simulation
      const transaction = {
        id: `txn_${Date.now()}`,
        mandateRef: mandate.mandateRef,
        amount,
        currency: 'EUR',
        description: description || `Abonnement ${new Date().toLocaleDateString('de-DE')}`,
        collectionDate: collectionDate || new Date(),
        status: 'PENDING',
        createdAt: new Date(),
      };

      logger.info(`SEPA-Lastschrift initiiert: €${amount} von Tenant ${tenantId}`);

      res.json({
        success: true,
        data: transaction,
        message: 'SEPA-Lastschrift erfolgreich initiiert',
      });
    } catch (error) {
      logger.error('Execute Direct Debit Error:', error);
      res.status(500).json({ error: 'Lastschrift konnte nicht ausgeführt werden' });
    }
  }

  /**
   * POST /api/platform/developer/sepa/batch-collect
   */
  async batchCollect(req: Request, res: Response) {
    try {
      // Alle aktiven Subscriptions mit ausstehenden Zahlungen
      const pendingSubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            gte: new Date(),
            lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Nächste 3 Tage
          },
        },
        include: {
          tenant: true,
        },
      });

      // Für jede Subscription: Prüfe ob SEPA-Mandat vorhanden
      const results = [];
      for (const sub of pendingSubscriptions) {
        const mandate = await prisma.sepaMandate.findFirst({
          where: { tenantId: sub.tenantId, status: 'ACTIVE' },
        });

        if (mandate) {
          results.push({
            tenantId: sub.tenantId,
            tenantName: sub.tenant.companyName,
            amount: Number(sub.monthlyRevenue),
            mandateRef: mandate.mandateRef,
            status: 'scheduled',
          });
        } else {
          results.push({
            tenantId: sub.tenantId,
            tenantName: sub.tenant.companyName,
            amount: Number(sub.monthlyRevenue),
            status: 'no_mandate',
          });
        }
      }

      const scheduled = results.filter(r => r.status === 'scheduled').length;
      const noMandate = results.filter(r => r.status === 'no_mandate').length;

      res.json({
        success: true,
        data: {
          total: results.length,
          scheduled,
          noMandate,
          results,
        },
        message: `${scheduled} Lastschriften geplant, ${noMandate} ohne Mandat`,
      });
    } catch (error) {
      logger.error('Batch Collect Error:', error);
      res.status(500).json({ error: 'Sammellastschrift fehlgeschlagen' });
    }
  }
}

export const bankController = new BankController();
