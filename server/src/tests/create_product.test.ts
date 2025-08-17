import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('Physical Products', () => {
    const physicalProductInput: CreateProductInput = {
      name: 'Test Physical Product',
      description: 'A physical product for testing',
      price: 29.99,
      stock_quantity: 50,
      is_service: false,
      low_stock_threshold: 10
    };

    it('should create a physical product with stock', async () => {
      const result = await createProduct(physicalProductInput);

      expect(result.name).toEqual('Test Physical Product');
      expect(result.description).toEqual('A physical product for testing');
      expect(result.price).toEqual(29.99);
      expect(typeof result.price).toBe('number');
      expect(result.stock_quantity).toEqual(50);
      expect(result.is_service).toEqual(false);
      expect(result.low_stock_threshold).toEqual(10);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save physical product to database correctly', async () => {
      const result = await createProduct(physicalProductInput);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, result.id))
        .execute();

      expect(products).toHaveLength(1);
      const savedProduct = products[0];
      expect(savedProduct.name).toEqual('Test Physical Product');
      expect(savedProduct.description).toEqual('A physical product for testing');
      expect(parseFloat(savedProduct.price)).toEqual(29.99);
      expect(savedProduct.stock_quantity).toEqual(50);
      expect(savedProduct.is_service).toEqual(false);
      expect(savedProduct.low_stock_threshold).toEqual(10);
      expect(savedProduct.created_at).toBeInstanceOf(Date);
      expect(savedProduct.updated_at).toBeInstanceOf(Date);
    });

    it('should create physical product without low stock threshold', async () => {
      const inputWithoutThreshold: CreateProductInput = {
        ...physicalProductInput,
        low_stock_threshold: null
      };

      const result = await createProduct(inputWithoutThreshold);

      expect(result.stock_quantity).toEqual(50);
      expect(result.low_stock_threshold).toBeNull();
      expect(result.is_service).toEqual(false);
    });

    it('should create physical product with zero stock', async () => {
      const zeroStockInput: CreateProductInput = {
        ...physicalProductInput,
        stock_quantity: 0
      };

      const result = await createProduct(zeroStockInput);

      expect(result.stock_quantity).toEqual(0);
      expect(result.is_service).toEqual(false);
      expect(result.low_stock_threshold).toEqual(10);
    });
  });

  describe('Services', () => {
    const serviceInput: CreateProductInput = {
      name: 'Test Service',
      description: 'A service for testing',
      price: 99.99,
      stock_quantity: 100, // This should be ignored for services
      is_service: true,
      low_stock_threshold: 5 // This should be ignored for services
    };

    it('should create a service and ignore stock-related fields', async () => {
      const result = await createProduct(serviceInput);

      expect(result.name).toEqual('Test Service');
      expect(result.description).toEqual('A service for testing');
      expect(result.price).toEqual(99.99);
      expect(typeof result.price).toBe('number');
      expect(result.stock_quantity).toBeNull(); // Should be null for services
      expect(result.is_service).toEqual(true);
      expect(result.low_stock_threshold).toBeNull(); // Should be null for services
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save service to database with null stock fields', async () => {
      const result = await createProduct(serviceInput);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, result.id))
        .execute();

      expect(products).toHaveLength(1);
      const savedProduct = products[0];
      expect(savedProduct.name).toEqual('Test Service');
      expect(savedProduct.description).toEqual('A service for testing');
      expect(parseFloat(savedProduct.price)).toEqual(99.99);
      expect(savedProduct.stock_quantity).toBeNull();
      expect(savedProduct.is_service).toEqual(true);
      expect(savedProduct.low_stock_threshold).toBeNull();
    });

    it('should create service with null description', async () => {
      const serviceWithNullDescription: CreateProductInput = {
        ...serviceInput,
        description: null
      };

      const result = await createProduct(serviceWithNullDescription);

      expect(result.description).toBeNull();
      expect(result.stock_quantity).toBeNull();
      expect(result.low_stock_threshold).toBeNull();
      expect(result.is_service).toEqual(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal prices correctly', async () => {
      const decimalPriceInput: CreateProductInput = {
        name: 'Decimal Price Product',
        description: 'Product with decimal price',
        price: 19.95,
        stock_quantity: 25,
        is_service: false,
        low_stock_threshold: 5
      };

      const result = await createProduct(decimalPriceInput);

      expect(result.price).toEqual(19.95);
      expect(typeof result.price).toBe('number');

      // Verify in database
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, result.id))
        .execute();

      expect(parseFloat(products[0].price)).toEqual(19.95);
    });

    it('should handle high precision prices (rounded to 2 decimal places)', async () => {
      const highPrecisionInput: CreateProductInput = {
        name: 'High Precision Product',
        description: 'Product with high precision price',
        price: 123.456,
        stock_quantity: 10,
        is_service: false,
        low_stock_threshold: 2
      };

      const result = await createProduct(highPrecisionInput);

      // PostgreSQL numeric(10,2) rounds to 2 decimal places
      expect(result.price).toEqual(123.46);
      expect(typeof result.price).toBe('number');
    });

    it('should create multiple products successfully', async () => {
      const product1Input: CreateProductInput = {
        name: 'Product 1',
        description: 'First product',
        price: 10.00,
        stock_quantity: 100,
        is_service: false,
        low_stock_threshold: 20
      };

      const product2Input: CreateProductInput = {
        name: 'Service 1',
        description: 'First service',
        price: 50.00,
        stock_quantity: null,
        is_service: true,
        low_stock_threshold: null
      };

      const result1 = await createProduct(product1Input);
      const result2 = await createProduct(product2Input);

      expect(result1.id).not.toEqual(result2.id);
      expect(result1.name).toEqual('Product 1');
      expect(result2.name).toEqual('Service 1');
      expect(result1.is_service).toEqual(false);
      expect(result2.is_service).toEqual(true);
      expect(result1.stock_quantity).toEqual(100);
      expect(result2.stock_quantity).toBeNull();

      // Verify both exist in database
      const allProducts = await db.select()
        .from(productsTable)
        .execute();

      expect(allProducts).toHaveLength(2);
    });
  });
});