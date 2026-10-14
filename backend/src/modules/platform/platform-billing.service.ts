import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { LessThan, Repository } from 'typeorm';
import {
  PLATFORM_PLANS,
  type CreatePlatformInvoiceDto,
  type ExpiryCheckResultDto,
  type PlatformInvoiceDto,
  type PlatformPlan,
  type RecordPlatformPaymentDto,
  type TenantBillingInfoDto,
  type UpdateTenantSubscriptionDto,
} from '@brics/shared';
import { AuditService } from '../audit/audit.service';
import { Company } from '../company/entities/company.entity';
import { PlatformInvoice } from './entities/platform-invoice.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });
const money = (v: Decimal.Value): string => new Decimal(v).toFixed(2);

/**
 * Platform billing service (S4 / PLT-11).
 * Manages SaaS plans, tenant subscription status, invoices, payments,
 * trial expiry calculations, and automatic suspensions under audit trail.
 */
@Injectable()
export class PlatformBillingService {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(PlatformInvoice) private invoiceRepo: Repository<PlatformInvoice>,
    private audit: AuditService,
  ) {}

  getPlans(): PlatformPlan[] {
    return PLATFORM_PLANS;
  }

  async getTenantBilling(tenantId: string): Promise<TenantBillingInfoDto> {
    const company = await this.companyRepo.findOneBy({ id: tenantId });
    if (!company) {
      throw new NotFoundException('Tenant not found');
    }

    const invoices = await this.invoiceRepo.find({
      where: { companyId: tenantId },
      order: { createdAt: 'DESC' },
    });

    const currentPlan = PLATFORM_PLANS.find((p) => p.code === company.planName) || null;

    return {
      tenantId: company.id,
      tenantName: company.name,
      planName: company.planName || 'starter',
      status: company.status,
      subscriptionStatus: company.subscriptionStatus || 'trial',
      billingCycle: company.billingCycle || 'monthly',
      trialEndsAt: company.trialEndsAt,
      gracePeriodDays: company.gracePeriodDays ?? 7,
      currentPlan,
      invoices: invoices.map((inv) => this.toInvoiceDto(inv)),
    };
  }

  async updateTenantSubscription(
    tenantId: string,
    actorId: string,
    dto: UpdateTenantSubscriptionDto,
  ): Promise<TenantBillingInfoDto> {
    const company = await this.companyRepo.findOneBy({ id: tenantId });
    if (!company) {
      throw new NotFoundException('Tenant not found');
    }

    const before = {
      planName: company.planName,
      billingCycle: company.billingCycle,
      subscriptionStatus: company.subscriptionStatus,
      trialEndsAt: company.trialEndsAt,
      gracePeriodDays: company.gracePeriodDays,
    };

    if (dto.planName !== undefined) company.planName = dto.planName;
    if (dto.billingCycle !== undefined) company.billingCycle = dto.billingCycle;
    if (dto.subscriptionStatus !== undefined) company.subscriptionStatus = dto.subscriptionStatus;
    if (dto.trialEndsAt !== undefined) company.trialEndsAt = dto.trialEndsAt ? dto.trialEndsAt.slice(0, 10) : null;
    if (dto.gracePeriodDays !== undefined) company.gracePeriodDays = dto.gracePeriodDays;
    company.updatedBy = actorId;

    const saved = await this.companyRepo.save(company);

    await this.audit.record({
      companyId: tenantId,
      userId: actorId,
      entityName: 'companies',
      entityId: tenantId,
      action: 'UPDATE',
      before,
      after: {
        planName: saved.planName,
        billingCycle: saved.billingCycle,
        subscriptionStatus: saved.subscriptionStatus,
        trialEndsAt: saved.trialEndsAt,
        gracePeriodDays: saved.gracePeriodDays,
      },
    });

    return this.getTenantBilling(tenantId);
  }

  async createInvoice(tenantId: string, actorId: string, dto: CreatePlatformInvoiceDto): Promise<PlatformInvoiceDto> {
    const company = await this.companyRepo.findOneBy({ id: tenantId });
    if (!company) {
      throw new NotFoundException('Tenant not found');
    }

    const amountDec = new Decimal(dto.amount);
    const taxDec = new Decimal(dto.taxAmount || '0.00');
    const totalDec = amountDec.plus(taxDec);

    const now = new Date();
    const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const count = await this.invoiceRepo.count();
    const invoiceNumber = `INV-PLT-${yyyymm}-${String(count + 1).padStart(4, '0')}`;

    const invoice = this.invoiceRepo.create({
      companyId: tenantId,
      invoiceNumber,
      amount: money(amountDec),
      taxAmount: money(taxDec),
      totalAmount: money(totalDec),
      status: 'pending',
      planName: dto.planName,
      billingCycle: dto.billingCycle || 'monthly',
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      dueDate: dto.dueDate.slice(0, 10),
      notes: dto.notes || null,
    });

    const saved = await this.invoiceRepo.save(invoice);

    await this.audit.record({
      companyId: tenantId,
      userId: actorId,
      entityName: 'platform_invoices',
      entityId: saved.id,
      action: 'CREATE',
      after: {
        invoiceNumber: saved.invoiceNumber,
        amount: saved.amount,
        taxAmount: saved.taxAmount,
        totalAmount: saved.totalAmount,
        dueDate: saved.dueDate,
      },
    });

    return this.toInvoiceDto(saved);
  }

  async recordPayment(invoiceId: string, actorId: string, dto: RecordPlatformPaymentDto): Promise<PlatformInvoiceDto> {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId });
    if (!invoice) {
      throw new NotFoundException('Platform invoice not found');
    }
    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already marked as paid');
    }

    const beforeInvoice = {
      status: invoice.status,
      paidAt: invoice.paidAt,
      paymentMethod: invoice.paymentMethod,
      paymentRef: invoice.paymentRef,
    };

    invoice.status = 'paid';
    invoice.paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    invoice.paymentMethod = dto.paymentMethod;
    invoice.paymentRef = dto.paymentRef;
    if (dto.notes) {
      invoice.notes = invoice.notes ? `${invoice.notes}\n${dto.notes}` : dto.notes;
    }

    const savedInvoice = await this.invoiceRepo.save(invoice);

    await this.audit.record({
      companyId: invoice.companyId,
      userId: actorId,
      entityName: 'platform_invoices',
      entityId: invoice.id,
      action: 'UPDATE',
      before: beforeInvoice,
      after: {
        status: savedInvoice.status,
        paidAt: savedInvoice.paidAt?.toISOString(),
        paymentMethod: savedInvoice.paymentMethod,
        paymentRef: savedInvoice.paymentRef,
      },
    });

    // Tenant activation on payment
    const company = await this.companyRepo.findOneBy({ id: invoice.companyId });
    if (company) {
      const beforeCompany = {
        status: company.status,
        subscriptionStatus: company.subscriptionStatus,
      };
      let changed = false;

      if (company.subscriptionStatus !== 'active') {
        company.subscriptionStatus = 'active';
        changed = true;
      }
      if (company.status === 'suspended') {
        company.status = 'active';
        changed = true;
      }

      if (changed) {
        company.updatedBy = actorId;
        await this.companyRepo.save(company);
        await this.audit.record({
          companyId: company.id,
          userId: actorId,
          entityName: 'companies',
          entityId: company.id,
          action: 'UPDATE',
          before: beforeCompany,
          after: {
            status: company.status,
            subscriptionStatus: company.subscriptionStatus,
          },
        });
      }
    }

    return this.toInvoiceDto(savedInvoice);
  }

  async checkExpiryAndSuspension(actorId: string = 'system'): Promise<ExpiryCheckResultDto> {
    const today = new Date();
    const todayIsoDate = today.toISOString().slice(0, 10);

    const companies = await this.companyRepo.find();
    const result: ExpiryCheckResultDto = {
      checkedTenants: companies.length,
      suspendedTrials: [],
      overdueInvoices: [],
      suspendedForOverdue: [],
    };

    // 1. Check trials
    for (const comp of companies) {
      if (comp.status === 'suspended') continue;

      if ((comp.status === 'trial' || comp.subscriptionStatus === 'trial') && comp.trialEndsAt) {
        const trialEndDate = new Date(comp.trialEndsAt);
        const graceDays = comp.gracePeriodDays ?? 7;
        const expiryThreshold = new Date(trialEndDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

        if (today > expiryThreshold) {
          const before = { status: comp.status, subscriptionStatus: comp.subscriptionStatus };
          comp.status = 'suspended';
          comp.subscriptionStatus = 'past_due';
          comp.updatedBy = actorId;
          await this.companyRepo.save(comp);

          await this.audit.record({
            companyId: comp.id,
            userId: actorId,
            entityName: 'companies',
            entityId: comp.id,
            action: 'UPDATE',
            before,
            after: {
              status: comp.status,
              subscriptionStatus: comp.subscriptionStatus,
              reason: 'Automatic suspension: trial period expired beyond grace period',
            },
          });

          result.suspendedTrials.push({
            tenantId: comp.id,
            name: comp.name,
            trialEndsAt: comp.trialEndsAt,
          });
        }
      }
    }

    // 2. Check overdue invoices
    const pendingInvoices = await this.invoiceRepo.find({
      where: { status: 'pending', dueDate: LessThan(todayIsoDate) },
    });

    for (const inv of pendingInvoices) {
      inv.status = 'overdue';
      await this.invoiceRepo.save(inv);

      result.overdueInvoices.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        tenantId: inv.companyId,
      });

      // Check if past grace period
      const comp = await this.companyRepo.findOneBy({ id: inv.companyId });
      if (comp && comp.status !== 'suspended') {
        const due = new Date(inv.dueDate);
        const graceDays = comp.gracePeriodDays ?? 7;
        const cutoff = new Date(due.getTime() + graceDays * 24 * 60 * 60 * 1000);

        if (today > cutoff) {
          const before = { status: comp.status, subscriptionStatus: comp.subscriptionStatus };
          comp.status = 'suspended';
          comp.subscriptionStatus = 'past_due';
          comp.updatedBy = actorId;
          await this.companyRepo.save(comp);

          await this.audit.record({
            companyId: comp.id,
            userId: actorId,
            entityName: 'companies',
            entityId: comp.id,
            action: 'UPDATE',
            before,
            after: {
              status: comp.status,
              subscriptionStatus: comp.subscriptionStatus,
              reason: `Automatic suspension: invoice ${inv.invoiceNumber} overdue beyond grace period`,
            },
          });

          result.suspendedForOverdue.push({
            tenantId: comp.id,
            name: comp.name,
            invoiceNumber: inv.invoiceNumber,
          });
        }
      }
    }

    return result;
  }

  private toInvoiceDto(inv: PlatformInvoice): PlatformInvoiceDto {
    return {
      id: inv.id,
      companyId: inv.companyId,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      taxAmount: inv.taxAmount,
      totalAmount: inv.totalAmount,
      status: inv.status,
      planName: inv.planName,
      billingCycle: inv.billingCycle,
      periodStart: inv.periodStart.toISOString(),
      periodEnd: inv.periodEnd.toISOString(),
      dueDate: inv.dueDate,
      paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
      paymentMethod: inv.paymentMethod,
      paymentRef: inv.paymentRef,
      notes: inv.notes,
      createdAt: inv.createdAt.toISOString(),
    };
  }
}
