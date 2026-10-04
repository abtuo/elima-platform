import {createWhatsAppAuthApi} from '@elima/auth';
import {apiFetch} from './api/apiClient';
export type {AccountRegistrationInput} from '@elima/auth';
export const {requestRegistrationCode,requestPasswordResetCode,checkVerificationCode,exchangePhoneControlForReset,confirmPasswordReset,registerElimaAccount}=createWhatsAppAuthApi(apiFetch);
