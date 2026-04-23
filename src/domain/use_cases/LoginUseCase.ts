import { SessionRepository } from '../repositories/SessionRepository';
import { LoginCredentials, LoginResult } from '../entities/Session';

export class LoginUseCase {
  constructor(private sessionRepository: SessionRepository) {}

  async execute(credentials: LoginCredentials): Promise<LoginResult> {
    return await this.sessionRepository.login(credentials);
  }
}