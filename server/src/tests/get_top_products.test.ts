import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, customersTable, salesTable, saleItemsTable } from '../db/schema';
import { getTopProducts } from '../handlers/get_top_products';

describe('getTopProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create test products
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'High Revenue Product',
          description: 'Expensive product',
          price: '100.00',
          stock_quantity: 50,
          is_service: false,
          low_stock_threshold: 10
        },
        {
          name: 'High Volume Product', 
          description: 'Cheap product sold in bulk',
          price: '5.00',
          stock_quantity: 200,
          is_service: false,
          low_stock_threshold: 20
        },
        {
          name: 'Medium Product',
          description: 'Average product',
          price: '25.00',
          stock_quantity: 75,
          is_service: false,
          low_stock_threshold: 15
        },
        {
          name: 'Unused Product',
          description: 'Never sold',
          price: '50.00',
          stock_quantity: 30,
          is_service: false,
          low_stock_threshold: 5
        }
      ])
      .returning()
      .execute();

    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create test sales - mix of paid and pending
    const sales = await db.insert(salesTable)
      .values([
        {
          customer_id: customer[0].id,
          total_amount: '300.00', // 3 × $100 High Revenue Product
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-01'),
          notes: 'Test sale 1'
        },
        {
          customer_id: customer[0].id,
          total_amount: '250.00', // 50 × $5 High Volume Product  
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-02'),
          notes: 'Test sale 2'
        },
        {
          customer_id: customer[0].id,
          total_amount: '75.00', // 3 × $25 Medium Product
          payment_method: 'bank_transfer',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-03'),
          notes: 'Test sale 3'
        },
        {
          customer_id: customer[0].id,
          total_amount: '200.00', // 2 × $100 High Revenue Product
          payment_method: 'cash',
          payment_status: 'pending', // Should be excluded
          transaction_date: new Date('2024-01-04'),
          notes: 'Test sale 4 - pending'
        }
      ])
      .returning()
      .execute();

    // Create sale items
    await db.insert(saleItemsTable)
      .values([
        // Sale 1: High Revenue Product
        {
          sale_id: sales[0].id,
          product_id: products[0].id, // High Revenue Product
          quantity: '3.00',
          unit_price: '100.00',
          subtotal: '300.00'
        },
        // Sale 2: High Volume Product
        {
          sale_id: sales[1].id,
          product_id: products[1].id, // High Volume Product
          quantity: '50.00',
          unit_price: '5.00', 
          subtotal: '250.00'
        },
        // Sale 3: Medium Product
        {
          sale_id: sales[2].id,
          product_id: products[2].id, // Medium Product
          quantity: '3.00',
          unit_price: '25.00',
          subtotal: '75.00'
        },
        // Sale 4: High Revenue Product (pending - should be excluded)
        {
          sale_id: sales[3].id,
          product_id: products[0].id, // High Revenue Product
          quantity: '2.00',
          unit_price: '100.00',
          subtotal: '200.00'
        }
      ])
      .execute();

    return { products, customer, sales };
  };

  it('should return top products ordered by revenue', async () => {
    await createTestData();

    const result = await getTopProducts(10);

    expect(result).toHaveLength(3); // Only paid transactions, unused product not included
    
    // Should be ordered by total revenue (descending)
    expect(result[0].product_name).toEqual('High Revenue Product');
    expect(result[0].total_revenue).toEqual(300); // 3 × $100 = $300
    expect(result[0].total_quantity_sold).toEqual(3);
    expect(typeof result[0].total_revenue).toBe('number');
    expect(typeof result[0].total_quantity_sold).toBe('number');

    expect(result[1].product_name).toEqual('High Volume Product');
    expect(result[1].total_revenue).toEqual(250); // 50 × $5 = $250
    expect(result[1].total_quantity_sold).toEqual(50);

    expect(result[2].product_name).toEqual('Medium Product');
    expect(result[2].total_revenue).toEqual(75); // 3 × $25 = $75
    expect(result[2].total_quantity_sold).toEqual(3);
  });

  it('should respect the limit parameter', async () => {
    await createTestData();

    const result = await getTopProducts(2);

    expect(result).toHaveLength(2);
    expect(result[0].product_name).toEqual('High Revenue Product');
    expect(result[1].product_name).toEqual('High Volume Product');
  });

  it('should only include paid transactions', async () => {
    await createTestData();

    const result = await getTopProducts(10);

    // Find High Revenue Product in results
    const highRevenueProduct = result.find(p => p.product_name === 'High Revenue Product');
    expect(highRevenueProduct).toBeDefined();
    
    // Should only count paid transactions (3 units), not pending ones (2 additional units)
    expect(highRevenueProduct!.total_quantity_sold).toEqual(3);
    expect(highRevenueProduct!.total_revenue).toEqual(300);
  });

  it('should return empty array when no sales exist', async () => {
    // Create products but no sales
    await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'No sales',
        price: '10.00',
        stock_quantity: 100,
        is_service: false,
        low_stock_threshold: 10
      })
      .execute();

    const result = await getTopProducts(10);
    expect(result).toHaveLength(0);
  });

  it('should handle default limit correctly', async () => {
    await createTestData();

    const result = await getTopProducts(); // No limit specified, should default to 10

    expect(result).toHaveLength(3); // Less than 10 products available
  });

  it('should include all required fields in response', async () => {
    await createTestData();

    const result = await getTopProducts(1);

    expect(result).toHaveLength(1);
    const product = result[0];
    
    expect(product.product_id).toBeDefined();
    expect(typeof product.product_id).toBe('number');
    expect(product.product_name).toBeDefined();
    expect(typeof product.product_name).toBe('string');
    expect(product.total_quantity_sold).toBeDefined();
    expect(typeof product.total_quantity_sold).toBe('number');
    expect(product.total_revenue).toBeDefined();
    expect(typeof product.total_revenue).toBe('number');
  });

  it('should handle multiple sales for same product correctly', async () => {
    const testData = await createTestData();

    // Add another sale for High Revenue Product
    const additionalSale = await db.insert(salesTable)
      .values({
        customer_id: testData.customer[0].id,
        total_amount: '150.00', // 1.5 × $100
        payment_method: 'credit_card',
        payment_status: 'paid',
        transaction_date: new Date('2024-01-05'),
        notes: 'Additional sale'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        sale_id: additionalSale[0].id,
        product_id: testData.products[0].id, // High Revenue Product
        quantity: '1.5',
        unit_price: '100.00',
        subtotal: '150.00'
      })
      .execute();

    const result = await getTopProducts(1);

    expect(result).toHaveLength(1);
    expect(result[0].product_name).toEqual('High Revenue Product');
    expect(result[0].total_quantity_sold).toEqual(4.5); // 3 + 1.5
    expect(result[0].total_revenue).toEqual(450); // 300 + 150
  });
});