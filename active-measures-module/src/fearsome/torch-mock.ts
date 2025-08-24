// Mock PyTorch-like API for simulation purposes
export class nn {
  static Sequential() {
    return {
      parameters: () => [],
      forward: (x: any) => x
    };
  }
}

export default {
  nn,
  tensor: (data: any) => data,
  load: (path: string) => ({ forward: (x: any) => x })
};
