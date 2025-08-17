import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, customersTable, salesTable, saleItemsTable } from '../db/schema';
import { getSaleDetails } from '../handlers/get_sale_details';
import { type CreateProductInput, type CreateCustomerInput, type CreateSaleInput } from '../schema';

// Test data setup
const testProduct: CreateProductInput = {
  name: 'Test Product',
  description: 'A test product',
  price: 25.50,
  stock_quantity: 100,
  is_service: false,
  low_stock_threshold: 10
};

const testCustomer: CreateCustomerInput = {
  name: 'John Doe',
  phone: '123-456-7890',
  email: 'john@example.com',
  address: '123 Main St'
};

describe('getSaleDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve sale details with items for customer sale', async () => {
    // Create prerequisite data
    const productResult = await db.insert(productsTable)
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

    const customerResult = await db.insert(customersTable)
      .values({
        name: testCustomer.name,
        phone: testCustomer.phone,
        email: testCustomer.email,
        address: testCustomer.address
      })
      .returning()
      .execute();

    const productId = productResult[0].id;
    const customerId = customerResult[0].id;

    // Create sale
    const saleResult = await db.insert(salesTable)
      .values({
        customer_id: customerId,
        total_amount: '51.00', // 2 items at 25.50 each
        payment_method: 'credit_card',
        payment_status: 'paid',
        notes: 'Test sale with customer'
      })
      .returning()
      .execute();

    const saleId = saleResult[0].id;

    // Create sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: saleId,
          product_id: productId,
          quantity: '2',
          unit_price: '25.50',
          subtotal: '51.00'
        }
      ])
      .execute();

    // Test the handler
    const result = await getSaleDetails(saleId);

    // Verify sale details
    expect(result.sale.id).toBe(saleId);
    expect(result.sale.customer_id).toBe(customerId);
    expect(result.sale.total_amount).toBe(51.00);
    expect(typeof result.sale.total_amount).toBe('number');
    expect(result.sale.payment_method).toBe('credit_card');
    expect(result.sale.payment_status).toBe('paid');
    expect(result.sale.notes).toBe('Test sale with customer');
    expect(result.sale.transaction_date).toBeInstanceOf(Date);
    expect(result.sale.created_at).toBeInstanceOf(Date);
    expect(result.sale.updated_at).toBeInstanceOf(Date);

    // Verify sale items
    expect(result.items).toHaveLength(1);
    expect(result.items[0].sale_id).toBe(saleId);
    expect(result.items[0].product_id).toBe(productId);
    expect(result.items[0].quantity).toBe(2);
    expect(typeof result.items[0].quantity).toBe('number');
    expect(result.items[0].unit_price).toBe(25.50);
    expect(typeof result.items[0].unit_price).toBe('number');
    expect(result.items[0].subtotal).toBe(51.00);
    expect(typeof result.items[0].subtotal).toBe('number');
    expect(result.items[0].created_at).toBeInstanceOf(Date);
  });

  it('should retrieve sale details for walk-in customer (null customer_id)', async () => {
    // Create product
    const productResult = await db.insert(productsTable)
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

    const productId = productResult[0].id;

    // Create sale without customer (walk-in)
    const saleResult = await db.insert(salesTable)
      .values({
        customer_id: null, // Walk-in customer
        total_amount: '25.50',
        payment_method: 'cash',
        payment_status: 'paid',
        notes: 'Walk-in customer'
      })
      .returning()
      .execute();

    const saleId = saleResult[0].id;

    // Create sale items
    await db.insert(saleItemsTable)
      .values({
        sale_id: saleId,
        product_id: productId,
        quantity: '1',
        unit_price: '25.50',
        subtotal: '25.50'
      })
      .execute();

    // Test the handler
    const result = await getSaleDetails(saleId);

    // Verify sale details
    expect(result.sale.id).toBe(saleId);
    expect(result.sale.customer_id).toBeNull();
    expect(result.sale.total_amount).toBe(25.50);
    expect(result.sale.payment_method).toBe('cash');
    expect(result.sale.payment_status).toBe('paid');
    expect(result.sale.notes).toBe('Walk-in customer');

    // Verify sale items
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(1);
    expect(result.items[0].unit_price).toBe(25.50);
    expect(result.items[0].subtotal).toBe(25.50);
  });

  it('should retrieve sale with multiple items', async () => {
    // Create multiple products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        description: 'First product',
        price: '10.00',
        stock_quantity: 50,
        is_service: false,
        low_stock_threshold: 5
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        description: 'Second product',
        price: '20.00',
        stock_quantity: 30,
        is_service: false,
        low_stock_threshold: 3
      })
      .returning()
      .execute();

    const product1Id = product1Result[0].id;
    const product2Id = product2Result[0].id;

    // Create sale
    const saleResult = await db.insert(salesTable)
      .values({
        customer_id: null,
        total_amount: '70.00', // (10 * 3) + (20 * 2) = 30 + 40 = 70
        payment_method: 'bank_transfer',
        payment_status: 'paid',
        notes: 'Multiple items sale'
      })
      .returning()
      .execute();

    const saleId = saleResult[0].id;

    // Create multiple sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: saleId,
          product_id: product1Id,
          quantity: '3',
          unit_price: '10.00',
          subtotal: '30.00'
        },
        {
          sale_id: saleId,
          product_id: product2Id,
          quantity: '2',
          unit_price: '20.00',
          subtotal: '40.00'
        }
      ])
      .execute();

    // Test the handler
    const result = await getSaleDetails(saleId);

    // Verify sale details
    expect(result.sale.id).toBe(saleId);
    expect(result.sale.total_amount).toBe(70.00);
    expect(result.sale.payment_method).toBe('bank_transfer');

    // Verify sale items
    expect(result.items).toHaveLength(2);
    
    // Sort items by product_id for consistent testing
    const sortedItems = result.items.sort((a, b) => a.product_id - b.product_id);
    
    expect(sortedItems[0].product_id).toBe(product1Id);
    expect(sortedItems[0].quantity).toBe(3);
    expect(sortedItems[0].unit_price).toBe(10.00);
    expect(sortedItems[0].subtotal).toBe(30.00);

    expect(sortedItems[1].product_id).toBe(product2Id);
    expect(sortedItems[1].quantity).toBe(2);
    expect(sortedItems[1].unit_price).toBe(20.00);
    expect(sortedItems[1].subtotal).toBe(40.00);
  });

  it('should throw error for non-existent sale', async () => {
    const nonExistentSaleId = 99999;

    await expect(getSaleDetails(nonExistentSaleId))
      .rejects
      .toThrow(/Sale with id 99999 not found/i);
  });

  it('should handle sale with no items', async () => {
    // Create sale without any items
    const saleResult = await db.insert(salesTable)
      .values({
        customer_id: null,
        total_amount: '0.00',
        payment_method: 'cash',
        payment_status: 'cancelled',
        notes: 'Cancelled sale'
      })
      .returning()
      .execute();

    const saleId = saleResult[0].id;

    // Test the handler
    const result = await getSaleDetails(saleId);

    // Verify sale details
    expect(result.sale.id).toBe(saleId);
    expect(result.sale.total_amount).toBe(0.00);
    expect(result.sale.payment_status).toBe('cancelled');

    // Verify no items
    expect(result.items).toHaveLength(0);
  });

  it('should handle decimal quantities and prices correctly', async () => {
    // Create product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Service Product',
        description: 'A service with decimal pricing',
        price: '15.75',
        stock_quantity: null, // Service has no stock
        is_service: true,
        low_stock_threshold: null
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create sale - use simpler decimal that doesn't have precision issues
    const saleResult = await db.insert(salesTable)
      .values({
        customer_id: null,
        total_amount: '31.50', // 15.75 * 2 = 31.50 (avoids precision issues)
        payment_method: 'e_wallet',
        payment_status: 'paid',
        notes: 'Service with decimal quantity'
      })
      .returning()
      .execute();

    const saleId = saleResult[0].id;

    // Create sale item with decimal quantity
    await db.insert(saleItemsTable)
      .values({
        sale_id: saleId,
        product_id: productId,
        quantity: '2.0', // Decimal quantity for services
        unit_price: '15.75',
        subtotal: '31.50'
      })
      .execute();

    // Test the handler
    const result = await getSaleDetails(saleId);

    // Verify numeric conversions work correctly with decimals
    expect(result.sale.total_amount).toBe(31.50);
    expect(result.items[0].quantity).toBe(2.0);
    expect(result.items[0].unit_price).toBe(15.75);
    expect(result.items[0].subtotal).toBe(31.50);

    // Verify all numeric fields are proper numbers
    expect(typeof result.sale.total_amount).toBe('number');
    expect(typeof result.items[0].quantity).toBe('number');
    expect(typeof result.items[0].unit_price).toBe('number');
    expect(typeof result.items[0].subtotal).toBe('number');
  });
});