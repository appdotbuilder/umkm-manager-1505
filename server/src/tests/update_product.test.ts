import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Create a test product first
const createTestProduct = async (): Promise<number> => {
  const testProduct: CreateProductInput = {
    name: 'Original Product',
    description: 'Original description',
    price: 25.50,
    stock_quantity: 100,
    is_service: false,
    low_stock_threshold: 10
  };

  const result = await db.insert(productsTable)
    .values({
      name: testProduct.name,
      description: testProduct.description,
      price: testProduct.price.toString(),
      stock_quantity: testProduct.stock_quantity,
      is_service: testProduct.is_service,
      low_stock_threshold: testProduct.low_stock_threshold
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all product fields', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Updated Product',
      description: 'Updated description',
      price: 35.99,
      stock_quantity: 150,
      is_service: true,
      low_stock_threshold: 20
    };

    const result = await updateProduct(updateInput);

    // Verify all fields are updated
    expect(result.id).toEqual(productId);
    expect(result.name).toEqual('Updated Product');
    expect(result.description).toEqual('Updated description');
    expect(result.price).toEqual(35.99);
    expect(typeof result.price).toBe('number');
    expect(result.stock_quantity).toEqual(150);
    expect(result.is_service).toBe(true);
    expect(result.low_stock_threshold).toEqual(20);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields (partial update)', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Partially Updated',
      price: 45.00
    };

    const result = await updateProduct(updateInput);

    // Verify only specified fields are updated
    expect(result.name).toEqual('Partially Updated');
    expect(result.price).toEqual(45.00);
    // Original values should remain
    expect(result.description).toEqual('Original description');
    expect(result.stock_quantity).toEqual(100);
    expect(result.is_service).toBe(false);
    expect(result.low_stock_threshold).toEqual(10);
  });

  it('should save updated product to database', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Database Updated Product',
      price: 55.75
    };

    await updateProduct(updateInput);

    // Query database directly to verify changes
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Updated Product');
    expect(parseFloat(products[0].price)).toEqual(55.75);
    expect(products[0].description).toEqual('Original description'); // Unchanged
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null values for nullable fields', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      description: null,
      stock_quantity: null,
      low_stock_threshold: null
    };

    const result = await updateProduct(updateInput);

    expect(result.description).toBeNull();
    expect(result.stock_quantity).toBeNull();
    expect(result.low_stock_threshold).toBeNull();
    // Name and price should remain unchanged
    expect(result.name).toEqual('Original Product');
    expect(result.price).toEqual(25.50);
  });

  it('should update service flag correctly', async () => {
    const productId = await createTestProduct();

    // Convert product to service
    const updateInput: UpdateProductInput = {
      id: productId,
      is_service: true,
      stock_quantity: null // Services typically don't have stock
    };

    const result = await updateProduct(updateInput);

    expect(result.is_service).toBe(true);
    expect(result.stock_quantity).toBeNull();
  });

  it('should update timestamps correctly', async () => {
    const productId = await createTestProduct();

    // Get original timestamps
    const originalProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    const originalUpdatedAt = originalProduct[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Timestamp Test'
    };

    const result = await updateProduct(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999, // Non-existent ID
      name: 'This should fail'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should handle price updates with proper numeric conversion', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      price: 123.456789 // Test with many decimal places
    };

    const result = await updateProduct(updateInput);

    expect(typeof result.price).toBe('number');
    // PostgreSQL numeric(10,2) rounds to 2 decimal places
    expect(result.price).toEqual(123.46);

    // Verify in database
    const dbProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(parseFloat(dbProduct[0].price)).toEqual(123.46);
  });

  it('should handle edge case with zero values', async () => {
    const productId = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: productId,
      stock_quantity: 0,
      low_stock_threshold: 0
    };

    const result = await updateProduct(updateInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.low_stock_threshold).toEqual(0);
  });
});