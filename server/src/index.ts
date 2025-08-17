import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import { 
  createProductInputSchema,
  updateProductInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createSaleInputSchema,
  createStockAdjustmentInputSchema,
  salesReportInputSchema
} from './schema';

// Import all handlers
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { deleteProduct } from './handlers/delete_product';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { updateCustomer } from './handlers/update_customer';
import { getCustomerHistory } from './handlers/get_customer_history';
import { createSale } from './handlers/create_sale';
import { getSales } from './handlers/get_sales';
import { getSaleDetails } from './handlers/get_sale_details';
import { createStockAdjustment } from './handlers/create_stock_adjustment';
import { getStockAdjustments } from './handlers/get_stock_adjustments';
import { getLowStockProducts } from './handlers/get_low_stock_products';
import { getSalesReport } from './handlers/get_sales_report';
import { getTopProducts } from './handlers/get_top_products';
import { getTopCustomers } from './handlers/get_top_customers';
import { getRevenueSummary } from './handlers/get_revenue_summary';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Product/Service Management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  
  deleteProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProduct(input.id)),

  // Customer Management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  
  getCustomers: publicProcedure
    .query(() => getCustomers()),
  
  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),
  
  getCustomerHistory: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getCustomerHistory(input.customerId)),

  // Sales Management
  createSale: publicProcedure
    .input(createSaleInputSchema)
    .mutation(({ input }) => createSale(input)),
  
  getSales: publicProcedure
    .query(() => getSales()),
  
  getSaleDetails: publicProcedure
    .input(z.object({ saleId: z.number() }))
    .query(({ input }) => getSaleDetails(input.saleId)),

  // Inventory Management
  createStockAdjustment: publicProcedure
    .input(createStockAdjustmentInputSchema)
    .mutation(({ input }) => createStockAdjustment(input)),
  
  getStockAdjustments: publicProcedure
    .query(() => getStockAdjustments()),
  
  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),

  // Reporting
  getSalesReport: publicProcedure
    .input(salesReportInputSchema)
    .query(({ input }) => getSalesReport(input)),
  
  getTopProducts: publicProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(({ input }) => getTopProducts(input?.limit)),
  
  getTopCustomers: publicProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(({ input }) => getTopCustomers(input?.limit)),
  
  getRevenueSummary: publicProcedure
    .input(z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date()
    }))
    .query(({ input }) => getRevenueSummary(input.startDate, input.endDate)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`UMKM Management TRPC server listening at port: ${port}`);
}

start();