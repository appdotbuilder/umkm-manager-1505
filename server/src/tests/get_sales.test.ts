import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { salesTable, customersTable } from '../db/schema';
import { getSales } from '../handlers/get_sales';

describe('getSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales exist', async () => {
    const result = await getSales();
    
    expect(result).toEqual([]);
  });

  it('should retrieve all sales', async () => {
    // Create a customer for testing
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890',
        address: '123 Test St'
      })
      .returning()
      .execute();
    
    const customerId = customerResult[0].id;

    // Create test sales
    const testSales = [
      {
        customer_id: customerId,
        total_amount: '150.00',
        payment_method: 'cash' as const,
        payment_status: 'paid' as const,
        transaction_date: new Date('2024-01-15'),
        notes: 'Test sale 1'
      },
      {
        customer_id: null,
        total_amount: '75.50',
        payment_method: 'credit_card' as const,
        payment_status: 'pending' as const,
        transaction_date: new Date('2024-01-16'),
        notes: 'Test sale 2'
      }
    ];

    await db.insert(salesTable)
      .values(testSales)
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(2);
    
    // Should be ordered by transaction_date desc (most recent first)
    expect(result[0].transaction_date).toEqual(new Date('2024-01-16'));
    expect(result[1].transaction_date).toEqual(new Date('2024-01-15'));
    
    // Verify first sale (most recent)
    expect(result[0].customer_id).toBeNull();
    expect(result[0].total_amount).toEqual(75.5);
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].payment_method).toEqual('credit_card');
    expect(result[0].payment_status).toEqual('pending');
    expect(result[0].notes).toEqual('Test sale 2');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    
    // Verify second sale (older)
    expect(result[1].customer_id).toEqual(customerId);
    expect(result[1].total_amount).toEqual(150.0);
    expect(typeof result[1].total_amount).toBe('number');
    expect(result[1].payment_method).toEqual('cash');
    expect(result[1].payment_status).toEqual('paid');
    expect(result[1].notes).toEqual('Test sale 1');
  });

  it('should handle sales with null customer_id', async () => {
    // Create a sale without customer (walk-in customer)
    await db.insert(salesTable)
      .values({
        customer_id: null,
        total_amount: '99.99',
        payment_method: 'e_wallet',
        payment_status: 'paid',
        transaction_date: new Date(),
        notes: null
      })
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toBeNull();
    expect(result[0].total_amount).toEqual(99.99);
    expect(result[0].payment_method).toEqual('e_wallet');
    expect(result[0].notes).toBeNull();
  });

  it('should handle different payment methods and statuses', async () => {
    const testSales = [
      {
        customer_id: null,
        total_amount: '25.00',
        payment_method: 'bank_transfer' as const,
        payment_status: 'cancelled' as const,
        transaction_date: new Date(),
        notes: 'Cancelled order'
      },
      {
        customer_id: null,
        total_amount: '300.50',
        payment_method: 'other' as const,
        payment_status: 'paid' as const,
        transaction_date: new Date(),
        notes: 'Special payment method'
      }
    ];

    await db.insert(salesTable)
      .values(testSales)
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(2);
    
    // Find the cancelled sale
    const cancelledSale = result.find(sale => sale.payment_status === 'cancelled');
    expect(cancelledSale).toBeDefined();
    expect(cancelledSale!.payment_method).toEqual('bank_transfer');
    expect(cancelledSale!.total_amount).toEqual(25.0);
    
    // Find the other payment method sale
    const otherSale = result.find(sale => sale.payment_method === 'other');
    expect(otherSale).toBeDefined();
    expect(otherSale!.payment_status).toEqual('paid');
    expect(otherSale!.total_amount).toEqual(300.5);
  });

  it('should maintain correct date ordering with multiple sales', async () => {
    const dates = [
      new Date('2024-01-10'),
      new Date('2024-01-12'),
      new Date('2024-01-08'),
      new Date('2024-01-15')
    ];

    // Insert sales with different dates
    for (let i = 0; i < dates.length; i++) {
      await db.insert(salesTable)
        .values({
          customer_id: null,
          total_amount: `${(i + 1) * 10}.00`,
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: dates[i],
          notes: `Sale ${i + 1}`
        })
        .execute();
    }

    const result = await getSales();

    expect(result).toHaveLength(4);
    
    // Should be ordered by transaction_date DESC
    expect(result[0].transaction_date).toEqual(new Date('2024-01-15'));
    expect(result[1].transaction_date).toEqual(new Date('2024-01-12'));
    expect(result[2].transaction_date).toEqual(new Date('2024-01-10'));
    expect(result[3].transaction_date).toEqual(new Date('2024-01-08'));
    
    // Verify the corresponding amounts match the order
    expect(result[0].total_amount).toEqual(40.0); // Sale 4
    expect(result[1].total_amount).toEqual(20.0); // Sale 2
    expect(result[2].total_amount).toEqual(10.0); // Sale 1
    expect(result[3].total_amount).toEqual(30.0); // Sale 3
  });
});