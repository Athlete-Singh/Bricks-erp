/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { PLATFORM_PLANS } from '@brics/shared';
import { AuditService } from '../../audit/audit.service';
import { Company } from '../../company/entities/company.entity';
import { PlatformInvoice } from '../entities/platform-invoice.entity';
import { PlatformBillingService } from '../platform-billing.service';

const ACTOR_ID = 'platform-operator-1';

describe('PlatformBillingService', () => {
  let service: PlatformBillingService;
  let companyRepo: jest.Mocked<Repository<Company>>;
  let invoiceRepo: jest.Mocked<Repository<PlatformInvoice>>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(async () => {
    companyRepo = {
      findOneBy: jest.fn(),
      find: jest.fn(),
      save: jest.fn((c) => Promise.resolve(c)),
    } as unknown as jest.Mocked<Repository<Company>>;

    invoiceRepo = {
      findOneBy: jest.fn(),
      find: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(
        (dto: unknown) =>
          ({ id: 'inv-1', createdAt: new Date(), updatedAt: new Date(), ...(dto as object) }) as PlatformInvoice,
      ),
      save: jest.fn((i: unknown) => Promise.resolve(i as PlatformInvoice)),
    } as unknown as jest.Mocked<Repository<PlatformInvoice>>;

    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlatformBillingService,
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: getRepositoryToken(PlatformInvoice), useValue: invoiceRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(PlatformBillingService);
  });

  describe('getPlans', () => {
    it('returns all canonical platform plans', () => {
      const plans = service.getPlans();
      expect(plans).toEqual(PLATFORM_PLANS);
      expect(plans.map((p) => p.code)).toEqual(['starter', 'growth', 'enterprise']);
    });
  });

  describe('getTenantBilling', () => {
    it('throws NotFoundException if company does not exist', async () => {
      companyRepo.findOneBy.mockResolvedValue(null);
      await expect(service.getTenantBilling('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns tenant billing profile and invoices', async () => {
      companyRepo.findOneBy.mockResolvedValue({
        id: 'c1',
        name: 'Vikas Bricks',
        planName: 'starter',
        status: 'active',
        subscriptionStatus: 'active',
        billingCycle: 'monthly',
        trialEndsAt: null,
        gracePeriodDays: 7,
      } as Company);

      invoiceRepo.find.mockResolvedValue([
        {
          id: 'inv-1',
          companyId: 'c1',
          invoiceNumber: 'INV-PLT-202610-0001',
          amount: '2999.00',
          taxAmount: '539.82',
          totalAmount: '3538.82',
          status: 'pending',
          planName: 'starter',
          billingCycle: 'monthly',
          periodStart: new Date('2026-10-01'),
          periodEnd: new Date('2026-10-31'),
          dueDate: '2026-10-15',
          paidAt: null,
          paymentMethod: null,
          paymentRef: null,
          notes: null,
          createdAt: new Date('2026-10-01'),
          updatedAt: new Date('2026-10-01'),
        },
      ]);

      const billing = await service.getTenantBilling('c1');
      expect(billing.tenantId).toBe('c1');
      expect(billing.tenantName).toBe('Vikas Bricks');
      expect(billing.currentPlan?.code).toBe('starter');
      expect(billing.invoices).toHaveLength(1);
      expect(billing.invoices[0]!.invoiceNumber).toBe('INV-PLT-202610-0001');
      expect(billing.invoices[0]!.totalAmount).toBe('3538.82');
    });
  });

  describe('updateTenantSubscription', () => {
    it('updates subscription parameters and records audit log', async () => {
      const company = {
        id: 'c1',
        name: 'Vikas Bricks',
        planName: 'starter',
        status: 'active',
        subscriptionStatus: 'active',
        billingCycle: 'monthly',
        trialEndsAt: null,
        gracePeriodDays: 7,
        updatedBy: null,
      } as unknown as Company;
      companyRepo.findOneBy.mockResolvedValue(company);
      invoiceRepo.find.mockResolvedValue([]);

      const updated = await service.updateTenantSubscription('c1', ACTOR_ID, {
        planName: 'growth',
        billingCycle: 'yearly',
        gracePeriodDays: 14,
      });

      expect(company.planName).toBe('growth');
      expect(company.billingCycle).toBe('yearly');
      expect(company.gracePeriodDays).toBe(14);
      expect(company.updatedBy).toBe(ACTOR_ID);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'c1',
          userId: ACTOR_ID,
          action: 'UPDATE',
        }),
      );
      expect(updated.currentPlan?.code).toBe('growth');
    });
  });

  describe('createInvoice', () => {
    it('computes total amount accurately with Decimal.js and creates invoice', async () => {
      companyRepo.findOneBy.mockResolvedValue({ id: 'c1' } as Company);
      invoiceRepo.count.mockResolvedValue(4);

      const inv = await service.createInvoice('c1', ACTOR_ID, {
        planName: 'growth',
        billingCycle: 'monthly',
        amount: '5999.00',
        taxAmount: '1079.82',
        periodStart: '2026-10-01T00:00:00.000Z',
        periodEnd: '2026-10-31T23:59:59.000Z',
        dueDate: '2026-10-25',
        notes: 'Monthly growth plan subscription',
      });

      expect(inv.amount).toBe('5999.00');
      expect(inv.taxAmount).toBe('1079.82');
      expect(inv.totalAmount).toBe('7078.82');
      expect(inv.status).toBe('pending');
      expect(inv.invoiceNumber).toMatch(/^INV-PLT-\d{6}-0005$/);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'c1',
          userId: ACTOR_ID,
          action: 'CREATE',
        }),
      );
    });
  });

  describe('recordPayment', () => {
    it('rejects payment on already-paid invoice', async () => {
      invoiceRepo.findOneBy.mockResolvedValue({
        id: 'inv-1',
        status: 'paid',
      } as PlatformInvoice);

      await expect(
        service.recordPayment('inv-1', ACTOR_ID, {
          paymentMethod: 'upi',
          paymentRef: 'UPI1234567890',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('records payment and activates suspended tenant', async () => {
      const invoice = {
        id: 'inv-1',
        companyId: 'c1',
        invoiceNumber: 'INV-PLT-202610-0001',
        amount: '2999.00',
        taxAmount: '0.00',
        totalAmount: '2999.00',
        status: 'pending',
        planName: 'starter',
        billingCycle: 'monthly',
        periodStart: new Date('2026-10-01'),
        periodEnd: new Date('2026-10-31'),
        dueDate: '2026-10-15',
        paidAt: null,
        paymentMethod: null,
        paymentRef: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PlatformInvoice;

      const company = {
        id: 'c1',
        status: 'suspended',
        subscriptionStatus: 'past_due',
      } as Company;

      invoiceRepo.findOneBy.mockResolvedValue(invoice);
      companyRepo.findOneBy.mockResolvedValue(company);

      const paid = await service.recordPayment('inv-1', ACTOR_ID, {
        paymentMethod: 'bank_transfer',
        paymentRef: 'NEFT987654321',
      });

      expect(paid.status).toBe('paid');
      expect(paid.paymentMethod).toBe('bank_transfer');
      expect(paid.paymentRef).toBe('NEFT987654321');
      expect(company.status).toBe('active');
      expect(company.subscriptionStatus).toBe('active');
      expect(audit.record).toHaveBeenCalledTimes(2); // 1 for invoice, 1 for company reactivation
    });
  });

  describe('checkExpiryAndSuspension', () => {
    it('suspends expired trial companies past grace period', async () => {
      const expiredCompany = {
        id: 'c-trial',
        name: 'Trial Kiln',
        status: 'trial',
        subscriptionStatus: 'trial',
        trialEndsAt: '2026-09-01',
        gracePeriodDays: 7,
      } as Company;

      companyRepo.find.mockResolvedValue([expiredCompany]);
      invoiceRepo.find.mockResolvedValue([]);

      const result = await service.checkExpiryAndSuspension();

      expect(expiredCompany.status).toBe('suspended');
      expect(expiredCompany.subscriptionStatus).toBe('past_due');
      expect(result.suspendedTrials).toHaveLength(1);
      expect(result.suspendedTrials[0]!.tenantId).toBe('c-trial');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'c-trial',
          action: 'UPDATE',
        }),
      );
    });

    it('marks overdue invoices and suspends tenant past grace period', async () => {
      const company = {
        id: 'c-overdue',
        name: 'Overdue Kiln',
        status: 'active',
        subscriptionStatus: 'active',
        trialEndsAt: null,
        gracePeriodDays: 5,
      } as Company;

      const overdueInvoice = {
        id: 'inv-overdue',
        companyId: 'c-overdue',
        invoiceNumber: 'INV-PLT-202609-0001',
        status: 'pending',
        dueDate: '2026-09-10',
      } as PlatformInvoice;

      companyRepo.find.mockResolvedValue([company]);
      invoiceRepo.find.mockResolvedValue([overdueInvoice]);
      companyRepo.findOneBy.mockResolvedValue(company);

      const result = await service.checkExpiryAndSuspension();

      expect(overdueInvoice.status).toBe('overdue');
      expect(company.status).toBe('suspended');
      expect(company.subscriptionStatus).toBe('past_due');
      expect(result.overdueInvoices).toHaveLength(1);
      expect(result.suspendedForOverdue).toHaveLength(1);
      expect(result.suspendedForOverdue[0]!.tenantId).toBe('c-overdue');
    });
  });
});
