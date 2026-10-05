import { API_URL_ERROR, apiUrlSchema, credentialsFormSchema } from './credentials.schema';

const valid = {
  idInstance: ' 4100000000 ',
  apiTokenInstance: ' fake-token-for-tests-only ',
  apiUrl: 'https://4100.api.green-api.com/',
};

const fieldErrors = (input: Record<string, string>) =>
  Object.fromEntries(
    (credentialsFormSchema.safeParse(input).error?.issues ?? []).map((issue) => [
      issue.path.join('.'),
      issue.message,
    ]),
  );

describe('credentialsFormSchema', () => {
  it('trims the fields and normalizes apiUrl', () => {
    expect(credentialsFormSchema.parse(valid)).toEqual({
      idInstance: '4100000000',
      apiTokenInstance: 'fake-token-for-tests-only',
      apiUrl: 'https://4100.api.green-api.com',
    });
  });

  it('reports every empty field', () => {
    expect(fieldErrors({ idInstance: '', apiTokenInstance: ' ', apiUrl: '' })).toEqual({
      idInstance: 'Введите idInstance',
      apiTokenInstance: 'Введите apiTokenInstance',
      apiUrl: 'Введите apiUrl',
    });
  });

  it('accepts only digits in idInstance', () => {
    expect(fieldErrors({ ...valid, idInstance: '41 0000 0000' })).toEqual({
      idInstance: 'idInstance состоит только из цифр',
    });
  });

  it.each(['abc def', '..', '../x', 'a/b', 'a?b'])(
    'rejects %o as a token: it is put into the request path',
    (apiTokenInstance) => {
      expect(fieldErrors({ ...valid, apiTokenInstance })).toEqual({
        apiTokenInstance: 'apiTokenInstance — латинские буквы, цифры, «-» и «_», без пробелов',
      });
    },
  );
});

describe('apiUrlSchema', () => {
  it.each([
    ['https://4100.api.green-api.com', 'https://4100.api.green-api.com'],
    ['https://api.green-api.com/', 'https://api.green-api.com'],
    ['https://7103.api.greenapi.com', 'https://7103.api.greenapi.com'],
    ['https://3100.api.green-api.com/v3', 'https://3100.api.green-api.com/v3'],
  ])('accepts %s', (input, expected) => {
    expect(apiUrlSchema.parse(input)).toBe(expected);
  });

  it.each([
    'http://4100.api.green-api.com',
    'https://evil.example.com',
    'https://green-api.com.evil.io',
    'https://notgreen-api.com',
    'https://user:pass@api.green-api.com',
    'https://green-api.com',
    'https://api.green-api.com:8443',
    'https://api.green-api.com/?token=1',
    'https://api.green-api.com/#x',
    '4100.api.green-api.com',
    'javascript:alert(1)',
  ])('rejects %s so the token cannot leak to another host', (input) => {
    expect(apiUrlSchema.safeParse(input).error?.issues[0]?.message).toBe(API_URL_ERROR);
  });
});
