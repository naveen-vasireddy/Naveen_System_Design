import { OrchestratorService } from '../src/orchestrator';

describe('Orchestrator Service', () => {
  let orchestrator: OrchestratorService;
  const nodes = ['Worker-A', 'Worker-B', 'Worker-C'];

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.useFakeTimers();
    orchestrator = new OrchestratorService(nodes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  test('Consistent hashing routes same agentType to the same node', () => {
    const task1 = { id: '1', agentType: 'RESEARCH_AGENT', payload: {}, retryCount: 0, maxRetries: 2 };
    const task2 = { id: '2', agentType: 'RESEARCH_AGENT', payload: {}, retryCount: 0, maxRetries: 2 };
    // @ts-ignore - Accessing private ring for testing purposes
    const targetNode1 = orchestrator.ring.getNode(task1.agentType);
    // @ts-ignore
    const targetNode2 = orchestrator.ring.getNode(task2.agentType);

    expect(targetNode1).toBe(targetNode2);
    expect(nodes).toContain(targetNode1);
  });

  test('Tasks exceeding maxRetries are routed to the DLQ', () => {
    const failingTask = {
      id: 'task-dlq',
      agentType: 'FAIL_AGENT',
      payload: {},
      retryCount: 2,
      maxRetries: 2,
    } as any;

    // @ts-ignore - testing private method
    orchestrator.handleFailure('Worker-A', failingTask);

    expect(orchestrator.dlq.length).toBe(1);
    // @ts-ignore
    expect(orchestrator.dlq[0].id).toBe('task-dlq');
  });

  test('Backpressure queues tasks when MAX_CONCURRENT_TASKS is reached', () => {
    // Force all tasks to the same node
    // @ts-ignore
    jest.spyOn(orchestrator.ring, 'getNode').mockReturnValue('Worker-A');

    orchestrator.submitTask({ id: 't1', agentType: 'T', payload: {}, retryCount: 0, maxRetries: 1 } as any);
    orchestrator.submitTask({ id: 't2', agentType: 'T', payload: {}, retryCount: 0, maxRetries: 1 } as any);
    orchestrator.submitTask({ id: 't3', agentType: 'T', payload: {}, retryCount: 0, maxRetries: 1 } as any);

    // @ts-ignore
    const inFlight = orchestrator.inFlightTasks.get('Worker-A');
    // @ts-ignore
    const queue = orchestrator.agentQueues.get('Worker-A');

    expect(inFlight).toBe(2);
    expect(queue?.length).toBe(1);
    // @ts-ignore
    expect(queue![0].id).toBe('t3');
  });
});
