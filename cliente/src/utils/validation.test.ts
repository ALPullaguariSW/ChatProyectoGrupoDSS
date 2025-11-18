import { 
  validateUsername, 
  validateEmail, 
  validatePassword,
  validatePin,
  validateRoomName,
  validateRoomLimit,
  validateNickname
} from './validation';

describe('Validation Utils', () => {
  describe('validateUsername', () => {
    it('should validate correct username', () => {
      const result = validateUsername('john_doe123');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('john_doe123');
    });

    it('should reject username with special characters', () => {
      const result = validateUsername('john@doe!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('letras, números'));
    });

    it('should reject too short username', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('3 y 30'));
    });

    it('should reject too long username', () => {
      const result = validateUsername('a'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('3 y 30'));
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('válido'));
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('SecureP@ss123');
      expect(result.isValid).toBe(true);
    });

    it('should reject short password', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('8 caracteres'));
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('mayúscula'));
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('minúscula'));
    });

    it('should reject password without number', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('número'));
    });

    it('should reject password without special character', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('especial'));
    });
  });

  describe('validatePin', () => {
    it('should validate correct 6-digit PIN', () => {
      const result = validatePin('123456');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('123456');
    });

    it('should reject non-numeric PIN', () => {
      const result = validatePin('12ab56');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('6 dígitos'));
    });

    it('should reject short PIN', () => {
      const result = validatePin('12345');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('6 dígitos'));
    });
  });

  describe('validateRoomName', () => {
    it('should validate correct room name', () => {
      const result = validateRoomName('Study Room 101');
      expect(result.isValid).toBe(true);
    });

    it('should reject too short room name', () => {
      const result = validateRoomName('AB');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('3 y 50'));
    });

    it('should reject room name with SQL injection attempt', () => {
      const result = validateRoomName("Room'; DROP TABLE users;--");
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateRoomLimit', () => {
    it('should validate correct room limit', () => {
      const result = validateRoomLimit(10);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('10');
    });

    it('should reject too low limit', () => {
      const result = validateRoomLimit(1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('2 y 20'));
    });

    it('should reject too high limit', () => {
      const result = validateRoomLimit(21);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('2 y 20'));
    });
  });

  describe('validateNickname', () => {
    it('should validate correct nickname', () => {
      const result = validateNickname('CoolUser123');
      expect(result.isValid).toBe(true);
    });

    it('should reject nickname with special characters', () => {
      const result = validateNickname('User@#$');
      expect(result.isValid).toBe(false);
    });

    it('should reject too short nickname', () => {
      const result = validateNickname('AB');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('3 y 20'));
    });
  });
});
