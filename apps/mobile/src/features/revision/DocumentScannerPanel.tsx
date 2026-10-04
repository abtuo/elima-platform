import {useNavigate} from 'react-router-dom';
import {RevisionDocumentScanner} from '@elima/revision-ui';
import {useAuth} from '@/features/auth/AuthProvider';
import * as documentsService from '@/services/revisionDocumentService';
import * as subjectsService from '@/services/subjectPreferencesService';
import {generateRealtimeQuiz} from '@/services/revisionDataService';
export function DocumentScannerPanel(){
 const {profile}=useAuth();const navigate=useNavigate();
 return <RevisionDocumentScanner profile={profile} documentsService={documentsService} subjectsService={subjectsService} generateRealtimeQuiz={generateRealtimeQuiz} onOpenQuiz={params=>navigate('/student/reviser/quiz?'+new URLSearchParams(params))}/>;
}
