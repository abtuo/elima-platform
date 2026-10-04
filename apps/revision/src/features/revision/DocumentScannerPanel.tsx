import {useNavigate} from 'react-router-dom';
import {RevisionDocumentScanner} from '@elima/revision-ui';
import {useAuth} from '@/features/auth/AuthProvider';
import * as documentsService from '@/services/revisionDocumentService';
import * as subjectsService from '@/services/subjectPreferencesService';
import {generateRealtimeQuiz} from '@/services/revisionDataService';
import {isNativeRuntime} from '@/services/nativeRuntime';
import {photoToFile,subscribeRecoveredPhoto,takeNativePhoto,takeRecoveredPhoto} from '@/services/nativeCamera';
function onRecoveredFile(receive:(file:File)=>void,onError:(message:string)=>void){
 const recover=()=>{const r=takeRecoveredPhoto();if(r?.error)onError(r.error);if(r?.photo)void photoToFile(r.photo).then(receive).catch(()=>onError('Photo récupérée illisible.'));};
 recover();return subscribeRecoveredPhoto(recover);
}
export function DocumentScannerPanel(){
 const {profile}=useAuth();const navigate=useNavigate();
 return <RevisionDocumentScanner profile={profile} documentsService={documentsService} subjectsService={subjectsService} generateRealtimeQuiz={generateRealtimeQuiz} onOpenQuiz={params=>navigate('/student/reviser/quiz?'+new URLSearchParams(params))} takePhoto={isNativeRuntime()?takeNativePhoto:undefined} onRecoveredFile={onRecoveredFile}/>;
}
