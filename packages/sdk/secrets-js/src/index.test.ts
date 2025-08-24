import axios from 'axios';
import { getSecret } from './index.js';

jest.mock('axios');

const mockedPost = axios.post as jest.Mock;

describe('getSecret', () => {
  it('requests secret token', async () => {
    mockedPost.mockResolvedValueOnce({ data: { token: 'abc' } });

    const result = await getSecret<{ token: string }>({ path: 'db/creds' });

    expect(mockedPost).toHaveBeenCalledWith('/secrets/get', { path: 'db/creds' });
    expect(result).toEqual({ token: 'abc' });
  });
});
