import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { CreateVoucherDto, ReverseVoucherDto, VoucherQueryDto } from '@brics/shared';
import type { Paginated } from '../common/interceptors/response-envelope.interceptor';
import { Voucher } from './entities/voucher.entity';
import { VoucherLine } from './entities/voucher-line.entity';
import { VoucherType } from './entities/voucher-type.entity';
import { PostingService, type PostedVoucher } from './posting.service';

/** A voucher with its lines, as the API returns it. */
export interface VoucherDetail {
  voucher: Voucher;
  lines: VoucherLine[];
  voucherTypeCode: string;
}

/**
 * Manual vouchers (ACC-03) — receipt, payment, contra and journal.
 *
 * Thin on purpose: the rules that matter live in `PostingService`, so a manual
 * voucher and one posted later by a sales invoice go through exactly the same
 * checks.
 */
@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher) private voucherRepo: Repository<Voucher>,
    @InjectRepository(VoucherLine) private lineRepo: Repository<VoucherLine>,
    @InjectRepository(VoucherType) private voucherTypeRepo: Repository<VoucherType>,
    private posting: PostingService,
    private dataSource: DataSource,
  ) {}

  async create(companyId: string, userId: string, dto: CreateVoucherDto): Promise<PostedVoucher> {
    // One transaction: a voucher without its lines, or lines without a number,
    // would be a journal that does not balance.
    return this.dataSource.transaction((manager) =>
      this.posting.post(manager, {
        companyId,
        userId,
        voucherTypeCode: dto.voucherType,
        voucherDate: dto.voucherDate,
        narration: dto.narration ?? null,
        siteId: dto.siteId ?? null,
        lines: dto.lines.map((line) => ({
          ledgerId: line.ledgerId,
          debit: line.debit,
          credit: line.credit,
          partyId: line.partyId ?? null,
          siteId: line.siteId ?? null,
          narration: line.narration ?? null,
        })),
      }),
    );
  }

  async reverse(companyId: string, userId: string, voucherId: string, dto: ReverseVoucherDto): Promise<PostedVoucher> {
    return this.dataSource.transaction((manager) =>
      this.posting.reverse(manager, companyId, userId, voucherId, {
        voucherDate: dto.voucherDate,
        narration: dto.narration ?? undefined,
      }),
    );
  }

  async findOne(companyId: string, voucherId: string): Promise<VoucherDetail> {
    const voucher = await this.voucherRepo.findOne({ where: { id: voucherId, companyId } });
    if (!voucher) throw new NotFoundException('Voucher not found');

    const [lines, voucherType] = await Promise.all([
      this.lineRepo.find({ where: { voucherId: voucher.id }, order: { lineOrder: 'ASC' } }),
      this.voucherTypeRepo.findOne({ where: { id: voucher.voucherTypeId } }),
    ]);

    return { voucher, lines, voucherTypeCode: voucherType?.code ?? 'unknown' };
  }

  /** The Day Book's data source (ACC-05), newest first. */
  async find(companyId: string, query: VoucherQueryDto): Promise<Paginated<Voucher>> {
    const qb = this.voucherRepo
      .createQueryBuilder('v')
      .where('v.company_id = :companyId', { companyId })
      .orderBy('v.voucher_date', 'DESC')
      .addOrderBy('v.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.from) qb.andWhere('v.voucher_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('v.voucher_date <= :to', { to: query.to });
    if (query.status) qb.andWhere('v.status = :status', { status: query.status });

    if (query.voucherType) {
      qb.andWhere(
        'v.voucher_type_id IN (SELECT id FROM voucher_types WHERE company_id = :companyId AND code = :voucherType)',
        { companyId, voucherType: query.voucherType },
      );
    }
    if (query.ledgerId) {
      qb.andWhere('EXISTS (SELECT 1 FROM voucher_lines vl WHERE vl.voucher_id = v.id AND vl.ledger_id = :ledgerId)', {
        ledgerId: query.ledgerId,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }
}
