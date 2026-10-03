import type {LocalImage} from '../../api/endpoints/employee';

export type FaceCaptureParams = {
  /** Shown in the top bar, e.g. "Reference selfie". */
  title: string;
  /** Whose face is being captured, e.g. the employee's full name. */
  personName: string;
  /** Under the title; defaults to the person's name. */
  subtitle?: string;
  /** Offer "choose from gallery" (reference selfies). Never for a punch. */
  allowGallery?: boolean;
};

export type FaceCaptureOutcome = {type: 'photo'; image: LocalImage} | {type: 'gallery'} | {type: 'cancel'};

let pending: ((outcome: FaceCaptureOutcome) => void) | null = null;

/**
 * Opens the face camera and resolves once it has closed (after its exit
 * transition), so the caller can safely present a sheet next.
 */
export function captureFace(
  navigate: (screen: 'FaceCapture', params: FaceCaptureParams) => void,
  params: FaceCaptureParams,
): Promise<FaceCaptureOutcome> {
  settleFaceCapture({type: 'cancel'});
  return new Promise(resolve => {
    pending = resolve;
    navigate('FaceCapture', params);
  });
}

/** Called by the face camera when it unmounts. */
export function settleFaceCapture(outcome: FaceCaptureOutcome) {
  const resolve = pending;
  pending = null;
  resolve?.(outcome);
}
