/**
 * Central Reset Demo Data action (Spec §17.4). Restores every mutable
 * prototype-session repository to the initial fictional dataset. Only
 * in-memory demo state is touched — nothing real is stored anywhere.
 */
import { examinationRepository } from '@/mocks/repositories/examinationRepository'
import { evidenceRepository } from '@/mocks/repositories/evidenceRepository'
import { findingRepository } from '@/mocks/repositories/findingRepository'
import { libraryRepository } from '@/mocks/repositories/libraryRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { planRepository } from '@/mocks/repositories/planRepository'
import { prudentialRepository } from '@/mocks/repositories/prudentialRepository'
import { regulatoryRepository } from '@/mocks/repositories/regulatoryRepository'
import { remediationRepository } from '@/mocks/repositories/remediationRepository'
import { returnsRepository } from '@/mocks/repositories/returnsRepository'
import { riskAssessmentRepository } from '@/mocks/repositories/riskAssessmentRepository'
import { surveillanceRepository } from '@/mocks/repositories/surveillanceRepository'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'

export function resetAllDemoData(): void {
  examinationRepository.reset()
  evidenceRepository.reset()
  findingRepository.reset()
  libraryRepository.reset()
  planRepository.reset()
  prudentialRepository.reset()
  regulatoryRepository.reset()
  remediationRepository.reset()
  returnsRepository.reset()
  riskAssessmentRepository.reset()
  surveillanceRepository.reset()
  workQueueRepository.reset()
  notificationRepository.reset()
}
