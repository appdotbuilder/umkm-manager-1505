import { db } from '../db';
import { salesTable } from '../db/schema';
import { eq, and, gte, lte, sql, SQL } from 'drizzle-orm';

/**
 * Revenue and expense summary data structure
 */
export interface RevenueSummary {
  total_revenue: number;
  total_transactions: number;
  average_transaction: number;
  revenue_by_payment_method: Array<{
    payment_method: string;
    total_amount: number;
    transaction_count: number;
  }>;
  period_start: Date;
  period_end: Date;
}

/**
 * Generates comprehensive revenue and expense summary for specified date range.
 * Provides overview of business performance including payment method breakdown.
 */
export async function getRevenueSummary(startDate: Date, endDate: Date): Promise<RevenueSummary> {
  try {
    // Build conditions for date range and paid transactions
    const conditions: SQL<unknown>[] = [
      eq(salesTable.payment_status, 'paid'),
      gte(salesTable.transaction_date, startDate),
      lte(salesTable.transaction_date, endDate)
    ];

    // Get overall revenue summary
    const overallSummaryQuery = db
      .select({
        total_revenue: sql<string>`COALESCE(SUM(${salesTable.total_amount}), 0)`,
        total_transactions: sql<string>`COUNT(*)`,
        average_transaction: sql<string>`COALESCE(AVG(${salesTable.total_amount}), 0)`
      })
      .from(salesTable)
      .where(and(...conditions));

    const overallResult = await overallSummaryQuery.execute();
    const summary = overallResult[0];

    // Get revenue breakdown by payment method
    const paymentMethodQuery = db
      .select({
        payment_method: salesTable.payment_method,
        total_amount: sql<string>`SUM(${salesTable.total_amount})`,
        transaction_count: sql<string>`COUNT(*)`
      })
      .from(salesTable)
      .where(and(...conditions))
      .groupBy(salesTable.payment_method)
      .orderBy(salesTable.payment_method);

    const paymentMethodResults = await paymentMethodQuery.execute();

    return {
      total_revenue: parseFloat(summary.total_revenue),
      total_transactions: parseInt(summary.total_transactions),
      average_transaction: parseFloat(summary.average_transaction),
      revenue_by_payment_method: paymentMethodResults.map(result => ({
        payment_method: result.payment_method,
        total_amount: parseFloat(result.total_amount),
        transaction_count: parseInt(result.transaction_count)
      })),
      period_start: startDate,
      period_end: endDate
    };
  } catch (error) {
    console.error('Revenue summary generation failed:', error);
    throw error;
  }
}