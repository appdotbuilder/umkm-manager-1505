import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();

    expect(result).toEqual([]);
  });

  it('should return all products', async () => {
    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Test Product 1',
          description: 'A physical product',
          price: '19.99',
          stock_quantity: 100,
          is_service: false,
          low_stock_threshold: 10
        },
        {
          name: 'Test Service 1',
          description: 'A service offering',
          price: '49.99',
          stock_quantity: null, // Services don't have stock
          is_service: true,
          low_stock_threshold: null
        },
        {
          name: 'Test Product 2',
          description: null,
          price: '29.99',
          stock_quantity: 50,
          is_service: false,
          low_stock_threshold: 5
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);
    
    // Verify first product
    const product1 = result.find(p => p.name === 'Test Product 1');
    expect(product1).toBeDefined();
    expect(product1!.name).toEqual('Test Product 1');
    expect(product1!.description).toEqual('A physical product');
    expect(product1!.price).toEqual(19.99);
    expect(typeof product1!.price).toEqual('number');
    expect(product1!.stock_quantity).toEqual(100);
    expect(product1!.is_service).toEqual(false);
    expect(product1!.low_stock_threshold).toEqual(10);
    expect(product1!.id).toBeDefined();
    expect(product1!.created_at).toBeInstanceOf(Date);
    expect(product1!.updated_at).toBeInstanceOf(Date);

    // Verify service
    const service1 = result.find(p => p.name === 'Test Service 1');
    expect(service1).toBeDefined();
    expect(service1!.name).toEqual('Test Service 1');
    expect(service1!.description).toEqual('A service offering');
    expect(service1!.price).toEqual(49.99);
    expect(typeof service1!.price).toEqual('number');
    expect(service1!.stock_quantity).toBeNull();
    expect(service1!.is_service).toEqual(true);
    expect(service1!.low_stock_threshold).toBeNull();
    expect(service1!.id).toBeDefined();

    // Verify product with null description
    const product2 = result.find(p => p.name === 'Test Product 2');
    expect(product2).toBeDefined();
    expect(product2!.name).toEqual('Test Product 2');
    expect(product2!.description).toBeNull();
    expect(product2!.price).toEqual(29.99);
    expect(typeof product2!.price).toEqual('number');
    expect(product2!.stock_quantity).toEqual(50);
    expect(product2!.is_service).toEqual(false);
    expect(product2!.low_stock_threshold).toEqual(5);
  });

  it('should handle products with different stock levels', async () => {
    // Create products with various stock scenarios
    await db.insert(productsTable)
      .values([
        {
          name: 'High Stock Product',
          description: 'Product with high stock',
          price: '10.00',
          stock_quantity: 1000,
          is_service: false,
          low_stock_threshold: 50
        },
        {
          name: 'Zero Stock Product',
          description: 'Out of stock product',
          price: '15.00',
          stock_quantity: 0,
          is_service: false,
          low_stock_threshold: 5
        },
        {
          name: 'Low Stock Product',
          description: 'Product running low',
          price: '25.00',
          stock_quantity: 3,
          is_service: false,
          low_stock_threshold: 10
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);

    const highStockProduct = result.find(p => p.name === 'High Stock Product');
    expect(highStockProduct!.stock_quantity).toEqual(1000);

    const zeroStockProduct = result.find(p => p.name === 'Zero Stock Product');
    expect(zeroStockProduct!.stock_quantity).toEqual(0);

    const lowStockProduct = result.find(p => p.name === 'Low Stock Product');
    expect(lowStockProduct!.stock_quantity).toEqual(3);

    // All should have proper numeric price conversion
    result.forEach(product => {
      expect(typeof product.price).toEqual('number');
      expect(product.price).toBeGreaterThan(0);
    });
  });

  it('should handle decimal prices correctly', async () => {
    await db.insert(productsTable)
      .values([
        {
          name: 'Precise Price Product',
          description: 'Product with precise pricing',
          price: '123.45',
          stock_quantity: 10,
          is_service: false,
          low_stock_threshold: 2
        },
        {
          name: 'High Value Service',
          description: 'Expensive service',
          price: '999.99',
          stock_quantity: null,
          is_service: true,
          low_stock_threshold: null
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);

    const preciseProduct = result.find(p => p.name === 'Precise Price Product');
    expect(preciseProduct!.price).toEqual(123.45);
    expect(typeof preciseProduct!.price).toEqual('number');

    const expensiveService = result.find(p => p.name === 'High Value Service');
    expect(expensiveService!.price).toEqual(999.99);
    expect(typeof expensiveService!.price).toEqual('number');
  });

  it('should return products in database insertion order', async () => {
    const productNames = ['Product A', 'Product B', 'Product C'];
    
    // Insert products in sequence
    for (const name of productNames) {
      await db.insert(productsTable)
        .values({
          name,
          description: `Description for ${name}`,
          price: '10.00',
          stock_quantity: 10,
          is_service: false,
          low_stock_threshold: 2
        })
        .execute();
    }

    const result = await getProducts();

    expect(result).toHaveLength(3);
    // Should maintain insertion order due to auto-incrementing ID
    expect(result[0].name).toEqual('Product A');
    expect(result[1].name).toEqual('Product B');
    expect(result[2].name).toEqual('Product C');
  });
});