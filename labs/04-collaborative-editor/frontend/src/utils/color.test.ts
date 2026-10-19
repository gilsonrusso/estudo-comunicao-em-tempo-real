import { describe, it, expect } from 'vitest';
import { getContrastColor, hexToRgba } from './color.js';

describe('Color Utilities', () => {
  describe('getContrastColor', () => {
    it('should return white text for dark backgrounds', () => {
      expect(getContrastColor('#000000')).toBe('#ffffff');
      expect(getContrastColor('#1e293b')).toBe('#ffffff');
      expect(getContrastColor('#0f172a')).toBe('#ffffff');
      expect(getContrastColor('#098842')).toBe('#ffffff');
    });

    it('should return dark text for light/bright backgrounds', () => {
      expect(getContrastColor('#ffffff')).toBe('#0f172a');
      expect(getContrastColor('#fef08a')).toBe('#0f172a');
      expect(getContrastColor('#a7f3d0')).toBe('#0f172a');
    });

    it('should handle short 3-character hex codes', () => {
      expect(getContrastColor('#000')).toBe('#ffffff');
      expect(getContrastColor('#fff')).toBe('#0f172a');
    });

    it('should fallback to white when hex is invalid or missing hash', () => {
      expect(getContrastColor('000000')).toBe('#ffffff');
      expect(getContrastColor('ffffff')).toBe('#ffffff');
      expect(getContrastColor('')).toBe('#ffffff');
    });
  });

  describe('hexToRgba', () => {
    it('should convert 6-character hex to rgba correctly', () => {
      expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(hexToRgba('#00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
      expect(hexToRgba('#0000ff', 0.25)).toBe('rgba(0, 0, 255, 0.25)');
    });

    it('should convert 3-character hex to rgba correctly', () => {
      expect(hexToRgba('#f00', 0.8)).toBe('rgba(255, 0, 0, 0.8)');
      expect(hexToRgba('#fff', 0.1)).toBe('rgba(255, 255, 255, 0.1)');
    });

    it('should return default fallback rgba on invalid hex', () => {
      expect(hexToRgba('invalid', 0.5)).toBe('rgba(100, 116, 139, 0.5)');
      expect(hexToRgba('', 0.5)).toBe('rgba(100, 116, 139, 0.5)');
    });
  });
});
