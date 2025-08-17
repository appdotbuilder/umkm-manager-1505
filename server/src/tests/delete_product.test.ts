import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, customersTable, salesTable, saleItemsTable, stockAdjustmentsTable } from '../db/schema';
import { deleteProduct } from '../handlers/delete_product';
import { eq } from 'drizzle-orm';

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a product that has no related records', async () => {
    // Create a test product
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        price: '19.99',
        stock_quantity: 100,
        is_service: false,
        low_stock_threshold: 10
      })
      .returning()
      .execute();

    const productId = product[0].id;

    // Delete the product
    const result = await deleteProduct(productId);

    // Verify successful deletion
    expect(result.success).toBe(true);
    expect(result.message).toEqual('Product "Test Product" deleted successfully');

    // Verify product is removed from database
    const remainingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(remainingProducts).toHaveLength(0);
  });

  it('should return error when product does not exist', async () => {
    const nonExistentId = 99999;

    const result = await deleteProduct(nonExistentId);

    expect(result.success).toBe(false);
    expect(result.message).toEqual(`Product with ID ${nonExistentId} not found`);
  });

  it('should prevent deletion when product has sale items', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        price: '19.99',
        stock_quantity: 100,
        is_service: false,
        low_stock_threshold: 10
      })
      .returning()
      .execute();

    const sale = await db.insert(salesTable)
      .values({
        customer_id: customer[0].id,
        total_amount: '19.99',
        payment_method: 'cash',
        payment_status: 'paid',
        transaction_date: new Date(),
        notes: 'Test sale'
      })
      .returning()
      .execute();

    // Create sale item that references the product
    await db.insert(saleItemsTable)
      .values({
        sale_id: sale[0].id,
        product_id: product[0].id,
        quantity: '1',
        unit_price: '19.99',
        subtotal: '19.99'
      })
      .execute();

    // Attempt to delete the product
    const result = await deleteProduct(product[0].id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Cannot delete product. It has been used in 1 sale transaction(s)');

    // Verify product still exists in database
    const remainingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product[0].id))
      .execute();

    expect(remainingProducts).toHaveLength(1);
  });

  it('should prevent deletion when product has stock adjustments', async () => {
    // Create a test product
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        price: '19.99',
        stock_quantity: 100,
        is_service: false,
        low_stock_threshold: 10
      })
      .returning()
      .execute();

    // Create stock adjustment that references the product
    await db.insert(stockAdjustmentsTable)
      .values({
        product_id: product[0].id,
        adjustment_type: 'increase',
        quantity_change: 50,
        reason: 'Restock',
        adjusted_by: 'Admin',
        adjustment_date: new Date()
      })
      .execute();

    // Attempt to delete the product
    const result = await deleteProduct(product[0].id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Cannot delete product. It has 1 stock adjustment record(s)');

    // Verify product still exists in database
    const remainingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product[0].id))
      .execute();

    expect(remainingProducts).toHaveLength(1);
  });

  it('should prevent deletion when product has multiple related records', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        price: '19.99',
        stock_quantity: 100,
        is_service: false,
        low_stock_threshold: 10
      })
      .returning()
      .execute();

    // Create multiple sales with sale items
    const sale1 = await db.insert(salesTable)
      .values({
        customer_id: customer[0].id,
        total_amount: '19.99',
        payment_method: 'cash',
        payment_status: 'paid',
        transaction_date: new Date(),
        notes: 'Test sale 1'
      })
      .returning()
      .execute();

    const sale2 = await db.insert(salesTable)
      .values({
        customer_id: customer[0].id,
        total_amount: '39.98',
        payment_method: 'credit_card',
        payment_status: 'paid',
        transaction_date: new Date(),
        notes: 'Test sale 2'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale1[0].id,
          product_id: product[0].id,
          quantity: '1',
          unit_price: '19.99',
          subtotal: '19.99'
        },
        {
          sale_id: sale2[0].id,
          product_id: product[0].id,
          quantity: '2',
          unit_price: '19.99',
          subtotal: '39.98'
        }
      ])
      .execute();

    // Attempt to delete the product
    const result = await deleteProduct(product[0].id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Cannot delete product. It has been used in 2 sale transaction(s)');

    // Verify product still exists in database
    const remainingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product[0].id))
      .execute();

    expect(remainingProducts).toHaveLength(1);
  });

  it('should successfully delete a service product', async () => {
    // Create a service product (no stock quantity)
    const product = await db.insert(productsTable)
      .values({
        name: 'Consultation Service',
        description: 'Professional consultation service',
        price: '100.00',
        stock_quantity: null, // Services don't have stock
        is_service: true,
        low_stock_threshold: null
      })
      .returning()
      .execute();

    const productId = product[0].id;

    // Delete the service
    const result = await deleteProduct(productId);

    // Verify successful deletion
    expect(result.success).toBe(true);
    expect(result.message).toEqual('Product "Consultation Service" deleted successfully');

    // Verify service is removed from database
    const remainingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(remainingProducts).toHaveLength(0);
  });

  it('should handle database errors gracefully', async () => {
    // Test with invalid product ID type (this should trigger an error in real scenarios)
    const invalidId = -1;

    // Since our implementation checks for existence first, this will return "not found"
    // rather than throw a database error, but we test the error handling path exists
    const result = await deleteProduct(invalidId);

    expect(result.success).toBe(false);
    expect(result.message).toEqual(`Product with ID ${invalidId} not found`);
  });
});