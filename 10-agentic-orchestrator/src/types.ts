export type Task<T = any> = {
  id: string;
  agentType: string;
  payload: T;
};

export type Handler<T = any> = (task: Task<T>) => Promise<void>;
