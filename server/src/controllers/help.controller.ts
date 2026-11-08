import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Help System Controller
 * Hilfe-Artikel und Suche
 */
export class HelpController {
  /**
   * GET /api/help/articles
   */
  async listArticles(req: Request, res: Response) {
    try {
      const { category, subcategory, search, tags } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const where: any = { isPublished: true };

      if (category) where.category = category;
      if (subcategory) where.subcategory = subcategory;
      if (tags) {
        const tagList = (tags as string).split(',');
        where.tags = { hasSome: tagList };
      }
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { content: { contains: search as string, mode: 'insensitive' } },
          { tags: { has: search as string } },
        ];
      }

      const [articles, total] = await Promise.all([
        prisma.helpArticle.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { sortOrder: 'asc' },
        }),
        prisma.helpArticle.count({ where }),
      ]);

      // Search loggen
      if (search) {
        await prisma.helpSearch.create({
          data: {
            query: search as string,
            resultCount: total,
            userId: (req as any).user?.id,
            tenantId: (req as any).tenantId,
          },
        });
      }

      res.json({
        success: true,
        data: articles,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (error) {
      logger.error('List Help Articles Error:', error);
      res.status(500).json({ error: 'Artikel konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/help/articles/:slug
   */
  async getArticle(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const article = await prisma.helpArticle.findUnique({
        where: { slug },
      });

      if (!article) {
        return res.status(404).json({ error: 'Artikel nicht gefunden' });
      }

      // View count erhöhen
      await prisma.helpArticle.update({
        where: { slug },
        data: { viewCount: { increment: 1 } },
      });

      res.json({ success: true, data: article });
    } catch (error) {
      logger.error('Get Help Article Error:', error);
      res.status(500).json({ error: 'Artikel konnte nicht geladen werden' });
    }
  }

  /**
   * GET /api/help/categories
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.helpArticle.groupBy({
        by: ['category'],
        where: { isPublished: true },
        _count: { category: true },
      });

      res.json({
        success: true,
        data: categories.map((c: any) => ({
          name: c.category,
          count: c._count.category,
        })),
      });
    } catch (error) {
      logger.error('Get Categories Error:', error);
      res.status(500).json({ error: 'Kategorien konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/help/popular
   */
  async getPopularArticles(req: Request, res: Response) {
    try {
      const articles = await prisma.helpArticle.findMany({
        where: { isPublished: true },
        orderBy: { viewCount: 'desc' },
        take: 10,
      });

      res.json({ success: true, data: articles });
    } catch (error) {
      logger.error('Get Popular Articles Error:', error);
      res.status(500).json({ error: 'Artikel konnten nicht geladen werden' });
    }
  }

  /**
   * POST /api/help/articles (Admin)
   */
  async createArticle(req: Request, res: Response) {
    try {
      const { category, subcategory, title, content, tags } = req.body;

      if (!category || !title || !content) {
        return res.status(400).json({ error: 'Kategorie, Titel und Inhalt sind erforderlich' });
      }

      // Slug generieren
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Date.now().toString(36);

      const article = await prisma.helpArticle.create({
        data: {
          category,
          subcategory,
          title,
          slug,
          content,
          tags: tags || [],
        },
      });

      res.json({
        success: true,
        data: article,
        message: 'Artikel erfolgreich erstellt',
      });
    } catch (error) {
      logger.error('Create Help Article Error:', error);
      res.status(500).json({ error: 'Artikel konnte nicht erstellt werden' });
    }
  }

  /**
   * PUT /api/help/articles/:id (Admin)
   */
  async updateArticle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const article = await prisma.helpArticle.update({
        where: { id },
        data: updates,
      });

      res.json({
        success: true,
        data: article,
        message: 'Artikel erfolgreich aktualisiert',
      });
    } catch (error) {
      logger.error('Update Help Article Error:', error);
      res.status(500).json({ error: 'Artikel konnte nicht aktualisiert werden' });
    }
  }

  /**
   * DELETE /api/help/articles/:id (Admin)
   */
  async deleteArticle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.helpArticle.delete({ where: { id } });

      res.json({ success: true, message: 'Artikel gelöscht' });
    } catch (error) {
      logger.error('Delete Help Article Error:', error);
      res.status(500).json({ error: 'Artikel konnte nicht gelöscht werden' });
    }
  }
}

export const helpController = new HelpController();
