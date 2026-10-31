const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Brightloop database...");

  // Clean existing data in reverse relation order
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.recurringPlan.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const adminHash = await hash("Admin@12345", 12);
  const staffHash = await hash("Staff@12345", 12);
  const custHash = await hash("Customer@123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@brightloop.io",
      fullName: "Admin Officer",
      passwordHash: adminHash,
      role: "admin",
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@brightloop.io",
      fullName: "Operations Staff",
      passwordHash: staffHash,
      role: "staff",
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: "acme@corp.com",
      fullName: "Acme Corporation",
      passwordHash: custHash,
      role: "customer",
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: "stark@industries.com",
      fullName: "Stark Industries",
      passwordHash: custHash,
      role: "customer",
    },
  });

  // 2. Create Taxes
  const taxGst = await prisma.tax.create({
    data: { name: "GST 18%", rate: 18.0, taxType: "sales" },
  });
  const taxVat = await prisma.tax.create({
    data: { name: "VAT 5%", rate: 5.0, taxType: "sales" },
  });
  await prisma.tax.create({
    data: { name: "Zero Tax", rate: 0.0, taxType: "exempt" },
  });

  // 3. Create Products & Variants
  const p1 = await prisma.product.create({
    data: {
      name: "Brightloop Cloud Pro",
      ptype: "software",
      salesPrice: 2999,
      costPrice: 500,
      notes: "High performance subscription analytics & billing engine",
      variants: {
        create: [
          { name: "Single Workspace", priceExtra: 0 },
          { name: "Multi-Team (5 Seats)", priceExtra: 1500 },
          { name: "Unlimited Enterprise", priceExtra: 5000 },
        ],
      },
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: "Dedicated Enterprise Support",
      ptype: "service",
      salesPrice: 9999,
      costPrice: 2000,
      notes: "24/7 dedicated solutions architect & priority SLA response",
      variants: {
        create: [
          { name: "Standard 8x5", priceExtra: 0 },
          { name: "Priority 24x7", priceExtra: 5000 },
        ],
      },
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: "Automated Tax & Invoicing Add-on",
      ptype: "software",
      salesPrice: 1299,
      costPrice: 200,
      notes: "Instant GST compliance, automated reconciliation, and webhook dispatch",
    },
  });

  // 4. Create Recurring Plans
  const planStarter = await prisma.recurringPlan.create({
    data: {
      name: "Starter Monthly",
      productId: p1.id,
      price: 999,
      billingPeriod: "monthly",
      minQty: 1,
      renewable: true,
      pausable: true,
      closable: true,
    },
  });

  const planPro = await prisma.recurringPlan.create({
    data: {
      name: "Professional Monthly",
      productId: p1.id,
      price: 2999,
      billingPeriod: "monthly",
      minQty: 1,
      renewable: true,
      pausable: true,
      closable: true,
    },
  });

  const planEnterprise = await prisma.recurringPlan.create({
    data: {
      name: "Enterprise Annual",
      productId: p2.id,
      price: 99999,
      billingPeriod: "yearly",
      minQty: 1,
      renewable: true,
      pausable: true,
      closable: false,
    },
  });

  // 5. Create Quotation Templates
  await prisma.quotationTemplate.create({
    data: {
      name: "Standard SaaS Monthly Onboarding",
      planId: planPro.id,
      validityDays: 30,
    },
  });

  await prisma.quotationTemplate.create({
    data: {
      name: "Enterprise Annual Partner Package",
      planId: planEnterprise.id,
      validityDays: 60,
    },
  });

  // 6. Create Discounts
  await prisma.discount.create({
    data: {
      name: "EARLYBIRD20",
      dtype: "percentage",
      value: 20,
      minPurchase: 1000,
      usageLimit: 100,
    },
  });

  await prisma.discount.create({
    data: {
      name: "STARTUP500",
      dtype: "fixed",
      value: 500,
      minPurchase: 2000,
      usageLimit: 50,
    },
  });

  // 7. Create Subscriptions
  const sub1 = await prisma.subscription.create({
    data: {
      number: "SUB-00001",
      customerId: customer1.id,
      planId: planPro.id,
      startDate: new Date("2026-01-01"),
      state: "confirmed",
      recurringPrice: 2999,
      paymentTerms: "Net 30",
      nextInvoiceDate: new Date(Date.now() + 15 * 86400000),
      lines: {
        create: [
          {
            productId: p1.id,
            qty: 1,
            unitPrice: 2999,
            taxId: taxGst.id,
            amount: 2999,
          },
        ],
      },
    },
  });

  const sub2 = await prisma.subscription.create({
    data: {
      number: "SUB-00002",
      customerId: customer2.id,
      planId: planEnterprise.id,
      startDate: new Date("2026-02-01"),
      state: "confirmed",
      recurringPrice: 99999,
      paymentTerms: "Net 45",
      nextInvoiceDate: new Date(Date.now() + 200 * 86400000),
      lines: {
        create: [
          {
            productId: p2.id,
            qty: 1,
            unitPrice: 99999,
            taxId: taxGst.id,
            amount: 99999,
          },
        ],
      },
    },
  });

  const sub3 = await prisma.subscription.create({
    data: {
      number: "SUB-00003",
      customerId: customer1.id,
      planId: planStarter.id,
      startDate: new Date(),
      state: "draft",
      recurringPrice: 999,
      paymentTerms: "Due Upon Receipt",
      nextInvoiceDate: new Date(),
      lines: {
        create: [
          {
            productId: p1.id,
            qty: 1,
            unitPrice: 999,
            amount: 999,
          },
        ],
      },
    },
  });

  // 8. Create Invoices
  const inv1 = await prisma.invoice.create({
    data: {
      number: "INV-00001",
      customerId: customer1.id,
      subscriptionId: sub1.id,
      date: new Date("2026-01-01"),
      state: "paid",
      total: 3538.82,
      taxTotal: 539.82,
      lines: {
        create: [
          {
            description: "Brightloop Cloud Pro - Monthly Cycle (Jan 2026)",
            qty: 1,
            unitPrice: 2999,
            taxId: taxGst.id,
            taxAmount: 539.82,
            amount: 2999,
          },
        ],
      },
      payments: {
        create: [
          {
            method: "credit_card",
            amount: 3538.82,
            note: "Card ending 4242",
            date: new Date("2026-01-02"),
          },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      number: "INV-00002",
      customerId: customer2.id,
      subscriptionId: sub2.id,
      date: new Date("2026-02-01"),
      state: "confirmed",
      total: 117998.82,
      taxTotal: 17999.82,
      lines: {
        create: [
          {
            description: "Dedicated Enterprise Support - Annual SLA (2026-2027)",
            qty: 1,
            unitPrice: 99999,
            taxId: taxGst.id,
            taxAmount: 17999.82,
            amount: 99999,
          },
        ],
      },
    },
  });

  console.log("Seeding complete!");
  console.log("Admin: admin@brightloop.io / Admin@12345");
  console.log("Staff: staff@brightloop.io / Staff@12345");
  console.log("Customer: acme@corp.com / Customer@123");
  console.log("Customer: stark@industries.com / Customer@123");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
