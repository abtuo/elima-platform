import {useCallback} from 'react';
import {RevisionAccountPanel} from '@elima/revision-ui';
import {useAuth} from '@/features/auth/AuthProvider';
import {subscriptionRequest} from '@/services/subscriptionService';
import {getSubjectPreferences,saveSubjectPreferences} from '@/services/subjectPreferencesService';
import {PageContainer} from '@/components/layout/PageContainer';
export function RevisionAccountPage(){const {profile}=useAuth();const load=useCallback(()=>getSubjectPreferences(profile.id),[profile.id]);return <PageContainer><RevisionAccountPanel loadSubscription={subscriptionRequest} loadSubjects={load} saveSubjects={saveSubjectPreferences}/></PageContainer>;}
