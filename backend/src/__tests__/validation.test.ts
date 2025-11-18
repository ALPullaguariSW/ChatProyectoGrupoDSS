import { validateNickname, validateEmail, validatePassword } from '../utils/validation';

describe('Backend Validation Utils', () => {
  describe('validateNickname', () => {
    it('should accept valid nickname', () => {
      const result = validateNickname('john_doe123');
      expect(result.valid).toBe(true);
    });

    it('should reject nickname with SQL injection', () => {
      const result = validateNickname("admin'; DROP TABLE users;--");
      expect(result.valid).toBe(false);
    });

    it('should reject too short nickname', () => {
      const result = validateNickname('ab');
      expect(result.valid).toBe(false);
    });

    it('should reject too long nickname', () => {
      const result = validateNickname('a'.repeat(31));
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email', () => {
      const result = validateEmail('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.valid).toBe(false);
    });

    it('should accept technically valid email with special chars', () => {
      // Email regex básico acepta cualquier formato válido de email
      // La sanitización adicional ocurre en otros layers
      const result = validateEmail('<script>alert("xss")</script>@test.com');
      expect(result.valid).toBe(true); // Regex básico lo acepta
    });
  });

  describe('validatePassword', () => {
    it('should accept strong password', () => {
      const result = validatePassword('SecureP@ss123');
      expect(result.valid).toBe(true);
    });

    it('should reject weak password', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
    });

    it('should accept password with 3 of 4 requirements (without uppercase)', () => {
      const result = validatePassword('password123!');
      expect(result.valid).toBe(true); // lowercase + number + special = 3/4
    });

    it('should accept password with 3 of 4 requirements (without lowercase)', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.valid).toBe(true); // uppercase + number + special = 3/4
    });

    it('should accept password with 3 of 4 requirements (without number)', () => {
      const result = validatePassword('Password!@#$');
      expect(result.valid).toBe(true); // uppercase + lowercase + special = 3/4
    });

    it('should accept password with 3 of 4 requirements (without special char)', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(true); // uppercase + lowercase + number = 3/4
    });
  });
});
