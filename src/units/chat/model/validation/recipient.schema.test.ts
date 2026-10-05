import { createRecipientSchema } from './recipient.schema';

const parse = (messenger: 'max' | 'telegram', input: string) =>
  createRecipientSchema(messenger).safeParse(input);

const errorOf = (messenger: 'max' | 'telegram', input: string) =>
  parse(messenger, input).error?.issues[0]?.message;

describe('createRecipientSchema', () => {
  describe('MAX', () => {
    it.each([
      ['+7 (999) 123-45-67', '79991234567'],
      ['8 999 123 45 67', '79991234567'],
      ['+375 29 123-45-67', '375291234567'],
    ])('accepts %s', (input, phone) => {
      expect(parse('max', input).data).toEqual({ kind: 'phone', phone });
    });

    it('requires a value', () => {
      expect(errorOf('max', '   ')).toBe('Введите номер телефона');
    });

    it.each(['+1 202 555 0100', '+7 999 123', '+380 50 123 4567'])(
      'rejects %s — CheckAccount in MAX accepts only RU and BY numbers',
      (input) => {
        expect(errorOf('max', input)).toBe('MAX: только номера России (+7) и Беларуси (+375)');
      },
    );

    it('rejects a username — MAX has no usernames in CheckAccount', () => {
      expect(errorOf('max', '@durov')).toBe('Введите номер телефона');
    });
  });

  describe('Telegram', () => {
    it.each([
      ['+1 202 555 0100', { kind: 'phone', phone: '12025550100' }],
      ['8 999 123 45 67', { kind: 'phone', phone: '79991234567' }],
      ['@durov', { kind: 'username', username: '@durov' }],
      ['durov_bot', { kind: 'username', username: '@durov_bot' }],
    ])('accepts %s', (input, expected) => {
      expect(parse('telegram', input).data).toEqual(expected);
    });

    it.each(['@ab', '12345', '@1abcde', 'хабр'])('rejects %s', (input) => {
      expect(errorOf('telegram', input)).toBe(
        'Введите номер в международном формате или @username',
      );
    });

    it('requires a value', () => {
      expect(errorOf('telegram', '')).toBe('Введите номер телефона или @username');
    });
  });
});
