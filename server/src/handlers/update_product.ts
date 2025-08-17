import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Updates an existing product or service in the system.
 * Allows partial updates of product information including price, stock, and thresholds.
 */
export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // First check if product exists
    const existingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProducts.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.price !== undefined) {
      updateData.price = input.price.toString(); // Convert number to string for numeric column
    }
    if (input.stock_quantity !== undefined) {
      updateData.stock_quantity = input.stock_quantity;
    }
    if (input.is_service !== undefined) {
      updateData.is_service = input.is_service;
    }
    if (input.low_stock_threshold !== undefined) {
      updateData.low_stock_threshold = input.low_stock_threshold;
    }

    // Update the product
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};