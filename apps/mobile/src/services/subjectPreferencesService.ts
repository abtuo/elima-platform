import {revisionDbClient as mainDbClient} from './revisionDbClient';
import {createSubjectPreferencesService} from '@elima/revision-core';
export const {getSubjectPreferences,saveSubjectPreferences}=createSubjectPreferencesService({mainDbClient});
