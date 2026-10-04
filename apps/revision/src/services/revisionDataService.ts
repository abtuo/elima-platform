import {apiFetch} from './api/apiClient';
import {revisionDbClient} from './revisionDbClient';
import {isDemoModeActive} from './env';
import {subscriptionRequest} from './subscriptionService';
import {createRevisionDataService} from '@elima/revision-core';
export const {getStudentRevisionLevel,generateRealtimeQuiz,generateRealtimeSheet,getRevisionProgress,recordQuizCompletion,submitQuizFeedback,getQuizAttempts,getLearningAttempts,getAvailableQuizzes,pickQuiz,getCourseSheets,getQuizQuestions,getDailyHintUsage,consumeDailyHint,isDailyQuizCompleted,markDailyQuizCompleted}=createRevisionDataService({apiFetch,revisionDbClient,isDemoModeActive,subscriptionRequest});
