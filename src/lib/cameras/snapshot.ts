/**
 * The camera image to show, or null for «sin imagen».
 *
 * DGT keeps some cameras in its feed whose snapshot answers 404 text/html (34
 * of 1,972 on 2026-10-21): shown as an image they were a broken <img> on a
 * templated page. The daily camera run counts the days a snapshot wasn't an
 * image (Camera.snapshotFailDays, services/collector/tasks/camera/snapshots.ts);
 * from the first one the page shows its «sin imagen» state, and the snapshot
 * isn't offered as og:image or VideoObject either.
 */
export function cameraImage(cam: { thumbnailUrl: string | null; snapshotFailDays?: number | null }): string | null {
  return cam.thumbnailUrl && !cam.snapshotFailDays ? cam.thumbnailUrl : null;
}
