import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessRuleException } from '../exceptions/business-rule.exception';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('maps business rules to 422 with their code', () => {
    const { status, body } = filter.toBody(new BusinessRuleException('STOCK_INSUFFICIENT', 'Not enough stock'));
    expect(status).toBe(422);
    expect(body.error).toMatchObject({ code: 'STOCK_INSUFFICIENT', message: 'Not enough stock' });
  });

  it('turns validation message lists into details', () => {
    const { status, body } = filter.toBody(new BadRequestException(['name should not be empty']));
    expect(status).toBe(400);
    expect(body.error).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      details: ['name should not be empty'],
    });
  });

  it('uses a default code per status', () => {
    expect(filter.toBody(new NotFoundException()).body.error.code).toBe('NOT_FOUND');
  });

  it('hides unexpected errors', () => {
    const { status, body } = filter.toBody(new Error('secret stack'));
    expect(status).toBe(500);
    expect(body.error.message).toBe('Something went wrong');
  });
});
