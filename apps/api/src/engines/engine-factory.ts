import type {ProviderKeyRepository} from '@binary/db';
import type {
  AgentEngine as EngineKind,
  ApprovalMode,
  Provider,
} from '@binary/shared';

import {MissingProviderKeyError, ValidationError} from '../errors';
import type {KeyVault} from '../keys/key-vault';
import type {YourComputers} from '../runner/your-computers';
import type {AgentEngine} from './agent-engine';
import {ApiEngine} from './api-engine';
import type {LanguageModelFactory} from './language-models';
import {RunnerEngine} from './runner-engine';

interface EngineRequest {
  userId: string;
  provider: Provider;
  model: string;
}

/** What forAgent needs to know about an agent. */
interface EngineAgent {
  engine: EngineKind;
  provider: Provider | null;
  model: string | null;
  approvalMode: ApprovalMode;
}

/** How far a CLI engine may go, from the agent's approval mode. */
const CLI_PERMISSION: Record<ApprovalMode, 'plan' | 'read_only' | 'edit'> = {
  plan_only: 'plan',
  ask_first: 'read_only',
  auto_approve_reads: 'read_only',
  accept_edits: 'edit',
};

/**
 * Builds the right engine for a request (the Factory pattern).
 * It looks up the user's saved key, decrypts it, and hands back an engine
 * that is ready to answer. Callers never touch keys or SDKs themselves.
 */
export class EngineFactory {
  constructor(
    private readonly providerKeys: ProviderKeyRepository,
    private readonly keyVault: KeyVault,
    private readonly createModel: LanguageModelFactory,
    private readonly computers?: YourComputers,
  ) {}

  /**
   * The engine an agent thinks with: its model through the API, or Claude
   * Code / Codex on the user's computer. Throws a 400 for an API agent
   * without a model or key.
   */
  async forAgent(userId: string, agent: EngineAgent): Promise<AgentEngine> {
    if (agent.engine === 'api') {
      if (!agent.provider || !agent.model) {
        throw new ValidationError('Choose a model for this agent first.');
      }
      return this.create({
        userId,
        provider: agent.provider,
        model: agent.model,
      });
    }
    if (!this.computers) {
      throw new ValidationError(
        'This agent thinks on your computer, which this server cannot reach.',
      );
    }
    return new RunnerEngine(
      this.computers,
      userId,
      agent.engine,
      CLI_PERMISSION[agent.approvalMode],
    );
  }

  async create({userId, provider, model}: EngineRequest): Promise<AgentEngine> {
    const savedKey = await this.providerKeys.find(userId, provider);
    if (!savedKey) {
      throw new MissingProviderKeyError(provider);
    }

    const apiKey = this.keyVault.decrypt({
      ciphertext: savedKey.encryptedKey,
      iv: savedKey.iv,
    });
    return new ApiEngine(this.createModel(provider, model, apiKey));
  }
}
