import { db } from '../db';
import { salesTable } from '../db/schema';
import { type SalesReportInput, type SalesReport } from '../schema';
import { sql, gte, lte, eq, and, desc } from 'drizzle-orm';

/**
 * Generates sales reports for specified date ranges.
 * Provides daily or monthly sales summaries with totals and averages.
 */
export async function getSalesReport(input: SalesReportInput): Promise<SalesReport[]> {
  try {
    // Base conditions - date range and only paid transactions
    const conditions = [
      gte(salesTable.transaction_date, input.start_date),
      lte(salesTable.transaction_date, input.end_date),
      eq(salesTable.payment_status, 'paid')
    ];

    // Determine the date format for grouping based on period
    const dateFormat = input.period === 'monthly' 
      ? sql`to_char(${salesTable.transaction_date}, 'YYYY-MM')`
      : sql`to_char(${salesTable.transaction_date}, 'YYYY-MM-DD')`;

    // Build the aggregated query
    const results = await db
      .select({
        period: sql<string>`${dateFormat}`,
        total_sales: sql<string>`sum(${salesTable.total_amount})`,
        total_transactions: sql<string>`count(*)`,
        average_transaction: sql<string>`avg(${salesTable.total_amount})`
      })
      .from(salesTable)
      .where(and(...conditions))
      .groupBy(dateFormat)
      .orderBy(desc(dateFormat))
      .execute();

    // Convert numeric string results back to numbers
    return results.map(result => ({
      period: result.period,
      total_sales: parseFloat(result.total_sales),
      total_transactions: parseInt(result.total_transactions),
      average_transaction: parseFloat(result.average_transaction)
    }));
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
}