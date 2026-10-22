import { validateStudentHours } from './student-hours';

describe('Student available hours', () => {
  it.each([[], null, {}, [10, 10], ['10'], [10.5], [-1], [24]])('rejects invalid preferences %p', value => {
    expect(() => validateStudentHours(value)).toThrow('Choose at least one');
  });
  it('normalizes valid hours without changing the input', () => {
    const hours = [14, 10, 11];
    expect(validateStudentHours(hours)).toEqual([10, 11, 14]);
    expect(hours).toEqual([14, 10, 11]);
  });
});
