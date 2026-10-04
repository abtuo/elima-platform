import {apiFetch} from './api/apiClient';
import {revisionDbClient as mainDbClient} from './revisionDbClient';
import {isDemoModeActive} from './env';
import {createLearningService} from '@elima/revision-core';
export const {getLearningCatalog,getLearningDiscovery,suggestLearningContent,getLearningPath,getLearningContent,validateLearningAnswer,getLearningHint,getLearningSolution,getSignedExamPdf,sessionKey,readLearningSession,learningSessionScore,createLearningSession,saveLearningSession,autosaveLearningAnswer,submitLearningSession}=createLearningService({apiFetch,mainDbClient,isDemoModeActive});
