import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, customersTable, salesTable, saleItemsTable } from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { createSale } from '../handlers/create_sale';
import { eq } from 'drizzle-orm';

// Test data setup
const testCustomer = {
  name: 'Test Customer',
  phone: '123-456-7890',
  email: 'test@example.com',
  address: '123 Test St'
};

const testPhysicalProduct = {
  name: 'Physical Product',
  description: 'A physical product',
  price: '25.99',
  stock_quantity: 100,
  is_service: false,
  low_stock_threshold: 10
};

const testService = {
  name: 'Service Product',
  description: 'A service offering',
  price: '50.00',
  stock_quantity: null,
  is_service: true,
  low_stock_threshold: null
};

describe('createSale', () => {
  let customerId: number;
  let physicalProductId: number;
  let serviceProductId: number;

  beforeEach(async () => {
    await createDB();

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test products
    const physicalProductResult = await db.insert(productsTable)
      .values(testPhysicalProduct)
      .returning()
      .execute();
    physicalProductId = physicalProductResult[0].id;

    const serviceResult = await db.insert(productsTable)
      .values(testService)
      .returning()
      .execute();
    serviceProductId = serviceResult[0].id;
  });

  afterEach(resetDB);

  it('should create a sale with physical products and update stock', async () => {
    const input: CreateSaleInput = {
      customer_id: customerId,
      total_amount: 77.97,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: 'Test sale',
      items: [
        {
          product_id: physicalProductId,
          quantity: 3,
          unit_price: 25.99,
          subtotal: 77.97
        }
      ]
    };

    const result = await createSale(input);

    // Verify sale record
    expect(result.id).toBeDefined();
    expect(result.customer_id).toEqual(customerId);
    expect(result.total_amount).toEqual(77.97);
    expect(result.payment_method).toEqual('cash');
    expect(result.payment_status).toEqual('paid');
    expect(result.notes).toEqual('Test sale');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify sale was saved to database
    const savedSales = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, result.id))
      .execute();

    expect(savedSales).toHaveLength(1);
    expect(parseFloat(savedSales[0].total_amount)).toEqual(77.97);

    // Verify sale items were created
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, result.id))
      .execute();

    expect(saleItems).toHaveLength(1);
    expect(saleItems[0].product_id).toEqual(physicalProductId);
    expect(parseFloat(saleItems[0].quantity)).toEqual(3);
    expect(parseFloat(saleItems[0].unit_price)).toEqual(25.99);
    expect(parseFloat(saleItems[0].subtotal)).toEqual(77.97);

    // Verify stock was updated
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, physicalProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(97); // 100 - 3
  });

  it('should create a sale with services without affecting stock', async () => {
    const input: CreateSaleInput = {
      customer_id: customerId,
      total_amount: 100.00,
      payment_method: 'credit_card',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: null,
      items: [
        {
          product_id: serviceProductId,
          quantity: 2,
          unit_price: 50.00,
          subtotal: 100.00
        }
      ]
    };

    const result = await createSale(input);

    // Verify sale record
    expect(result.total_amount).toEqual(100.00);
    expect(result.payment_method).toEqual('credit_card');

    // Verify sale items were created
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, result.id))
      .execute();

    expect(saleItems).toHaveLength(1);
    expect(parseFloat(saleItems[0].quantity)).toEqual(2);

    // Verify service stock wasn't affected (should still be null)
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, serviceProductId))
      .execute();

    expect(product[0].stock_quantity).toBeNull();
  });

  it('should create a walk-in sale with null customer_id', async () => {
    const input: CreateSaleInput = {
      customer_id: null,
      total_amount: 25.99,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: 'Walk-in customer',
      items: [
        {
          product_id: physicalProductId,
          quantity: 1,
          unit_price: 25.99,
          subtotal: 25.99
        }
      ]
    };

    const result = await createSale(input);

    expect(result.customer_id).toBeNull();
    expect(result.total_amount).toEqual(25.99);
    expect(result.notes).toEqual('Walk-in customer');

    // Verify stock was still updated
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, physicalProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(99); // 100 - 1
  });

  it('should create a sale with multiple items', async () => {
    const input: CreateSaleInput = {
      customer_id: customerId,
      total_amount: 175.97,
      payment_method: 'bank_transfer',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: 'Multi-item sale',
      items: [
        {
          product_id: physicalProductId,
          quantity: 2,
          unit_price: 25.99,
          subtotal: 51.98
        },
        {
          product_id: serviceProductId,
          quantity: 1,
          unit_price: 50.00,
          subtotal: 50.00
        },
        {
          product_id: physicalProductId,
          quantity: 3,
          unit_price: 24.66,
          subtotal: 73.99
        }
      ]
    };

    const result = await createSale(input);

    expect(result.total_amount).toEqual(175.97);

    // Verify all sale items were created
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, result.id))
      .execute();

    expect(saleItems).toHaveLength(3);

    // Verify stock was updated correctly (2 + 3 = 5 units of physical product)
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, physicalProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(95); // 100 - 5
  });

  it('should throw error for invalid customer_id', async () => {
    const input: CreateSaleInput = {
      customer_id: 99999,
      total_amount: 25.99,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: null,
      items: [
        {
          product_id: physicalProductId,
          quantity: 1,
          unit_price: 25.99,
          subtotal: 25.99
        }
      ]
    };

    await expect(createSale(input)).rejects.toThrow(/Customer with ID 99999 not found/i);
  });

  it('should throw error for non-existent product', async () => {
    const input: CreateSaleInput = {
      customer_id: customerId,
      total_amount: 25.99,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: null,
      items: [
        {
          product_id: 99999,
          quantity: 1,
          unit_price: 25.99,
          subtotal: 25.99
        }
      ]
    };

    await expect(createSale(input)).rejects.toThrow(/One or more products not found/i);
  });

  it('should throw error for insufficient stock', async () => {
    const input: CreateSaleInput = {
      customer_id: customerId,
      total_amount: 2624.99,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: null,
      items: [
        {
          product_id: physicalProductId,
          quantity: 101, // More than available stock (100)
          unit_price: 25.99,
          subtotal: 2624.99 // 101 × 25.99 = 2624.99
        }
      ]
    };

    await expect(createSale(input)).rejects.toThrow(/Insufficient stock for product/i);
  });

  it('should throw error for incorrect subtotal calculation', async () => {
    const input: CreateSaleInput = {
      customer_id: customerId,
      total_amount: 25.99,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: null,
      items: [
        {
          product_id: physicalProductId,
          quantity: 1,
          unit_price: 25.99,
          subtotal: 30.00 // Incorrect subtotal
        }
      ]
    };

    await expect(createSale(input)).rejects.toThrow(/Invalid subtotal for product/i);
  });

  it('should throw error for total amount mismatch', async () => {
    const input: CreateSaleInput = {
      customer_id: customerId,
      total_amount: 100.00, // Incorrect total
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: new Date('2024-01-15'),
      notes: null,
      items: [
        {
          product_id: physicalProductId,
          quantity: 1,
          unit_price: 25.99,
          subtotal: 25.99
        }
      ]
    };

    await expect(createSale(input)).rejects.toThrow(/Total amount mismatch/i);
  });

  it('should handle pending payment status', async () => {
    const input: CreateSaleInput = {
      customer_id: customerId,
      total_amount: 25.99,
      payment_method: 'bank_transfer',
      payment_status: 'pending',
      transaction_date: new Date('2024-01-15'),
      notes: 'Awaiting payment',
      items: [
        {
          product_id: physicalProductId,
          quantity: 1,
          unit_price: 25.99,
          subtotal: 25.99
        }
      ]
    };

    const result = await createSale(input);

    expect(result.payment_status).toEqual('pending');
    expect(result.notes).toEqual('Awaiting payment');

    // Stock should still be updated even for pending payments
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, physicalProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(99);
  });
});