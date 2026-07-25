import { describe, it, expect } from 'vitest';
import { workDaysToArray, workDaysToCsv, serializeBarber, servicesLabelOf } from '@/lib/serializers';

describe('workDaysToArray', () => {
  it('CSV → آرایه‌ی عدد', () => {
    expect(workDaysToArray('0,1,2,3,4,5,6')).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('خالی/undefined → آرایه‌ی خالی', () => {
    expect(workDaysToArray('')).toEqual([]);
    expect(workDaysToArray(null)).toEqual([]);
    expect(workDaysToArray(undefined)).toEqual([]);
  });
  it('فاصله‌ها و مقادیرِ غیرعددی نادیده گرفته می‌شوند', () => {
    expect(workDaysToArray(' 1 , 2 , x , 5 ')).toEqual([1, 2, 5]);
  });
});

describe('workDaysToCsv', () => {
  it('آرایه → CSV مرتب و بدونِ تکرار', () => {
    expect(workDaysToCsv([5, 1, 1, 3])).toBe('1,3,5');
  });
  it('ورودیِ غیرآرایه → رشته‌ی خالی', () => {
    expect(workDaysToCsv(null)).toBe('');
    expect(workDaysToCsv('1,2')).toBe('');
  });
  it('رفت‌وبرگشتِ array↔csv پایدار است', () => {
    expect(workDaysToArray(workDaysToCsv([6, 0, 3]))).toEqual([0, 3, 6]);
  });
});

describe('serializeBarber', () => {
  it('workDays را به آرایه تبدیل می‌کند', () => {
    const b = serializeBarber({ id: 'x', name: 'a', workDays: '0,2,4' });
    expect(b.workDays).toEqual([0, 2, 4]);
  });
  it('ورودیِ null را دست‌نخورده برمی‌گرداند', () => {
    expect(serializeBarber(null)).toBe(null);
  });
});

describe('servicesLabelOf', () => {
  it('اولویت با servicesLabel', () => {
    expect(servicesLabelOf({ servicesLabel: 'الف + ب' })).toBe('الف + ب');
  });
  it('در نبودِ servicesLabel از رابطه‌های service می‌سازد', () => {
    expect(servicesLabelOf({ service: { name: 'الف' }, service2: { name: 'ب' } })).toBe('الف + ب');
  });
  it('یک خدمت', () => {
    expect(servicesLabelOf({ service: { name: 'الف' } })).toBe('الف');
  });
  it('هیچ‌کدام → «نامشخص»', () => {
    expect(servicesLabelOf({})).toBe('نامشخص');
    expect(servicesLabelOf(null)).toBe('نامشخص');
  });
});
