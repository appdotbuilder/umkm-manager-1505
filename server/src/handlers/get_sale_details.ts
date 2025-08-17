import { db } from '../db';
import { salesTable, saleItemsTable } from '../db/schema';
import { type Sale, type SaleItem } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Retrieves detailed information for a specific sale transaction.
 * Includes all items, customer information, and payment details.
 */
export async function getSaleDetails(saleId: number): Promise<{ sale: Sale; items: SaleItem[] }> {
  try {
    // Fetch the sale record
    const salesResult = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, saleId))
      .execute();

    if (salesResult.length === 0) {
      throw new Error(`Sale with id ${saleId} not found`);
    }

    // Convert numeric fields back to numbers
    const saleRecord = salesResult[0];
    const sale: Sale = {
      ...saleRecord,
      total_amount: parseFloat(saleRecord.total_amount)
    };

    // Fetch all sale items for this sale
    const saleItemsResult = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, saleId))
      .execute();

    // Convert numeric fields in sale items
    const items: SaleItem[] = saleItemsResult.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity),
      unit_price: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal)
    }));

    return { sale, items };
  } catch (error) {
    console.error('Get sale details failed:', error);
    throw error;
  }
}