import { describe, expect, test } from 'bun:test';
import { nextPlaceModerationStatus } from './place-moderation';

describe('place moderation lifecycle', () => {
  test('draft cannot publish directly', () => {
    expect(nextPlaceModerationStatus('DRAFT', 'APPROVE')).toBeNull();
  });

  test('draft must enter review before approval', () => {
    expect(nextPlaceModerationStatus('DRAFT', 'SUBMIT_FOR_REVIEW')).toBe('PENDING_REVIEW');
    expect(nextPlaceModerationStatus('PENDING_REVIEW', 'APPROVE')).toBe('ACTIVE');
  });

  test('review can return to draft for corrections', () => {
    expect(nextPlaceModerationStatus('PENDING_REVIEW', 'REJECT_TO_DRAFT')).toBe('DRAFT');
  });

  test('active place can be suspended', () => {
    expect(nextPlaceModerationStatus('ACTIVE', 'SUSPEND')).toBe('SUSPENDED');
  });

  test('suspended place requires explicit approval to reactivate', () => {
    expect(nextPlaceModerationStatus('SUSPENDED', 'APPROVE')).toBe('ACTIVE');
  });

  test('archived is terminal', () => {
    expect(nextPlaceModerationStatus('ARCHIVED', 'APPROVE')).toBeNull();
    expect(nextPlaceModerationStatus('ARCHIVED', 'SUBMIT_FOR_REVIEW')).toBeNull();
  });
});
