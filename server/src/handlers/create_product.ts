import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';

/**
 * Creates a new product or service in the system.
 * Handles both physical products (with stock) and services (without stock).
 * Sets up low stock threshold for physical products if specified.
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    // For services, force stock_quantity and low_stock_threshold to null
    const insertData = {
      name: input.name,
      description: input.description,
      price: input.price.toString(), // Convert number to string for numeric column
      stock_quantity: input.is_service ? null : input.stock_quantity,
      is_service: input.is_service,
      low_stock_threshold: input.is_service ? null : input.low_stock_threshold
    };

    // Insert product record
    const result = await db.insert(productsTable)
      .values(insertData)
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
}