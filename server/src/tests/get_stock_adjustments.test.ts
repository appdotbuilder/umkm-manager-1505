import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockAdjustmentsTable, productsTable } from '../db/schema';
import { getStockAdjustments } from '../handlers/get_stock_adjustments';
import { type CreateProductInput, type CreateStockAdjustmentInput } from '../schema';

describe('getStockAdjustments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no adjustments exist', async () => {
    const result = await getStockAdjustments();
    expect(result).toEqual([]);
  });

  it('should retrieve all stock adjustments with correct data', async () => {
    // Create test product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test Description',
        price: '29.99',
        stock_quantity: 100,
        is_service: false,
        low_stock_threshold: 10
      })
      .returning()
      .execute();
    
    const productId = productResult[0].id;

    // Create test stock adjustments
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          product_id: productId,
          adjustment_type: 'increase',
          quantity_change: 50,
          reason: 'New stock received',
          adjusted_by: 'Admin',
          adjustment_date: new Date('2024-01-15')
        },
        {
          product_id: productId,
          adjustment_type: 'decrease',
          quantity_change: -20,
          reason: 'Damaged goods',
          adjusted_by: 'Manager',
          adjustment_date: new Date('2024-01-16')
        }
      ])
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(2);
    
    // Check first adjustment (most recent due to ordering)
    expect(result[0].adjustment_type).toEqual('decrease');
    expect(result[0].quantity_change).toEqual(-20);
    expect(result[0].reason).toEqual('Damaged goods');
    expect(result[0].adjusted_by).toEqual('Manager');
    expect(result[0].product_id).toEqual(productId);
    expect(result[0].id).toBeDefined();
    expect(result[0].adjustment_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Check second adjustment
    expect(result[1].adjustment_type).toEqual('increase');
    expect(result[1].quantity_change).toEqual(50);
    expect(result[1].reason).toEqual('New stock received');
    expect(result[1].adjusted_by).toEqual('Admin');
    expect(result[1].product_id).toEqual(productId);
  });

  it('should return adjustments ordered by adjustment date (most recent first)', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test Description',
        price: '19.99',
        stock_quantity: 50,
        is_service: false,
        low_stock_threshold: 5
      })
      .returning()
      .execute();
    
    const productId = productResult[0].id;

    // Create adjustments with different dates
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          product_id: productId,
          adjustment_type: 'increase',
          quantity_change: 10,
          reason: 'Old adjustment',
          adjusted_by: 'User1',
          adjustment_date: new Date('2024-01-01')
        },
        {
          product_id: productId,
          adjustment_type: 'correction',
          quantity_change: 5,
          reason: 'Recent adjustment',
          adjusted_by: 'User2',
          adjustment_date: new Date('2024-01-20')
        },
        {
          product_id: productId,
          adjustment_type: 'decrease',
          quantity_change: -3,
          reason: 'Middle adjustment',
          adjusted_by: 'User3',
          adjustment_date: new Date('2024-01-10')
        }
      ])
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(3);
    
    // Verify ordering (most recent first)
    expect(result[0].reason).toEqual('Recent adjustment');
    expect(result[0].adjustment_date).toEqual(new Date('2024-01-20'));
    
    expect(result[1].reason).toEqual('Middle adjustment');
    expect(result[1].adjustment_date).toEqual(new Date('2024-01-10'));
    
    expect(result[2].reason).toEqual('Old adjustment');
    expect(result[2].adjustment_date).toEqual(new Date('2024-01-01'));
  });

  it('should handle multiple products correctly', async () => {
    // Create two test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product A',
        description: 'First product',
        price: '15.99',
        stock_quantity: 30,
        is_service: false,
        low_stock_threshold: 5
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product B',
        description: 'Second product',
        price: '25.99',
        stock_quantity: 20,
        is_service: false,
        low_stock_threshold: 3
      })
      .returning()
      .execute();
    
    const product1Id = product1Result[0].id;
    const product2Id = product2Result[0].id;

    // Create adjustments for both products
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          product_id: product1Id,
          adjustment_type: 'increase',
          quantity_change: 15,
          reason: 'Restock Product A',
          adjusted_by: 'Staff1',
          adjustment_date: new Date('2024-01-15')
        },
        {
          product_id: product2Id,
          adjustment_type: 'decrease',
          quantity_change: -5,
          reason: 'Product B damage',
          adjusted_by: 'Staff2',
          adjustment_date: new Date('2024-01-16')
        }
      ])
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(2);
    
    // Verify both products are represented
    const product1Adjustment = result.find(adj => adj.product_id === product1Id);
    const product2Adjustment = result.find(adj => adj.product_id === product2Id);
    
    expect(product1Adjustment).toBeDefined();
    expect(product1Adjustment?.reason).toEqual('Restock Product A');
    expect(product1Adjustment?.quantity_change).toEqual(15);
    
    expect(product2Adjustment).toBeDefined();
    expect(product2Adjustment?.reason).toEqual('Product B damage');
    expect(product2Adjustment?.quantity_change).toEqual(-5);
  });

  it('should handle all adjustment types correctly', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test Description',
        price: '39.99',
        stock_quantity: 100,
        is_service: false,
        low_stock_threshold: 10
      })
      .returning()
      .execute();
    
    const productId = productResult[0].id;

    // Create adjustments with all types
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          product_id: productId,
          adjustment_type: 'increase',
          quantity_change: 25,
          reason: 'Stock increase',
          adjusted_by: 'Admin',
          adjustment_date: new Date('2024-01-01')
        },
        {
          product_id: productId,
          adjustment_type: 'decrease',
          quantity_change: -10,
          reason: 'Stock decrease',
          adjusted_by: 'Admin',
          adjustment_date: new Date('2024-01-02')
        },
        {
          product_id: productId,
          adjustment_type: 'correction',
          quantity_change: 5,
          reason: 'Stock correction',
          adjusted_by: 'Admin',
          adjustment_date: new Date('2024-01-03')
        }
      ])
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(3);
    
    // Verify all adjustment types are present
    const adjustmentTypes = result.map(adj => adj.adjustment_type);
    expect(adjustmentTypes).toContain('increase');
    expect(adjustmentTypes).toContain('decrease');
    expect(adjustmentTypes).toContain('correction');
  });

  it('should only return adjustments for existing products', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Valid Product',
        description: 'Valid product description',
        price: '12.99',
        stock_quantity: 50,
        is_service: false,
        low_stock_threshold: 5
      })
      .returning()
      .execute();
    
    const productId = productResult[0].id;

    // Create adjustment for valid product
    await db.insert(stockAdjustmentsTable)
      .values({
        product_id: productId,
        adjustment_type: 'increase',
        quantity_change: 20,
        reason: 'Valid adjustment',
        adjusted_by: 'Admin',
        adjustment_date: new Date('2024-01-15')
      })
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(1);
    expect(result[0].product_id).toEqual(productId);
    expect(result[0].reason).toEqual('Valid adjustment');
  });
})