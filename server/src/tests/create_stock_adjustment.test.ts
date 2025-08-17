import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, stockAdjustmentsTable } from '../db/schema';
import { type CreateStockAdjustmentInput } from '../schema';
import { createStockAdjustment } from '../handlers/create_stock_adjustment';
import { eq } from 'drizzle-orm';

describe('createStockAdjustment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create a test product first
  const createTestProduct = async (isService = false, stockQuantity: number | null = 100) => {
    const result = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '29.99',
        stock_quantity: stockQuantity,
        is_service: isService,
        low_stock_threshold: 10
      })
      .returning()
      .execute();
    
    return result[0];
  };

  const testInput: CreateStockAdjustmentInput = {
    product_id: 1, // Will be set dynamically in tests
    adjustment_type: 'increase',
    quantity_change: 50,
    reason: 'Restocking inventory',
    adjusted_by: 'admin',
    adjustment_date: new Date()
  };

  describe('increase adjustments', () => {
    it('should increase stock quantity correctly', async () => {
      const product = await createTestProduct(false, 100);
      
      const result = await createStockAdjustment({
        ...testInput,
        product_id: product.id,
        adjustment_type: 'increase',
        quantity_change: 50
      });

      // Check adjustment record
      expect(result.product_id).toEqual(product.id);
      expect(result.adjustment_type).toEqual('increase');
      expect(result.quantity_change).toEqual(50);
      expect(result.reason).toEqual('Restocking inventory');
      expect(result.adjusted_by).toEqual('admin');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);

      // Verify product stock was updated
      const updatedProducts = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, product.id))
        .execute();

      expect(updatedProducts[0].stock_quantity).toEqual(150);
      expect(updatedProducts[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('decrease adjustments', () => {
    it('should decrease stock quantity correctly', async () => {
      const product = await createTestProduct(false, 100);
      
      const result = await createStockAdjustment({
        ...testInput,
        product_id: product.id,
        adjustment_type: 'decrease',
        quantity_change: 30
      });

      // Check adjustment record
      expect(result.adjustment_type).toEqual('decrease');
      expect(result.quantity_change).toEqual(30);

      // Verify product stock was updated
      const updatedProducts = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, product.id))
        .execute();

      expect(updatedProducts[0].stock_quantity).toEqual(70);
    });

    it('should prevent negative stock on decrease', async () => {
      const product = await createTestProduct(false, 50);

      await expect(
        createStockAdjustment({
          ...testInput,
          product_id: product.id,
          adjustment_type: 'decrease',
          quantity_change: 60
        })
      ).rejects.toThrow(/negative stock/i);

      // Verify product stock was not changed
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, product.id))
        .execute();

      expect(products[0].stock_quantity).toEqual(50);
    });
  });

  describe('correction adjustments', () => {
    it('should set stock to exact quantity', async () => {
      const product = await createTestProduct(false, 100);
      
      const result = await createStockAdjustment({
        ...testInput,
        product_id: product.id,
        adjustment_type: 'correction',
        quantity_change: 75
      });

      // Check adjustment record
      expect(result.adjustment_type).toEqual('correction');
      expect(result.quantity_change).toEqual(75);

      // Verify product stock was set to exact quantity
      const updatedProducts = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, product.id))
        .execute();

      expect(updatedProducts[0].stock_quantity).toEqual(75);
    });

    it('should prevent negative stock on correction', async () => {
      const product = await createTestProduct(false, 100);

      await expect(
        createStockAdjustment({
          ...testInput,
          product_id: product.id,
          adjustment_type: 'correction',
          quantity_change: -10
        })
      ).rejects.toThrow(/negative stock/i);
    });
  });

  describe('validation', () => {
    it('should reject adjustments for services', async () => {
      const serviceProduct = await createTestProduct(true, null);

      await expect(
        createStockAdjustment({
          ...testInput,
          product_id: serviceProduct.id
        })
      ).rejects.toThrow(/services/i);
    });

    it('should reject adjustments for non-existent products', async () => {
      await expect(
        createStockAdjustment({
          ...testInput,
          product_id: 999999
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  it('should save adjustment record to database', async () => {
    const product = await createTestProduct(false, 100);
    
    const result = await createStockAdjustment({
      ...testInput,
      product_id: product.id,
      reason: 'Inventory audit correction'
    });

    // Query the adjustment record from database
    const adjustments = await db.select()
      .from(stockAdjustmentsTable)
      .where(eq(stockAdjustmentsTable.id, result.id))
      .execute();

    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].product_id).toEqual(product.id);
    expect(adjustments[0].adjustment_type).toEqual('increase');
    expect(adjustments[0].quantity_change).toEqual(50);
    expect(adjustments[0].reason).toEqual('Inventory audit correction');
    expect(adjustments[0].adjusted_by).toEqual('admin');
    expect(adjustments[0].created_at).toBeInstanceOf(Date);
    expect(adjustments[0].adjustment_date).toBeInstanceOf(Date);
  });

  it('should handle zero stock products correctly', async () => {
    const product = await createTestProduct(false, 0);
    
    const result = await createStockAdjustment({
      ...testInput,
      product_id: product.id,
      adjustment_type: 'increase',
      quantity_change: 100
    });

    // Verify stock was increased from 0
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    expect(updatedProducts[0].stock_quantity).toEqual(100);
    expect(result.adjustment_type).toEqual('increase');
  });
});