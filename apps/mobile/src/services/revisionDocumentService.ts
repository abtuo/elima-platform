import {apiFetch} from './api/apiClient';
import {revisionDbClient as mainDbClient} from './revisionDbClient';
import {createRevisionDocumentService} from '@elima/revision-core';
export const {MAX_REVISION_DOCUMENT_BYTES,prepareRevisionDocument,analyzeRevisionDocument,getRevisionDocuments,attachDocumentQuiz,deleteRevisionDocument,documentAnalysisMarkdown,saveDocumentAnalysisAsSheet,ensureDocumentAnalysisSheets}=createRevisionDocumentService({apiFetch,mainDbClient});
export type {DocumentAnalysis,RevisionDocument,PreparedRevisionDocument} from '@elima/revision-core';
