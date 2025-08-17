import { db } from '../db';
import { productsTable, saleItemsTable, stockAdjustmentsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Deletes a product or service from the system.
 * Should check for existing transactions before deletion to maintain data integrity.
 */
export async function deleteProduct(productId: number): Promise<{ success: boolean; message: string }> {
  try {
    // First, check if the product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    if (existingProduct.length === 0) {
      return {
        success: false,
        message: `Product with ID ${productId} not found`
      };
    }

    // Check if product has been used in any sale items
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.product_id, productId))
      .execute();

    if (saleItems.length > 0) {
      return {
        success: false,
        message: `Cannot delete product. It has been used in ${saleItems.length} sale transaction(s)`
      };
    }

    // Check if product has any stock adjustments
    const stockAdjustments = await db.select()
      .from(stockAdjustmentsTable)
      .where(eq(stockAdjustmentsTable.product_id, productId))
      .execute();

    if (stockAdjustments.length > 0) {
      return {
        success: false,
        message: `Cannot delete product. It has ${stockAdjustments.length} stock adjustment record(s)`
      };
    }

    // If no related records exist, delete the product
    const deletedProducts = await db.delete(productsTable)
      .where(eq(productsTable.id, productId))
      .returning()
      .execute();

    if (deletedProducts.length > 0) {
      return {
        success: true,
        message: `Product "${deletedProducts[0].name}" deleted successfully`
      };
    } else {
      return {
        success: false,
        message: `Failed to delete product with ID ${productId}`
      };
    }
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
}