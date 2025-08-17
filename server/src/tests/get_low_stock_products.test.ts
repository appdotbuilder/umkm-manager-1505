import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getLowStockProducts } from '../handlers/get_low_stock_products';

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products with stock at or below threshold', async () => {
    // Create test products
    await db.insert(productsTable).values([
      {
        name: 'Low Stock Product',
        price: '10.00',
        stock_quantity: 5,
        low_stock_threshold: 10,
        is_service: false
      },
      {
        name: 'Normal Stock Product',
        price: '20.00',
        stock_quantity: 20,
        low_stock_threshold: 10,
        is_service: false
      },
      {
        name: 'At Threshold Product',
        price: '15.00',
        stock_quantity: 10,
        low_stock_threshold: 10,
        is_service: false
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(2);
    
    // Should include low stock product
    const lowStockProduct = result.find(p => p.product_name === 'Low Stock Product');
    expect(lowStockProduct).toBeDefined();
    expect(lowStockProduct!.current_stock).toEqual(5);
    expect(lowStockProduct!.low_stock_threshold).toEqual(10);
    expect(lowStockProduct!.stock_difference).toEqual(5);

    // Should include at threshold product
    const atThresholdProduct = result.find(p => p.product_name === 'At Threshold Product');
    expect(atThresholdProduct).toBeDefined();
    expect(atThresholdProduct!.current_stock).toEqual(10);
    expect(atThresholdProduct!.low_stock_threshold).toEqual(10);
    expect(atThresholdProduct!.stock_difference).toEqual(0);

    // Should not include normal stock product
    const normalStockProduct = result.find(p => p.product_name === 'Normal Stock Product');
    expect(normalStockProduct).toBeUndefined();
  });

  it('should exclude services from low stock report', async () => {
    // Create test products including services
    await db.insert(productsTable).values([
      {
        name: 'Low Stock Physical Product',
        price: '10.00',
        stock_quantity: 2,
        low_stock_threshold: 10,
        is_service: false
      },
      {
        name: 'Service Product',
        price: '50.00',
        stock_quantity: null, // Services don't have stock
        low_stock_threshold: null,
        is_service: true
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].product_name).toEqual('Low Stock Physical Product');
    
    // Verify service is not included
    const serviceProduct = result.find(p => p.product_name === 'Service Product');
    expect(serviceProduct).toBeUndefined();
  });

  it('should include products with null threshold but zero stock', async () => {
    // Create products with no threshold set
    await db.insert(productsTable).values([
      {
        name: 'Zero Stock No Threshold',
        price: '10.00',
        stock_quantity: 0,
        low_stock_threshold: null,
        is_service: false
      },
      {
        name: 'Some Stock No Threshold',
        price: '15.00',
        stock_quantity: 5,
        low_stock_threshold: null,
        is_service: false
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].product_name).toEqual('Zero Stock No Threshold');
    expect(result[0].current_stock).toEqual(0);
    expect(result[0].low_stock_threshold).toEqual(0);
    expect(result[0].stock_difference).toEqual(0);

    // Should not include product with some stock and no threshold
    const someStockProduct = result.find(p => p.product_name === 'Some Stock No Threshold');
    expect(someStockProduct).toBeUndefined();
  });

  it('should order results by lowest stock first', async () => {
    // Create products with different stock levels
    await db.insert(productsTable).values([
      {
        name: 'Medium Low Stock',
        price: '10.00',
        stock_quantity: 3,
        low_stock_threshold: 10,
        is_service: false
      },
      {
        name: 'Very Low Stock',
        price: '15.00',
        stock_quantity: 1,
        low_stock_threshold: 10,
        is_service: false
      },
      {
        name: 'Slightly Low Stock',
        price: '20.00',
        stock_quantity: 8,
        low_stock_threshold: 10,
        is_service: false
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(3);
    
    // Should be ordered by current stock (ascending)
    expect(result[0].product_name).toEqual('Very Low Stock');
    expect(result[0].current_stock).toEqual(1);
    
    expect(result[1].product_name).toEqual('Medium Low Stock');
    expect(result[1].current_stock).toEqual(3);
    
    expect(result[2].product_name).toEqual('Slightly Low Stock');
    expect(result[2].current_stock).toEqual(8);
  });

  it('should handle null stock quantities correctly', async () => {
    // Create product with null stock (edge case)
    await db.insert(productsTable).values([
      {
        name: 'Null Stock Product',
        price: '10.00',
        stock_quantity: null,
        low_stock_threshold: 5,
        is_service: false
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].product_name).toEqual('Null Stock Product');
    expect(result[0].current_stock).toEqual(0); // null should be treated as 0
    expect(result[0].low_stock_threshold).toEqual(5);
    expect(result[0].stock_difference).toEqual(5);
  });

  it('should return empty array when no products need restocking', async () => {
    // Create products with healthy stock levels
    await db.insert(productsTable).values([
      {
        name: 'Well Stocked Product',
        price: '10.00',
        stock_quantity: 50,
        low_stock_threshold: 10,
        is_service: false
      },
      {
        name: 'Service Product',
        price: '25.00',
        stock_quantity: null,
        low_stock_threshold: null,
        is_service: true
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should calculate stock difference correctly', async () => {
    // Create products to test stock difference calculation
    await db.insert(productsTable).values([
      {
        name: 'Critical Stock',
        price: '10.00',
        stock_quantity: 2,
        low_stock_threshold: 15,
        is_service: false
      },
      {
        name: 'Zero Stock with Threshold',
        price: '20.00',
        stock_quantity: 0,
        low_stock_threshold: 8,
        is_service: false
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(2);
    
    const criticalStock = result.find(p => p.product_name === 'Critical Stock');
    expect(criticalStock!.stock_difference).toEqual(13); // 15 - 2
    
    const zeroStock = result.find(p => p.product_name === 'Zero Stock with Threshold');
    expect(zeroStock!.stock_difference).toEqual(8); // 8 - 0
  });
});