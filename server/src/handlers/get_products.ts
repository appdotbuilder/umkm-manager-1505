import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';

/**
 * Retrieves all products and services from the system.
 * Returns both physical products and services with their current stock levels.
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Get products failed:', error);
    throw error;
  }
}