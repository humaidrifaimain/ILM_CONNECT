import { BadRequestException } from '@nestjs/common';

export function validateStudentHours(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 24 ||
      value.some(hour => !Number.isInteger(hour) || hour < 0 || hour > 23) ||
      new Set(value).size !== value.length) {
    throw new BadRequestException('Choose at least one available time window');
  }
  return [...value].sort((a, b) => a - b);
}
