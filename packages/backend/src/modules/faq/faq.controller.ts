import { Request, Response } from 'express';
import pool from '../../db/pool';

// GET /faq - Obtener todas las preguntas frecuentes (publico)
export async function getAllFAQs(req: Request, res: Response): Promise<void> {
  try {
    const { category, search } = req.query;

    let query = `
      SELECT id, category, question, answer, display_order, created_at
      FROM faqs
      WHERE is_active = true
    `;
    const params: any[] = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (question ILIKE $${params.length} OR answer ILIKE $${params.length})`;
    }

    query += ` ORDER BY category, display_order ASC`;

    const result = await pool.query(query, params);

    // Agrupar por categoria
    const faqsByCategory: Record<string, any[]> = {};
    result.rows.forEach(faq => {
      if (!faqsByCategory[faq.category]) {
        faqsByCategory[faq.category] = [];
      }
      faqsByCategory[faq.category].push(faq);
    });

    res.json({
      faqs: result.rows,
      byCategory: faqsByCategory,
    });

  } catch (error) {
    console.error('Error al obtener FAQs:', error);
    res.status(500).json({ error: 'Error al obtener FAQs' });
  }
}

// GET /faq/categories - Obtener categorias disponibles
export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category, COUNT(*) as count
       FROM faqs
       WHERE is_active = true
       GROUP BY category
       ORDER BY category`
    );

    res.json({ categories: result.rows });

  } catch (error) {
    console.error('Error al obtener categorias:', error);
    res.status(500).json({ error: 'Error al obtener categorias' });
  }
}

// POST /admin/faq - Crear nueva FAQ (admin)
export async function createFAQ(req: Request, res: Response): Promise<void> {
  try {
    const userRole = (req as any).user.role;

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Solo administradores pueden crear FAQs' });
      return;
    }

    const { category, question, answer, displayOrder } = req.body;

    if (!category || !question || !answer) {
      res.status(400).json({ error: 'Categoria, pregunta y respuesta son requeridos' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO faqs (category, question, answer, display_order, is_active, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       RETURNING *`,
      [category, question, answer, displayOrder || 0]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error al crear FAQ:', error);
    res.status(500).json({ error: 'Error al crear FAQ' });
  }
}

// PUT /admin/faq/:id - Actualizar FAQ (admin)
export async function updateFAQ(req: Request, res: Response): Promise<void> {
  try {
    const userRole = (req as any).user.role;

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Solo administradores pueden actualizar FAQs' });
      return;
    }

    const { id } = req.params;
    const { category, question, answer, displayOrder, isActive } = req.body;

    const result = await pool.query(
      `UPDATE faqs
       SET category = COALESCE($1, category),
           question = COALESCE($2, question),
           answer = COALESCE($3, answer),
           display_order = COALESCE($4, display_order),
           is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING *`,
      [category, question, answer, displayOrder, isActive, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'FAQ no encontrada' });
      return;
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al actualizar FAQ:', error);
    res.status(500).json({ error: 'Error al actualizar FAQ' });
  }
}

// DELETE /admin/faq/:id - Eliminar FAQ (admin)
export async function deleteFAQ(req: Request, res: Response): Promise<void> {
  try {
    const userRole = (req as any).user.role;

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Solo administradores pueden eliminar FAQs' });
      return;
    }

    const { id } = req.params;

    // Soft delete - marcar como inactiva
    const result = await pool.query(
      `UPDATE faqs SET is_active = false WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'FAQ no encontrada' });
      return;
    }

    res.json({ message: 'FAQ eliminada correctamente' });

  } catch (error) {
    console.error('Error al eliminar FAQ:', error);
    res.status(500).json({ error: 'Error al eliminar FAQ' });
  }
}
