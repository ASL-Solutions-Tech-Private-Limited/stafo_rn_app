import {errorCodes, isErrorWithCode, keepLocalCopy, pick, types} from '@react-native-documents/picker';
import type {UploadFile} from '../../api/endpoints/tasks';
import {toast} from '../../components/ui';

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv',
};

/** Always a name with an extension: the old app sent bare names, and those files can't be opened. */
export function uploadName(name: string | null | undefined, mime: string | null | undefined, index: number) {
  const base = (name ?? '').trim() || `file-${index + 1}`;
  if (/\.[a-z0-9]{2,5}$/i.test(base)) {
    return base;
  }
  const ext =
    (mime && EXT[mime]) ||
    mime
      ?.split('/')[1]
      ?.replace(/[^a-z0-9]/gi, '')
      .slice(0, 5) ||
    'bin';
  return `${base.replace(/\.+$/, '')}.${ext}`;
}

/** Lets them pick one or more files, copied into the cache so uploads read real files. */
export async function pickFiles(): Promise<UploadFile[]> {
  try {
    const picked = await pick({type: [types.allFiles], allowMultiSelection: true});
    const named = picked.map((f, i) => ({...f, uploadName: uploadName(f.name, f.type, i)}));
    const copies = await keepLocalCopy({
      files: named.map(f => ({uri: f.uri, fileName: f.uploadName})) as [{uri: string; fileName: string}],
      destination: 'cachesDirectory',
    });
    const out: UploadFile[] = [];
    copies.forEach((c, i) => {
      if (c.status === 'success') {
        out.push({
          uri: c.localUri,
          name: named[i].uploadName,
          type: named[i].type ?? 'application/octet-stream',
        });
      }
    });
    if (out.length < picked.length) {
      toast.error('Some files couldn’t be read and were skipped.');
    }
    return out;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return [];
    }
    toast.error('Couldn’t open the file picker.');
    return [];
  }
}
